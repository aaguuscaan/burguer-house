-- =====================================================================
-- 001 · Creación de pedidos segura
-- =====================================================================
-- Qué cambia respecto de la versión anterior de create_burger_house_order:
--
--   * Los precios se calculan en la base (products + product_option_items).
--     El navegador ya no manda precios ni totales.
--   * El número de pedido (BH-XXXX) lo genera la base y se reintenta si
--     choca con la restricción UNIQUE (restaurant_id, order_number).
--   * Se validan nombre, teléfono, tipo de entrega, método de pago,
--     dirección, disponibilidad de productos y opciones obligatorias.
--   * order_item_options queda así:
--       option_name = "Elegí tu helado"   option_value = "Crema"
--       option_name = "Sin"               option_value = "Cebolla"
--       option_name = "Observaciones"     option_value = "Bien cocida"
--   * Devuelve { id, order_number, subtotal, delivery_fee, total, items }
--     con los precios y opciones tal como quedaron guardados.
--
-- Los errores se lanzan con códigos cortos (INVALID_PHONE, PRODUCT_UNAVAILABLE…)
-- que el front traduce a mensajes simples.
-- =====================================================================

-- Costo de envío configurable por restaurante (antes estaba solo en el front).
alter table public.restaurants
  add column if not exists delivery_fee numeric not null default 1500,
  add column if not exists delivery_free_from numeric;

update public.restaurants
set delivery_free_from = 25000
where slug = 'burger-house'
  and delivery_free_from is null;

-- Cambia el tipo de retorno (uuid → jsonb), por eso hay que eliminarla primero.
drop function if exists public.create_burger_house_order(jsonb, jsonb);

create function public.create_burger_house_order(p_order jsonb, p_items jsonb)
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
  v_address      text := nullif(btrim(coalesce(p_order->>'customer_address', '')), '');
  v_notes        text := left(nullif(btrim(coalesce(p_order->>'notes', '')), ''), 500);

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
  -- Datos del pedido
  -- -------------------------------------------------------------------
  select * into v_restaurant
  from restaurants
  where id = nullif(p_order->>'restaurant_id', '')::uuid;

  if not found then
    raise exception 'RESTAURANT_NOT_FOUND';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'INVALID_NAME';
  end if;

  if char_length(regexp_replace(v_phone, '\D', '', 'g')) not between 8 and 15 then
    raise exception 'INVALID_PHONE';
  end if;

  if v_order_type is null or v_order_type not in ('delivery', 'pickup') then
    raise exception 'INVALID_ORDER_TYPE';
  end if;

  if v_payment is null or v_payment not in ('cash', 'transfer', 'card') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if v_order_type = 'delivery' then
    if not coalesce(v_restaurant.delivery_enabled, false) then
      raise exception 'DELIVERY_DISABLED';
    end if;

    if v_address is null or char_length(v_address) < 5 then
      raise exception 'INVALID_ADDRESS';
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
  -- Validar productos y calcular precios (primera pasada, sin escribir)
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

    -- Cada opción elegida tiene que pertenecer a este producto y estar disponible.
    select count(*) into v_count
    from product_option_items i
    join product_options g on g.id = i.option_group_id
    where i.id = any(v_selected_ids)
      and g.product_id = v_product.id
      and coalesce(i.available, true);

    if v_count <> cardinality(v_selected_ids) then
      raise exception 'INVALID_OPTION';
    end if;

    -- Reglas por grupo: obligatorios y radio = una sola opción.
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

    -- Ingredientes quitados: tienen que ser de este producto.
    select count(*) into v_count
    from product_ingredients
    where id = any(v_removed_ids)
      and product_id = v_product.id;

    if v_count <> cardinality(v_removed_ids) then
      raise exception 'INVALID_INGREDIENT';
    end if;

    -- Precio y detalle de opciones.
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
  -- Crear el pedido con un número legible único
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
        subtotal, delivery_fee, discount, total, notes
      )
      values (
        v_restaurant.id, v_order_number, v_name, v_phone,
        v_address, v_order_type, v_payment, 'pending',
        v_subtotal, v_delivery_fee, 0, v_total, v_notes
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

  -- -------------------------------------------------------------------
  -- Ítems y opciones
  -- -------------------------------------------------------------------
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
