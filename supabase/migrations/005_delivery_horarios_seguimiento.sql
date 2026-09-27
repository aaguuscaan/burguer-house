-- =====================================================================
-- 005 · Zona de delivery, horarios, pausa, seguimiento y anti-spam
-- =====================================================================
-- * restaurants: ubicación del local (latitude/longitude), horario
--   semanal (schedule), pausa manual (accepting_orders) y zona horaria.
-- * orders: coordenadas y distancia de la entrega.
-- * create_burger_house_order ahora también valida:
--     - local pausado          → STORE_PAUSED
--     - fuera de horario       → STORE_CLOSED
--     - delivery sin ubicación → MISSING_LOCATION
--     - fuera del radio        → OUT_OF_RANGE
--     - demasiados pedidos     → TOO_MANY_ORDERS
-- * get_order_tracking(id): el cliente consulta SU pedido con el id
--   (uuid imposible de adivinar). Solo pedidos de los últimos 7 días.
-- * El staff puede editar la configuración de su restaurante.
--
-- schedule: [{ "day": 0-6 (0 = domingo), "open": "HH:MM", "close": "HH:MM" }]
-- Si close <= open, el turno termina al día siguiente (ej. 19:00 → 01:00).
-- Un schedule vacío significa "siempre abierto".
-- =====================================================================

alter table public.restaurants
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists schedule jsonb not null default '[]'::jsonb,
  add column if not exists accepting_orders boolean not null default true,
  add column if not exists timezone text not null default 'America/Argentina/Buenos_Aires';

alter table public.restaurants
  drop constraint if exists restaurants_delivery_radius_check,
  add constraint restaurants_delivery_radius_check
    check (delivery_radius_km is null or delivery_radius_km between 0 and 100),
  drop constraint if exists restaurants_delivery_fee_check,
  add constraint restaurants_delivery_fee_check check (delivery_fee >= 0),
  drop constraint if exists restaurants_schedule_check,
  add constraint restaurants_schedule_check check (jsonb_typeof(schedule) = 'array');

alter table public.orders
  add column if not exists delivery_lat double precision,
  add column if not exists delivery_lng double precision,
  add column if not exists delivery_distance_km numeric;

-- Valores iniciales de Burger House (editables desde /admin/settings).
-- La ubicación es aproximada (Pavón, Exaltación de la Cruz): ajustala en el panel.
update public.restaurants
set latitude = coalesce(latitude, -34.3700),
    longitude = coalesce(longitude, -59.0800),
    delivery_radius_km = 15,
    schedule = case
      when schedule = '[]'::jsonb then (
        select jsonb_agg(jsonb_build_object('day', d, 'open', '11:00', 'close', '01:00') order by d)
        from generate_series(0, 6) as d
      )
      else schedule
    end
where slug = 'burger-house';

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create schema if not exists private;

create or replace function private.distance_km(
  p_lat1 double precision, p_lng1 double precision,
  p_lat2 double precision, p_lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2))
      * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
  ));
$$;

create or replace function private.is_open(
  p_schedule jsonb,
  p_timezone text,
  p_at timestamptz default now()
)
returns boolean
language plpgsql
stable
as $$
declare
  v_local  timestamp := p_at at time zone coalesce(p_timezone, 'America/Argentina/Buenos_Aires');
  v_day    integer := extract(dow from v_local)::integer;
  v_prev   integer := (extract(dow from v_local)::integer + 6) % 7;
  v_time   time := v_local::time;
  v_range  jsonb;
  v_rday   integer;
  v_open   time;
  v_close  time;
begin
  if p_schedule is null
     or jsonb_typeof(p_schedule) <> 'array'
     or jsonb_array_length(p_schedule) = 0 then
    return true;
  end if;

  for v_range in select value from jsonb_array_elements(p_schedule)
  loop
    v_rday  := (v_range->>'day')::integer;
    v_open  := (v_range->>'open')::time;
    v_close := (v_range->>'close')::time;

    if v_close > v_open then
      if v_rday = v_day and v_time >= v_open and v_time < v_close then
        return true;
      end if;
    else
      -- Turno que cruza la medianoche.
      if v_rday = v_day and v_time >= v_open then
        return true;
      end if;

      if v_rday = v_prev and v_time < v_close then
        return true;
      end if;
    end if;
  end loop;

  return false;
end;
$$;

revoke all on function private.distance_km(double precision, double precision, double precision, double precision) from public, anon, authenticated;
revoke all on function private.is_open(jsonb, text, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Creación de pedidos (reemplaza la versión 001)
-- ---------------------------------------------------------------------
create or replace function public.create_burger_house_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant   public.restaurants%rowtype;
  v_product      public.products%rowtype;

  v_order_type   text := p_order->>'order_type';
  v_payment      text := p_order->>'payment_method';
  v_name         text := btrim(coalesce(p_order->>'customer_name', ''));
  v_phone        text := btrim(coalesce(p_order->>'customer_phone', ''));
  v_phone_digits text := regexp_replace(btrim(coalesce(p_order->>'customer_phone', '')), '\D', '', 'g');
  v_address      text := nullif(btrim(coalesce(p_order->>'customer_address', '')), '');
  v_notes        text := left(nullif(btrim(coalesce(p_order->>'notes', '')), ''), 500);
  v_lat          double precision;
  v_lng          double precision;
  v_distance     double precision;

  v_item         jsonb;
  v_line         jsonb;
  v_lines        jsonb := '[]'::jsonb;
  v_line_options jsonb;
  v_group        record;

  v_quantity     integer;
  v_selected_ids uuid[];
  v_removed_ids  uuid[];
  v_item_notes   text;
  v_count        integer;
  v_options_price numeric;
  v_unit_price   numeric;

  v_subtotal     numeric := 0;
  v_delivery_fee numeric := 0;
  v_total        numeric;

  v_order_id     uuid;
  v_order_number text;
  v_item_id      uuid;
  v_attempt      integer := 0;
begin
  -- -------------------------------------------------------------------
  -- Local
  -- -------------------------------------------------------------------
  select * into v_restaurant
  from restaurants
  where id = nullif(p_order->>'restaurant_id', '')::uuid;

  if not found then
    raise exception 'RESTAURANT_NOT_FOUND';
  end if;

  if not v_restaurant.accepting_orders then
    raise exception 'STORE_PAUSED';
  end if;

  if not private.is_open(v_restaurant.schedule, v_restaurant.timezone) then
    raise exception 'STORE_CLOSED';
  end if;

  -- -------------------------------------------------------------------
  -- Cliente
  -- -------------------------------------------------------------------
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'INVALID_NAME';
  end if;

  if char_length(v_phone_digits) not between 8 and 15 then
    raise exception 'INVALID_PHONE';
  end if;

  if v_order_type is null or v_order_type not in ('delivery', 'pickup') then
    raise exception 'INVALID_ORDER_TYPE';
  end if;

  if v_payment is null or v_payment not in ('cash', 'transfer', 'card') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  -- Anti-spam: máximo 3 pedidos por teléfono cada 10 minutos y 20 por
  -- minuto en todo el local.
  select count(*) into v_count
  from orders
  where restaurant_id = v_restaurant.id
    and created_at > now() - interval '10 minutes'
    and regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') = v_phone_digits;

  if v_count >= 3 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  select count(*) into v_count
  from orders
  where restaurant_id = v_restaurant.id
    and created_at > now() - interval '1 minute';

  if v_count >= 20 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  -- -------------------------------------------------------------------
  -- Entrega
  -- -------------------------------------------------------------------
  if v_order_type = 'delivery' then
    if not coalesce(v_restaurant.delivery_enabled, false) then
      raise exception 'DELIVERY_DISABLED';
    end if;

    if v_address is null or char_length(v_address) < 5 then
      raise exception 'INVALID_ADDRESS';
    end if;

    v_lat := (p_order->>'delivery_lat')::double precision;
    v_lng := (p_order->>'delivery_lng')::double precision;

    if v_lat is null or v_lng is null
       or v_lat not between -90 and 90
       or v_lng not between -180 and 180 then
      raise exception 'MISSING_LOCATION';
    end if;

    if v_restaurant.latitude is not null and v_restaurant.longitude is not null then
      v_distance := private.distance_km(
        v_restaurant.latitude, v_restaurant.longitude, v_lat, v_lng
      );

      if v_distance > coalesce(v_restaurant.delivery_radius_km, 5) then
        raise exception 'OUT_OF_RANGE';
      end if;
    end if;
  else
    v_address := null;
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'TOO_MANY_ITEMS';
  end if;

  -- -------------------------------------------------------------------
  -- Productos y precios (primera pasada, sin escribir)
  -- -------------------------------------------------------------------
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    select * into v_product
    from products
    where id = nullif(v_item->>'product_id', '')::uuid
      and restaurant_id = v_restaurant.id;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if not coalesce(v_product.available, true) then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    v_quantity := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity < 1 or v_quantity > 99 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select coalesce(array_agg(distinct value::uuid), '{}')
    into v_selected_ids
    from jsonb_array_elements_text(coalesce(v_item->'option_item_ids', '[]'::jsonb));

    select coalesce(array_agg(distinct value::uuid), '{}')
    into v_removed_ids
    from jsonb_array_elements_text(coalesce(v_item->'removed_ingredient_ids', '[]'::jsonb));

    v_item_notes := left(nullif(btrim(coalesce(v_item->>'notes', '')), ''), 300);

    select count(*) into v_count
    from product_option_items i
    join product_options g on g.id = i.option_group_id
    where i.id = any(v_selected_ids)
      and g.product_id = v_product.id
      and coalesce(i.available, true);

    if v_count <> cardinality(v_selected_ids) then
      raise exception 'INVALID_OPTION';
    end if;

    for v_group in
      select
        g.selection_type,
        coalesce(g.required, false) as required,
        (
          select count(*)
          from product_option_items i
          where i.option_group_id = g.id
            and i.id = any(v_selected_ids)
        ) as chosen
      from product_options g
      where g.product_id = v_product.id
    loop
      if v_group.required and v_group.chosen = 0 then
        raise exception 'MISSING_REQUIRED_OPTION';
      end if;

      if v_group.selection_type = 'radio' and v_group.chosen > 1 then
        raise exception 'INVALID_OPTION';
      end if;
    end loop;

    select count(*) into v_count
    from product_ingredients
    where id = any(v_removed_ids)
      and product_id = v_product.id;

    if v_count <> cardinality(v_removed_ids) then
      raise exception 'INVALID_INGREDIENT';
    end if;

    select
      coalesce(sum(coalesce(i.price, 0)), 0),
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'option_name', g.name,
            'option_value', i.name,
            'price', coalesce(i.price, 0)
          )
          order by g.sort_order, i.sort_order
        ),
        '[]'::jsonb
      )
    into v_options_price, v_line_options
    from product_option_items i
    join product_options g on g.id = i.option_group_id
    where i.id = any(v_selected_ids);

    v_line_options := v_line_options || coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('option_name', 'Sin', 'option_value', name, 'price', 0)
          order by sort_order
        )
        from product_ingredients
        where id = any(v_removed_ids)
      ),
      '[]'::jsonb
    );

    if v_item_notes is not null then
      v_line_options := v_line_options || jsonb_build_array(
        jsonb_build_object('option_name', 'Observaciones', 'option_value', v_item_notes, 'price', 0)
      );
    end if;

    v_unit_price := v_product.price + v_options_price;
    v_subtotal   := v_subtotal + v_unit_price * v_quantity;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'product_name', v_product.name,
        'quantity', v_quantity,
        'unit_price', v_unit_price,
        'total_price', v_unit_price * v_quantity,
        'options', v_line_options
      )
    );
  end loop;

  -- -------------------------------------------------------------------
  -- Envío y total
  -- -------------------------------------------------------------------
  if v_order_type = 'delivery' then
    v_delivery_fee := coalesce(v_restaurant.delivery_fee, 0);

    if v_restaurant.delivery_free_from is not null
       and v_subtotal >= v_restaurant.delivery_free_from then
      v_delivery_fee := 0;
    end if;
  end if;

  v_total := v_subtotal + v_delivery_fee;

  -- -------------------------------------------------------------------
  -- Pedido con número legible único
  -- -------------------------------------------------------------------
  loop
    v_attempt := v_attempt + 1;

    v_order_number := 'BH-' || (
      case
        when v_attempt <= 10 then floor(random() * 9000 + 1000)::integer
        else floor(random() * 900000 + 100000)::integer
      end
    )::text;

    begin
      insert into orders (
        restaurant_id, order_number, customer_name, customer_phone,
        customer_address, order_type, payment_method, status,
        subtotal, delivery_fee, discount, total, notes,
        delivery_lat, delivery_lng, delivery_distance_km
      )
      values (
        v_restaurant.id, v_order_number, v_name, v_phone,
        v_address, v_order_type, v_payment, 'pending',
        v_subtotal, v_delivery_fee, 0, v_total, v_notes,
        v_lat, v_lng, round(v_distance::numeric, 2)
      )
      returning id into v_order_id;

      exit;
    exception
      when unique_violation then
        if v_attempt >= 20 then
          raise exception 'ORDER_NUMBER_UNAVAILABLE';
        end if;
    end;
  end loop;

  for v_line in select value from jsonb_array_elements(v_lines)
  loop
    insert into order_items (
      order_id, product_id, product_name, quantity, unit_price, total_price
    )
    values (
      v_order_id,
      (v_line->>'product_id')::uuid,
      v_line->>'product_name',
      (v_line->>'quantity')::integer,
      (v_line->>'unit_price')::numeric,
      (v_line->>'total_price')::numeric
    )
    returning id into v_item_id;

    insert into order_item_options (order_item_id, option_name, option_value, price)
    select
      v_item_id,
      o->>'option_name',
      o->>'option_value',
      (o->>'price')::numeric
    from jsonb_array_elements(v_line->'options') as o;
  end loop;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'items', v_lines
  );
end;
$$;

revoke all on function public.create_burger_house_order(jsonb, jsonb) from public;
grant execute on function public.create_burger_house_order(jsonb, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Seguimiento del pedido (cliente)
-- ---------------------------------------------------------------------
create or replace function public.get_order_tracking(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'payment_method', o.payment_method,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'customer_address', o.customer_address,
    'notes', o.notes,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'product_name', oi.product_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'option_name', op.option_name,
                'option_value', op.option_value,
                'price', coalesce(op.price, 0)
              )
              order by
                case op.option_name
                  when 'Sin' then 1
                  when 'Observaciones' then 2
                  else 0
                end,
                op.created_at
            )
            from order_item_options op
            where op.order_item_id = oi.id
          ), '[]'::jsonb)
        )
        order by oi.created_at
      )
      from order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from orders o
  where o.id = p_order_id
    and o.created_at > now() - interval '7 days';
$$;

revoke all on function public.get_order_tracking(uuid) from public;
grant execute on function public.get_order_tracking(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- El staff edita la configuración de su restaurante
-- ---------------------------------------------------------------------
drop policy if exists staff_update_restaurant on public.restaurants;
create policy staff_update_restaurant
  on public.restaurants for update
  to authenticated
  using (private.is_restaurant_staff(id))
  with check (private.is_restaurant_staff(id));
