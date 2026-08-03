# Operaciones: disponibilidad, reservaciones y CRM

Documento operativo para el Centro de Control de Hacienda de Letras OS.

## Fuente de Verdad

Supabase es la fuente única de verdad para disponibilidad, bloqueos, slots, reservaciones, clientes, relaciones CRM e historial. El frontend no debe crear datos operativos locales ni mostrar mocks funcionales en `/control/disponibilidad`, `/control/reservaciones` o `/control/clientes`.

## Tablas

- `experiences`: catálogo editorial de experiencias.
- `experience_slots`: horarios reservables con capacidad, cupo confirmado, estado operativo, precio especial y notas internas.
- `experience_blockouts`: bloqueos por rango, por experiencia o globales.
- `reservations`: reservaciones de experiencia, datos operativos, origen, notas, cancelación y reprogramación.
- `reservation_guests`: invitados asociados.
- `reservation_status_history`: historial de estados y eventos operativos.
- `customers`: cliente asociado a cada reservación.
- `customer_tags`: etiquetas internas de CRM.
- `customer_tag_assignments`: asignación de etiquetas a clientes.
- `customer_notes`: notas internas de seguimiento.
- `audit_logs`: auditoría administrativa.

## Capacidad

- Un slot tiene `capacity`.
- Una reservación `pending` no consume cupo confirmado.
- Una reservación `confirmed` consume cupo.
- Una reservación `cancelled` libera cupo si estaba confirmada.
- Una reservación `completed` conserva historial y no debe bloquear operación futura.
- `people_count` debe ser mayor o igual a 1.
- `confirmed_count` no puede superar `capacity`.
- Reprogramar libera el slot anterior y reserva el nuevo dentro de una sola RPC.
- Confirmar y cancelar son idempotentes cuando ya están en el estado final esperado.

## RPC

- `create_experience_slot`
- `update_experience_slot`
- `block_experience_slot`
- `unblock_experience_slot`
- `create_reservation_admin`
- `confirm_reservation`
- `cancel_reservation`
- `reschedule_reservation`
- `update_reservation_people`

Las RPC derivan el actor desde `auth.uid()`, validan rol operativo, bloquean filas críticas con `for update`, revisan capacidad y devuelven errores sanitizados. No aceptan un actor parametrizable desde el cliente.

## Endpoints de Disponibilidad

- `GET /api/admin/availability`
- `GET /api/admin/availability/calendar`
- `GET /api/admin/availability/slots`
- `POST /api/admin/availability/slots`
- `PATCH /api/admin/availability/slots/:id`
- `POST /api/admin/availability/slots/:id/block`
- `POST /api/admin/availability/slots/:id/unblock`
- `POST /api/admin/availability/blockouts`
- `PATCH /api/admin/availability/blockouts/:id`
- `DELETE /api/admin/availability/blockouts/:id`
- `POST /api/admin/availability/duplicate-slots`

## Endpoints de Reservaciones

- `GET /api/admin/reservations`
- `GET /api/admin/reservations/:id`
- `POST /api/admin/reservations`
- `PATCH /api/admin/reservations/:id`
- `POST /api/admin/reservations/:id/confirm`
- `POST /api/admin/reservations/:id/cancel`
- `POST /api/admin/reservations/:id/reschedule`
- `POST /api/admin/reservations/:id/change-party-size`
- `POST /api/admin/reservations/:id/notes`
- `GET /api/admin/reservations/:id/history`
- `GET /api/admin/reservations/export`

## Endpoints de Clientes y CRM

- `GET /api/admin/customers`
- `GET /api/admin/customers/:id`
- `POST /api/admin/customers`
- `PATCH /api/admin/customers/:id`
- `POST /api/admin/customers/:id/archive`
- `POST /api/admin/customers/:id/restore`
- `GET /api/admin/customers/:id/reservations`
- `GET /api/admin/customers/:id/orders`
- `GET /api/admin/customers/:id/memberships`
- `GET /api/admin/customers/:id/history`
- `POST /api/admin/customers/:id/notes`
- `PATCH /api/admin/customers/:id/notes/:noteId`
- `DELETE /api/admin/customers/:id/notes/:noteId`
- `POST /api/admin/customers/:id/tags`
- `DELETE /api/admin/customers/:id/tags/:tagId`
- `GET /api/admin/customer-tags`
- `POST /api/admin/customer-tags`
- `PATCH /api/admin/customer-tags/:id`
- `DELETE /api/admin/customer-tags/:id`
- `GET /api/admin/customers/export`

## Endpoints de Wine Club

- `GET /api/admin/memberships`
- `GET /api/admin/memberships/:id`
- `POST /api/admin/memberships`
- `PATCH /api/admin/memberships/:id`
- `POST /api/admin/memberships/:id/activate`
- `POST /api/admin/memberships/:id/pause`
- `POST /api/admin/memberships/:id/resume`
- `POST /api/admin/memberships/:id/cancel`
- `POST /api/admin/memberships/:id/renew`
- `GET /api/admin/memberships/:id/benefits`
- `GET /api/admin/memberships/:id/loyalty`
- `GET /api/admin/memberships/:id/history`
- `POST /api/admin/memberships/:id/loyalty-adjustment`
- `POST /api/admin/memberships/:id/order-loyalty`
- `GET /api/admin/memberships/export`

## Endpoints de Inventario

- `GET /api/admin/inventory`
- `GET /api/admin/inventory/items`
- `POST /api/admin/inventory/items`
- `PATCH /api/admin/inventory/items/:id`
- `GET /api/admin/inventory/locations`
- `POST /api/admin/inventory/locations`
- `PATCH /api/admin/inventory/locations/:id`
- `GET /api/admin/inventory/movements`
- `POST /api/admin/inventory/receive`
- `POST /api/admin/inventory/reserve`
- `POST /api/admin/inventory/release`
- `POST /api/admin/inventory/fulfill`
- `POST /api/admin/inventory/transfer`
- `POST /api/admin/inventory/adjust`
- `GET /api/admin/inventory/export`

## Endpoints de Logística

- `GET /api/admin/shipments`
- `GET /api/admin/shipments/:id`
- `POST /api/admin/shipments`
- `PATCH /api/admin/shipments/:id`
- `GET /api/admin/shipments/carriers`
- `POST /api/admin/shipments/carriers`
- `PATCH /api/admin/shipments/carriers/:id`
- `POST /api/admin/shipments/:id/status`
- `POST /api/admin/shipments/:id/incident`
- `POST /api/admin/shipments/:id/deliver`
- `POST /api/admin/shipments/:id/cancel`
- `GET /api/admin/shipments/:id/history`
- `GET /api/admin/shipments/export`

## Endpoints de Distribuidores

- `GET /api/admin/distributors`
- `GET /api/admin/distributors/:id`
- `POST /api/admin/distributors`
- `PATCH /api/admin/distributors/:id`
- `POST /api/admin/distributors/:id/archive`
- `POST /api/admin/distributors/:id/restore`
- `GET /api/admin/distributors/:id/contacts`
- `POST /api/admin/distributors/:id/contacts`
- `PATCH /api/admin/distributors/:id/contacts/:contactId`
- `GET /api/admin/distributor-orders`
- `GET /api/admin/distributor-orders/:id`
- `POST /api/admin/distributor-orders`
- `PATCH /api/admin/distributor-orders/:id`
- `POST /api/admin/distributor-orders/:id/approve`
- `POST /api/admin/distributor-orders/:id/reject`
- `POST /api/admin/distributor-orders/:id/prepare`
- `POST /api/admin/distributor-orders/:id/ship`
- `POST /api/admin/distributor-orders/:id/deliver`
- `POST /api/admin/distributor-orders/:id/cancel`
- `GET /api/admin/distributor-orders/:id/items`
- `GET /api/admin/distributor-orders/export`

## Identidad de Clientes

- Un registro en `customers` puede existir sin usuario Auth.
- Un usuario Auth tipo `customer` puede estar vinculado a `customers.user_id`.
- El CRM administrativo no crea usuarios Auth automáticamente.
- La creación administrativa normaliza correo y teléfono para evitar duplicados.
- `customer_number` es el identificador operativo externo para listados y exportaciones.
- Los UUID de Auth no se exponen en respuestas administrativas salvo que una fase futura lo requiera expresamente.

## Permisos

- `super_admin`: lectura y escritura completa.
- `admin`: lectura y escritura completa.
- `operations`: lectura y escritura operativa.
- `marketing`: lectura operativa y escritura CRM.
- `finance`: lectura operativa.
- `viewer`: lectura operativa.
- `customer`: sin acceso a endpoints administrativos.

En CRM, la exportación queda limitada a `super_admin`, `admin`, `operations`, `marketing` y `finance`. La gestión de etiquetas queda limitada a `super_admin`, `admin` y `marketing`.

En Wine Club, inventario, logística y distribuidores:

- `super_admin` y `admin` tienen lectura y escritura operativa completa.
- `operations` puede operar inventario y logística; su acceso a Wine Club y distribuidores queda acotado a permisos operativos.
- `finance` puede consultar costos, valor de inventario, Wine Club y órdenes de distribuidores, sin ajustes físicos arbitrarios.
- `marketing` puede consultar Wine Club y segmentos, sin acceso operativo a inventario ni costos.
- `viewer` conserva lectura administrativa.
- `customer` queda bloqueado en todos los endpoints administrativos.

## Exportación

El CSV administrativo se genera desde datos reales y contiene:

- `reservation_number`
- `customer_name`
- `email`
- `phone`
- `experience`
- `date`
- `time`
- `people_count`
- `status`
- `source`
- `total`
- `created_at`

No exporta tokens, UUID internos innecesarios, metadata completa ni notas privadas.

La exportación CRM contiene identificador operativo, nombre, correo, teléfono, segmento, origen, consentimiento, métricas relacionales y fechas administrativas. No exporta UUID internos innecesarios, metadata completa, notas privadas ni credenciales.

Las exportaciones de Wine Club, inventario, logística y distribuidores contienen identificadores operativos y campos administrativos necesarios para operación. No exportan JWT, tokens, service role key, headers sensibles, UUID internos innecesarios, metadata completa ni credenciales.

## Errores

- `401`: sesión requerida o inválida.
- `403`: permisos insuficientes.
- `409`: cupo insuficiente u horario no reservable.
- `422`: payload inválido, transición inválida o número de personas inválido.
- `500`: error interno sanitizado.

## Pruebas

- Pruebas backend cubren autenticación, permisos, lectura de disponibilidad, creación por RPC, payload inválido, listado de reservaciones y sobrecupo.
- Pruebas backend cubren CRM: sin sesión 401, customer 403, lectura admin/viewer, alta, edición, prevención de duplicados, validación de teléfono, notas, etiquetas, auditoría y exportación segura.
- Pruebas backend cubren Wine Club, inventario, logística y distribuidores: sin sesión 401, customer 403, lecturas admin, mutaciones administrativas, validación de payloads, protección de sobrecupo y exportaciones seguras.
- Pruebas frontend cubren clientes reales de disponibilidad, reservaciones, CRM, Wine Club, inventario, logística y distribuidores con Authorization Bearer y rechazo sin sesión.
- Las pruebas usan mocks solo dentro de archivos de test.
- Prueba real local contra Supabase productivo aprobada con datos temporales `QA_FASE7B_`, limpieza exacta y sin impresión de secretos.
- Prueba real productiva en Railway aprobada con admin `super_admin`, customer bloqueado, sin sesión bloqueada y datos temporales `QA_FASE7B_` limpiados.
- Prueba real local y productiva de CRM aprobada con datos temporales `QA_FASE7C_`, limpieza exacta y sin impresión de secretos.
- Prueba real local y productiva de Fase 7E aprobada con datos temporales `QA_FASE7E_`, limpieza exacta y sin impresión de secretos.
- Netlify sirve el bundle desplegado con las rutas `/control/disponibilidad` y `/control/reservaciones` en HTTP 200.
- Netlify sirve el bundle desplegado con la ruta `/control/clientes` en HTTP 200.
- Netlify sirve el bundle desplegado con las rutas `/control/wine-club`, `/control/inventario`, `/control/logistica` y `/control/distribuidores` en HTTP 200.

## Riesgos Pendientes

- Revisar duplicación masiva de horarios con volumen productivo antes de uso intensivo.
