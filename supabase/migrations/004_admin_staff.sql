-- =====================================================================
-- 004 · Permisos del panel de administración
-- =====================================================================
-- * El staff (restaurant_users) puede administrar opciones, ítems de
--   opciones, ingredientes y categorías de SU restaurante.
-- * Realtime en orders (el panel se actualiza solo). Realtime respeta
--   RLS: solo el staff recibe los eventos.
-- * Bucket público "product-images" para fotos de productos. Lectura
--   pública por URL; subir/borrar solo staff, dentro de la carpeta
--   <restaurant_id>/...
-- =====================================================================

-- Helper: ¿el usuario es staff del restaurante dueño de este producto?
create or replace function private.is_product_staff(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.products p
    join public.restaurant_users ru on ru.restaurant_id = p.restaurant_id
    where p.id = p_product_id
      and ru.user_id = auth.uid()
  );
$$;

revoke all on function private.is_product_staff(uuid) from public, anon;
grant execute on function private.is_product_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- product_options
-- ---------------------------------------------------------------------
drop policy if exists staff_write_product_options on public.product_options;
create policy staff_write_product_options
  on public.product_options for all
  to authenticated
  using (private.is_product_staff(product_id))
  with check (private.is_product_staff(product_id));

-- ---------------------------------------------------------------------
-- product_option_items
-- ---------------------------------------------------------------------
drop policy if exists staff_write_product_option_items on public.product_option_items;
create policy staff_write_product_option_items
  on public.product_option_items for all
  to authenticated
  using (
    exists (
      select 1 from public.product_options g
      where g.id = product_option_items.option_group_id
        and private.is_product_staff(g.product_id)
    )
  )
  with check (
    exists (
      select 1 from public.product_options g
      where g.id = product_option_items.option_group_id
        and private.is_product_staff(g.product_id)
    )
  );

-- ---------------------------------------------------------------------
-- product_ingredients (el staff también ve los no disponibles)
-- ---------------------------------------------------------------------
drop policy if exists staff_write_product_ingredients on public.product_ingredients;
create policy staff_write_product_ingredients
  on public.product_ingredients for all
  to authenticated
  using (private.is_product_staff(product_id))
  with check (private.is_product_staff(product_id));

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
drop policy if exists staff_write_categories on public.categories;
create policy staff_write_categories
  on public.categories for all
  to authenticated
  using (private.is_restaurant_staff(restaurant_id))
  with check (private.is_restaurant_staff(restaurant_id));

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Storage: fotos de productos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists staff_upload_product_images on storage.objects;
create policy staff_upload_product_images
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.restaurant_users ru
      where ru.user_id = auth.uid()
        and ru.restaurant_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists staff_update_product_images on storage.objects;
create policy staff_update_product_images
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.restaurant_users ru
      where ru.user_id = auth.uid()
        and ru.restaurant_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists staff_delete_product_images on storage.objects;
create policy staff_delete_product_images
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.restaurant_users ru
      where ru.user_id = auth.uid()
        and ru.restaurant_id::text = (storage.foldername(name))[1]
    )
  );

-- Borrar desde la API de Storage también requiere poder "ver" el objeto.
drop policy if exists staff_read_product_images on storage.objects;
create policy staff_read_product_images
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.restaurant_users ru
      where ru.user_id = auth.uid()
        and ru.restaurant_id::text = (storage.foldername(name))[1]
    )
  );
