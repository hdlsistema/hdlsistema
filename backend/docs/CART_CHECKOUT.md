# Carrito, orden y checkout base

Documento operativo de Fase 8C para Hacienda de Letras OS.

## Estado

Fase 8C aprobada en producción.

- Commit funcional: `1dab2b1 feat: connect customer cart and checkout base`.
- Migración aplicada: `029_customer_cart_checkout.sql`.
- Runner real: `backend/scripts/phase8c-real-check.mjs`.
- Railway: `/api/health` HTTP 200 con Supabase saludable.
- Netlify: rutas `/app/tienda`, `/app/carrito`, `/app/checkout` y `/app/perfil` HTTP 200.
- Bundle productivo validado: `index-VU0eV1pM.js`.

## Alcance

Fase 8C conecta:

- carrito persistente.
- items reales de carrito.
- precios reales derivados en backend.
- descuentos válidos cuando el código cumple reglas.
- totales calculados en backend.
- orden customer real.
- historial de órdenes propias.
- checkout base.
- estado `pending_payment`.

No conecta pasarela productiva, no cobra dinero, no solicita tarjeta, no guarda datos de pago y no simula pago aprobado.

## Modelo

Tablas usadas:

- `carts`
- `cart_items`
- `orders`
- `order_items`
- `payments`
- `promotions`
- `promotion_redemptions`
- `customers`
- `audit_logs`
- `wines`
- `events`
- `event_ticket_types`

Campos agregados por Fase 8C:

- `carts.cart_status`
- `carts.discount_code`
- `carts.metadata`
- `cart_items.name_snapshot`
- `cart_items.sku_snapshot`
- `cart_items.currency`

Un customer tiene un carrito activo. Al crear orden, el carrito pasa a `converted` y se crea un nuevo carrito activo cuando el customer vuelve a consultar carrito.

## RPC

- `get_active_customer_cart_id`
- `resolve_customer_cart_item`
- `calculate_customer_cart_totals`
- `get_customer_cart`
- `add_customer_cart_item`
- `update_customer_cart_item`
- `remove_customer_cart_item`
- `clear_customer_cart`
- `create_customer_order_from_cart`
- `get_customer_orders`
- `get_customer_order_detail`

Las RPC usan `auth.uid()` y `current_customer_id()`. No aceptan `customer_id`, precio, total ni estado de pago desde el frontend como autoridad.

## Endpoints

- `GET /api/customer/cart`
- `POST /api/customer/cart/items`
- `PATCH /api/customer/cart/items/:id`
- `DELETE /api/customer/cart/items/:id`
- `DELETE /api/customer/cart`
- `POST /api/customer/orders`
- `GET /api/customer/orders`
- `GET /api/customer/orders/:id`

Todos requieren sesión válida. Sin sesión responden 401. Customer no tiene acceso a `/api/admin/*`.

## Productos elegibles

- `wine`: entra al carrito si está publicado, visible en app, con precio válido y stock suficiente cuando hay control de inventario.
- `event_ticket`: queda preparado para tickets activos, publicados, vendibles y con capacidad disponible.
- `experience`: no entra al carrito; usa el flujo de reservaciones.

No se permiten tipos de item no aprobados.

## Pricing y descuentos

El frontend no calcula precio final. El backend:

- revalida item.
- revalida precio.
- calcula subtotal.
- aplica descuento válido si existe código elegible.
- calcula impuestos.
- calcula envío.
- calcula total.
- guarda snapshots en orden y partidas.

Promociones se aplican solo cuando están publicadas, visibles, vigentes, con mínimo cumplido y uso disponible.

## Envío

Fase 8C usa `pickup_at_hacienda`.

No se inventan tarifas de envío ni envío gratis ficticio. Las reglas finales de envío quedan pendientes de aprobación de Hacienda.

## Checkout

`/app/checkout` muestra items, cantidades, subtotal, descuentos, impuestos, recolección en Hacienda, total, moneda y estado de pago.

Al confirmar:

- se crea una orden real.
- la orden queda `pending_payment`.
- se devuelve `orderNumber`.
- el carrito activo queda convertido.
- se registra auditoría.
- no se crea registro en `payments`.

Mensaje visible esperado:

`Tu orden fue creada. El pago en línea estará disponible próximamente.`

## Ownership e idempotencia

Reglas validadas:

- customer ve solo su carrito.
- customer ve solo sus órdenes.
- otro customer recibe 404 ante orden ajena.
- customer recibe 403 en endpoints administrativos.
- sin sesión recibe 401.
- idempotency key requerida para crear orden.
- payload con precio, total o customer arbitrario se rechaza.

## Prueba real QA

Runner:

`backend/scripts/phase8c-real-check.mjs`

Validaciones ejecutadas en local y producción:

- customers temporales `QA_FASE8C_` creados por flujo seguro.
- vino publicado real usado como item.
- carrito creado y persistido.
- partida agregada.
- cantidad actualizada.
- payload manipulado rechazado con 422.
- orden creada con `pending_payment`.
- orden visible en historial propio.
- orden ajena bloqueada.
- sin sesión bloqueada.
- customer bloqueado de admin.
- auditoría confirmada.
- ningún pago creado.
- datos temporales limpiados.

No se imprimieron JWT, tokens, service role key, headers sensibles ni variables de entorno.

## Riesgos y dependencias

Pendiente de Hacienda:

- proveedor de pago.
- cuenta productiva.
- credenciales de pasarela.
- webhooks.
- reglas finales de envío.
- políticas finales de cancelación de órdenes.
- comunicaciones transaccionales.

Pendiente técnico:

- pasarela productiva.
- Resend transaccional final.
- QA E2E de navegador en el repo.
- diseño premium global.

## Estado final

FASE 8C APROBADA.

Fase 8D no iniciada.
