-- =====================================================================
-- 002 · Endurecer RLS
-- =====================================================================
-- Problemas que corrige:
--
--   * anon_read_orders / authenticated_read_orders (using true):
--     cualquiera con la clave pública podía leer TODOS los pedidos con
--     nombre, teléfono y dirección de los clientes.
--   * "Public can insert/update/delete products": cualquiera podía
--     modificar o borrar el menú.
--   * Inserts directos en orders / order_items / order_item_options:
--     permitían crear pedidos con precios inventados salteando la función.
--
-- Después de esta migración:
--
--   * El público (anon) puede LEER el menú y CREAR pedidos únicamente a
--     través de create_burger_house_order (security definer).
--   * Solo usuarios autenticados que figuren en restaurant_users pueden
--     ver/actualizar pedidos y editar productos.
--
-- IMPORTANTE: el panel /admin actual usa la clave pública sin login, así
-- que deja de ver pedidos y de editar productos hasta que se agregue el
-- login con Supabase Auth (siguiente etapa). Es el comportamiento buscado.
-- RLS sigue activado en todas las tablas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: ¿el usuario actual es staff de este restaurante?
-- ---------------------------------------------------------------------
create or replace function public.is_restaurant_staff(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from restaurant_users ru
    where ru.restaurant_id = p_restaurant_id
      and ru.user_id = auth.uid()
  );
$$;

revoke all on function public.is_restaurant_staff(uuid) from public;
grant execute on function public.is_restaurant_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------
drop policy if exists anon_read_orders on public.orders;
drop policy if exists authenticated_read_orders on public.orders;
drop policy if exists anon_create_orders on public.orders;
drop policy if exists authenticated_create_orders on public.orders;

drop policy if exists staff_read_orders on public.orders;
create policy staff_read_orders
  on public.orders for select
  to authenticated
  using (public.is_restaurant_staff(restaurant_id));

drop policy if exists staff_update_orders on public.orders;
create policy staff_update_orders
  on public.orders for update
  to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- ---------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------
drop policy if exists public_create_order_items on public.order_items;

drop policy if exists staff_read_order_items on public.order_items;
create policy staff_read_order_items
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and public.is_restaurant_staff(o.restaurant_id)
    )
  );

-- ---------------------------------------------------------------------
-- order_item_options
-- ---------------------------------------------------------------------
drop policy if exists public_create_order_item_options on public.order_item_options;

drop policy if exists staff_read_order_item_options on public.order_item_options;
create policy staff_read_order_item_options
  on public.order_item_options for select
  to authenticated
  using (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_options.order_item_id
        and public.is_restaurant_staff(o.restaurant_id)
    )
  );

-- ---------------------------------------------------------------------
-- products (lectura pública, escritura solo staff)
-- ---------------------------------------------------------------------
drop policy if exists "Public can insert products" on public.products;
drop policy if exists "Public can update products" on public.products;
drop policy if exists "Public can delete products" on public.products;
drop policy if exists "Authenticated can insert products" on public.products;
drop policy if exists "Authenticated can update products" on public.products;
drop policy if exists "Authenticated can delete products" on public.products;

drop policy if exists staff_insert_products on public.products;
create policy staff_insert_products
  on public.products for insert
  to authenticated
  with check (public.is_restaurant_staff(restaurant_id));

drop policy if exists staff_update_products on public.products;
create policy staff_update_products
  on public.products for update
  to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

drop policy if exists staff_delete_products on public.products;
create policy staff_delete_products
  on public.products for delete
  to authenticated
  using (public.is_restaurant_staff(restaurant_id));

-- ---------------------------------------------------------------------
-- restaurant_users (cada usuario ve solo sus membresías)
-- ---------------------------------------------------------------------
drop policy if exists read_own_membership on public.restaurant_users;
create policy read_own_membership
  on public.restaurant_users for select
  to authenticated
  using (user_id = auth.uid());
