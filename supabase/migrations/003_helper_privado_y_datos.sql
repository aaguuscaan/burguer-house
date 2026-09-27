-- =====================================================================
-- 003 · Helper de RLS fuera de la API + limpieza de datos
-- =====================================================================
-- Aplicada el 27/09/2026 desde el conector de Supabase.
--
-- * is_restaurant_staff pasa al schema "private" (no expuesto por la API),
--   como recomienda el linter de seguridad de Supabase.
-- * Se quitan dos ingredientes "quitables" sin sentido:
--   Brownie con Helado → Helado (ya se elige gusto obligatorio)
--   Combo House → Burger
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_restaurant_staff(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_users ru
    where ru.restaurant_id = p_restaurant_id
      and ru.user_id = auth.uid()
  );
$$;

revoke all on function private.is_restaurant_staff(uuid) from public, anon;
grant execute on function private.is_restaurant_staff(uuid) to authenticated;

alter policy staff_read_orders on public.orders
  using (private.is_restaurant_staff(restaurant_id));

alter policy staff_update_orders on public.orders
  using (private.is_restaurant_staff(restaurant_id))
  with check (private.is_restaurant_staff(restaurant_id));

alter policy staff_read_order_items on public.order_items
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and private.is_restaurant_staff(o.restaurant_id)
  ));

alter policy staff_read_order_item_options on public.order_item_options
  using (exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_options.order_item_id
      and private.is_restaurant_staff(o.restaurant_id)
  ));

alter policy staff_insert_products on public.products
  with check (private.is_restaurant_staff(restaurant_id));

alter policy staff_update_products on public.products
  using (private.is_restaurant_staff(restaurant_id))
  with check (private.is_restaurant_staff(restaurant_id));

alter policy staff_delete_products on public.products
  using (private.is_restaurant_staff(restaurant_id));

drop function public.is_restaurant_staff(uuid);

delete from public.product_ingredients pi
using public.products p
where pi.product_id = p.id
  and (
    (p.slug = 'brownie-helado' or p.name = 'Brownie con Helado') and pi.name = 'Helado'
    or (p.name = 'Combo House' and pi.name = 'Burger')
  );
