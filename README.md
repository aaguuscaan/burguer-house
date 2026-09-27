# Burger House

Web de pedidos online: Menú → Producto → Personalización → Carrito → Checkout →
Pedido guardado en Supabase → Confirmación → WhatsApp.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase.

## Puesta en marcha

1. `npm install`
2. Crear `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   Solo la clave **anon**. La service role key nunca va en el front.
3. Aplicar las migraciones en el SQL Editor de Supabase, **en orden**:
   - `supabase/migrations/001_pedidos_seguros.sql`: función `create_burger_house_order`
     (calcula precios en la base, genera el número BH-XXXX, valida todo).
   - `supabase/migrations/002_rls_seguridad.sql`: cierra la lectura pública de
     pedidos y la edición pública de productos.
   - `supabase/migrations/003_helper_privado_y_datos.sql`: saca el helper de RLS
     de la API pública y limpia dos ingredientes.
   - `supabase/migrations/004_admin_staff.sql`: permisos del panel (opciones,
     ingredientes, categorías), Realtime en pedidos y bucket de fotos.
4. `npm run dev`

## Panel de administración (`/admin`)

- Login con Supabase Auth (email y contraseña).
- Solo entran usuarios cargados en `restaurant_users` para este restaurante:
  ```sql
  insert into restaurant_users (restaurant_id, user_id, role)
  select '926cd9b7-7fa2-4664-8cd8-c65e80ea1956', id, 'owner'
  from auth.users where email = 'tu@email.com';
  ```
- **Pedidos**: en vivo (Realtime) con aviso sonoro, detalle completo, cambio de
  estado (`pending → confirmed → preparing → ready → delivered`, o `cancelled`)
  y WhatsApp directo al cliente.
- **Productos**: disponibilidad con un toque, alta/edición, fotos (Storage),
  grupos de opciones, extras e ingredientes quitables.

## Estructura

| Carpeta / archivo            | Qué hace                                              |
| ---------------------------- | ----------------------------------------------------- |
| `app/page.tsx`               | Menú (categorías, búsqueda, productos desde Supabase) |
| `app/product/[id]/page.tsx`  | Producto + opciones, extras, ingredientes, notas      |
| `app/cart/page.tsx`          | Carrito                                               |
| `app/checkout/page.tsx`      | Checkout, confirmación y botón de WhatsApp            |
| `app/data/store.ts`          | Datos del local, delivery, etiquetas de pago/entrega  |
| `lib/cart.ts`                | Carrito (persistido en localStorage)                  |
| `lib/order.ts`               | Payload del pedido, errores, mensaje de WhatsApp      |
| `lib/supabase.ts`            | Cliente Supabase tipado                               |
| `lib/admin/*`                | Sesión, pedidos, productos y opciones del panel       |
| `app/admin/*`                | Panel de administración                               |
| `lib/database.types.ts`      | Tipos generados por Supabase                          |

## Valores internos

- `orders.order_type`: `delivery` | `pickup`
- `orders.status`: `pending` | `confirmed` | `preparing` | `ready` | `delivered` | `cancelled`
- `orders.payment_method`: `cash` | `transfer` | `card`
- `order_item_options`: `option_name` = grupo (`Elegí tu helado`, `Sin`, `Observaciones`),
  `option_value` = elección (`Crema`, `Cebolla`, texto libre).
