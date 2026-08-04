# App Cliente: base conectada

Documento de cierre operativo de Fase 8B para la app cliente de Hacienda de Letras OS.

## Estado

Fase 8B aprobada en producción.

- Commit funcional: `5dd39b7 feat: connect customer app base flows`.
- Migración aplicada: `028_customer_app_operations.sql`.
- Runner real: `backend/scripts/phase8b-real-check.mjs`.
- Railway: `/api/health` HTTP 200 con Supabase `configured`, `reachable` y `healthy`.
- Netlify: rutas `/app/*` de Fase 8B HTTP 200 con bundle `index-C-XNEYfq.js`.
- No se inició Fase 8C.

## Principios

- Supabase es la fuente única de verdad.
- La app cliente no consume endpoints `/api/admin/*`.
- El frontend no usa service role.
- El backend deriva `customer_id`, precios, cupo, estado y número de reservación.
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

Las RPC usan `auth.uid()` y `current_customer_id()` para resolver ownership. No aceptan `customer_id` desde el frontend como autoridad.

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

## Idioma

- Español por defecto.
- Locale estructural preparado.
- Fallback a español para contenido editorial.
- Preferencia customer preparada desde perfil.
- Bilingüe completo queda pendiente para una fase posterior.

## Pruebas

Gates de cierre:

- Frontend: 62/62.
- Backend: 68/68.
- Frontend build: exitoso.
- Backend build: exitoso.
- Lint: exitoso con warnings preexistentes.
- `git diff --check`: exitoso.
- Prueba real local: aprobada.
- Prueba real productiva: aprobada.

La prueba real creó datos temporales `QA_FASE8B_`, validó admin, customer y sin sesión, creó una reservación, la reprogramó, la canceló, confirmó auditoría y limpió lo temporal.

## Pendientes 8C

- Carrito persistente.
- Checkout.
- Pasarela productiva.
- Pagos reales.
- Resend transaccional final.
- Reglas comerciales finales de cancelación y reprogramación.
- Confirmaciones y comunicaciones al cliente.

## Riesgos

- Falta QA E2E de navegador configurado en el repo.
- La validación visual de producción se hizo por HTTP/SPA y bundle desplegado; no por navegador automatizado.
- Diseño premium global sigue pendiente.
- Google Sign-In, Sign in with Apple, Firebase/push, Sommelier OpenAI y publicación en tiendas siguen fuera de 8B.

## Seguridad

No se imprimieron secretos, JWT, tokens, service role key, headers sensibles ni variables de entorno durante el cierre de Fase 8B.
