# App Cliente: base conectada, carrito, checkout base, comunicaciones y bilingüe

Documento de cierre operativo de Fases 8B, 8C, 8E y 8F para la app cliente de Hacienda de Letras OS.

## Estado

Fase 8F aprobada.

- Commit funcional: `5dd39b7 feat: connect customer app base flows`.
- Migración aplicada: `028_customer_app_operations.sql`.
- Runner real: `backend/scripts/phase8b-real-check.mjs`.
- Commit funcional 8C: `1dab2b1 feat: connect customer cart and checkout base`.
- Migración aplicada 8C: `029_customer_cart_checkout.sql`.
- Runner real 8C: `backend/scripts/phase8c-real-check.mjs`.
- Railway: `/api/health` HTTP 200 con Supabase `configured`, `reachable` y `healthy`.
- Netlify: rutas `/app/*` de Fase 8C HTTP 200 con bundle `index-VU0eV1pM.js`.
- Fase 8D de pasarela productiva sigue bloqueada / pendiente de aprobación final.
- Fase 8E validó Resend transaccional real con outbox, worker, idempotencia, retry y webhook firmado.
- Commit funcional 8F: `37f69ef feat: complete bilingual customer and control experience`.
- Migración aplicada 8F: `031_phase8f_bilingual_seed_translations.sql`.
- Runner real 8F: `backend/scripts/phase8f-real-check.mjs`.
- Netlify: raíz, `/app/home`, `/control/vinos` y `/login` HTTP 200 con bundle `index-DglLycGF.js`.

## Principios

- Supabase es la fuente única de verdad.
- La app cliente no consume endpoints `/api/admin/*`.
- El frontend no usa service role.
- El backend deriva `customer_id`, precios, cupo, estado y número de reservación.
- El backend deriva precios, totales, descuentos y estado de orden en carrito/checkout.
- Los mocks solo están permitidos dentro de archivos de prueba.
- Las pantallas temporales deben ser honestas y no simular funciones productivas.
- No se muestran notas internas, tags internos, metadata administrativa ni datos de otros clientes.

## Autenticación Customer

Rutas cliente:

- `/app/login`
- `/app/registro`
- `/app/recuperar`
- `/app/reset-password`
- `/app/auth/callback`

Rutas compatibles conservadas temporalmente:

- `/login`
- `/registro`
- `/recuperar`
- `/reset-password`

El registro público crea usuarios con rol `customer`. No existe registro administrativo público. Los usuarios `customer` no acceden a `/control/*`; el Centro de Control permanece protegido por `RoleRoute` y roles administrativos.

## Endpoints Customer

- `GET /api/customer/me`
- `PATCH /api/customer/me`
- `GET /api/customer/availability`
- `GET /api/customer/availability/:experienceId`
- `GET /api/customer/reservations`
- `GET /api/customer/reservations/:id`
- `POST /api/customer/reservations`
- `POST /api/customer/reservations/:id/cancel`
- `POST /api/customer/reservations/:id/reschedule`
- `GET /api/customer/membership`
- `GET /api/customer/membership/benefits`
- `GET /api/customer/membership/loyalty`
- `GET /api/customer/membership/history`
- `GET /api/customer/cart`
- `POST /api/customer/cart/items`
- `PATCH /api/customer/cart/items/:id`
- `DELETE /api/customer/cart/items/:id`
- `DELETE /api/customer/cart`
- `POST /api/customer/orders`
- `GET /api/customer/orders`
- `GET /api/customer/orders/:id`

Todos requieren sesión válida salvo contenido público servido por `/api/public/*`.

## RLS y RPC

La auditoría de Fase 8B revisó:

- `customers`
- `profiles`
- `user_preferences`
- `reservations`
- `reservation_guests`
- `reservation_status_history`
- `experience_slots`
- `experience_blockouts`
- `membership_plans`
- `memberships`
- `membership_benefits`
- `loyalty_transactions`
- contenido público editorial
- `audit_logs`

RPC customer:

- `get_customer_profile`
- `update_customer_profile`
- `get_bookable_experience_slots`
- `create_customer_reservation`
- `cancel_customer_reservation`
- `reschedule_customer_reservation`
- `get_customer_reservations`
- `get_customer_membership`
- `get_customer_loyalty_summary`
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

Las RPC usan `auth.uid()` y `current_customer_id()` para resolver ownership. No aceptan `customer_id` desde el frontend como autoridad. En carrito y checkout tampoco aceptan precio, total, estado de pago ni customer arbitrario.

## Perfil

`/app/perfil` muestra datos propios:

- nombre
- apellido
- correo
- teléfono
- idioma
- preferencias
- reservaciones reales
- membresía real
- puntos reales cuando existan
- órdenes propias reales
- logout

No muestra métodos de pago ficticios, pedidos falsos, métricas inventadas, actividad hardcodeada ni segmentación CRM.

## Disponibilidad y Reservaciones

`/app/reservacion` usa endpoints customer reales para:

- consultar slots bookable.
- crear reservación propia.
- listar reservaciones propias.
- cancelar reservación propia.
- reprogramar reservación propia.

El backend valida fecha futura, cupo, estado, ownership, doble submit e idempotencia. La política comercial final de cancelación y reprogramación queda pendiente de aprobación de Hacienda.

## Wine Club

`/app/club` separa:

- planes publicados.
- membresía propia.
- beneficios propios.
- puntos propios.
- historial real cuando exista.

No ejecuta alta automática con cobro, renovación con pago ni cancelación de membresía hasta que la fase de pagos y reglas comerciales esté aprobada.

## Carrito y Checkout Base

`/app/carrito` usa endpoints customer reales para:

- consultar carrito persistente.
- agregar vinos publicados reales desde tienda y detalle.
- actualizar cantidad.
- eliminar partidas.
- vaciar carrito.
- mostrar totales calculados por backend.
- bloquear doble submit mientras hay operación en curso.

`/app/checkout` crea una orden real desde el carrito activo. La orden queda en `pending_payment`; no se crea pago, no se pide tarjeta, no se guarda dato de pago y no se simula pago aprobado.

El backend revalida publicación, precio, stock, descuento, total, ownership e idempotencia antes de crear la orden. Las experiencias conservan el flujo de reservación; los tickets de evento quedan preparados cuando existan tickets publicados y vendibles.

## Comunicaciones Transaccionales

Fase 8E conecta comunicaciones transaccionales del lado servidor:

- eventos en `communication_events`.
- outbox persistente en `email_outbox`.
- plantillas `es-MX` y `en-US`.
- envío con Resend desde backend.
- `provider_message_id` persistido.
- reintentos controlados.
- webhook firmado de Resend.
- bitácora en `email_deliveries`.

La app cliente no recibe API keys, webhook secrets, headers sensibles ni service role. Los correos se disparan desde backend como consecuencia de eventos reales y respetan idempotencia. `order.paid` queda preparado, pero permanece inactivo hasta que Fase 8D apruebe pasarela productiva.

## Contenido Público

Pantallas conectadas a contenido real:

- `/app/home`
- `/app/tienda`
- `/app/tienda/:wineId`
- `/app/experiencias`
- `/app/experiencias/:experienceId`
- `/app/eventos`
- `/app/eventos/:eventId`

Se eliminaron ratings, reseñas, stock, pedidos, puntos, membresías, distancias GPS y respuestas IA falsas cuando podían confundirse con datos reales.

## Mapa y Sommelier

`/app/mapa` usa Mapbox real configurable y evita distancias o rutas falsas. Quedan pendientes coordenadas finales, accesos, estacionamiento, puntos de interés y rutas internas de Hacienda.

`/app/sommelier` queda como pantalla temporal honesta. No simula conversación OpenAI. Puede mostrar vinos publicados como contenido informativo.

## Idioma y Experiencia Bilingüe

- Español `es-MX` por defecto.
- Inglés `en-US` como idioma secundario.
- Selector de idioma visible en autenticación, app cliente y Centro de Control.
- Preferencia persistente en sesión local.
- Preferencia customer sincronizada con `profiles.preferred_language`.
- Contenido público servido desde `content_translations` con fallback a español.
- Slugs en inglés validados para vinos, experiencias y eventos.
- Fechas, horas, números y moneda usan formato localizado.
- Convención de moneda:
  - español: `$1,250.00 MXN`.
  - inglés: `MX$1,250.00`.
- El checkout envía el idioma activo al backend para preparar comunicaciones transaccionales localizadas.
- No se agregaron mocks funcionales ni visuales al producto para simular bilingüe.

## Pruebas

Gates de cierre 8F:

- Frontend: 68/68.
- Backend: 84/84.
- Frontend build: exitoso.
- Backend build: exitoso.
- Lint: exitoso con warnings preexistentes.
- `git diff --check`: exitoso.
- Prueba real productiva: aprobada.

La prueba real de Fase 8B creó datos temporales `QA_FASE8B_`, validó admin, customer y sin sesión, creó una reservación, la reprogramó, la canceló, confirmó auditoría y limpió lo temporal.

La prueba real de Fase 8C creó datos temporales `QA_FASE8C_`, validó carrito persistente, cantidad, totales backend, rechazo de precio/customer manipulado, orden `pending_payment`, historial, ownership, customer 403 en admin, sin sesión 401, auditoría, ausencia de pagos creados y limpieza exacta.

La prueba real de Fase 8E creó datos temporales `QA_FASE8E_`, validó outbox persistente, worker, envío QA real aceptado por Resend, `provider_message_id` persistido, estado `sent`, idempotencia, retry controlado, webhook firmado, firma inválida rechazada, duplicados ignorados, logs sanitizados y limpieza exacta.

La prueba real de Fase 8F creó datos temporales `QA_FASE8F_`, validó contenido público en `es-MX` y `en-US`, slugs traducidos, registros `content_translations`, eventos y outbox bilingües, limpieza exacta y cero exposición de secretos.

## Pendientes posteriores a 8F

- Pasarela productiva.
- Pagos reales.
- Reglas comerciales finales de cancelación y reprogramación.
- Firebase/push.
- QA E2E de navegador.
- Revisión final de copy comercial/legal bilingüe por Hacienda.

## Riesgos

- Falta QA E2E de navegador configurado en el repo.
- La validación visual de producción se hizo por HTTP/SPA, bundle desplegado y render headless básico; el repo aún no tiene suite E2E de navegador.
- Playwright no está instalado; Fase 8F no tuvo validación visual de navegador con screenshots.
- Diseño premium global sigue pendiente.
- Google Sign-In, Sign in with Apple, Firebase/push, Sommelier OpenAI, pasarela productiva y publicación en tiendas siguen pendientes.

## Seguridad

No se imprimieron secretos, JWT, tokens, service role key, headers sensibles ni variables de entorno durante el cierre de Fases 8B, 8C, 8E y 8F. Ningún `.env` fue versionado.
