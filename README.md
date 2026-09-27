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
4. `npm run dev`

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
| `lib/database.types.ts`      | Tipos de las tablas                                   |

## Valores internos

- `orders.order_type`: `delivery` | `pickup`
- `orders.status`: `pending` | `confirmed` | `preparing` | `ready` | `delivered` | `cancelled`
- `orders.payment_method`: `cash` | `transfer` | `card`
- `order_item_options`: `option_name` = grupo (`Elegí tu helado`, `Sin`, `Observaciones`),
  `option_value` = elección (`Crema`, `Cebolla`, texto libre).
