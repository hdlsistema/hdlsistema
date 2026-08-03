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

## Errores

- `401`: sesión requerida o inválida.
- `403`: permisos insuficientes.
- `409`: cupo insuficiente u horario no reservable.
- `422`: payload inválido, transición inválida o número de personas inválido.
- `500`: error interno sanitizado.

## Pruebas

- Pruebas backend cubren autenticación, permisos, lectura de disponibilidad, creación por RPC, payload inválido, listado de reservaciones y sobrecupo.
- Pruebas backend cubren CRM: sin sesión 401, customer 403, lectura admin/viewer, alta, edición, prevención de duplicados, validación de teléfono, notas, etiquetas, auditoría y exportación segura.
- Pruebas frontend cubren clientes reales de disponibilidad, reservaciones y CRM con Authorization Bearer y rechazo sin sesión.
- Las pruebas usan mocks solo dentro de archivos de test.
- Prueba real local contra Supabase productivo aprobada con datos temporales `QA_FASE7B_`, limpieza exacta y sin impresión de secretos.
- Prueba real productiva en Railway aprobada con admin `super_admin`, customer bloqueado, sin sesión bloqueada y datos temporales `QA_FASE7B_` limpiados.
- Prueba real local y productiva de CRM aprobada con datos temporales `QA_FASE7C_`, limpieza exacta y sin impresión de secretos.
- Netlify sirve el bundle desplegado con las rutas `/control/disponibilidad` y `/control/reservaciones` en HTTP 200.
- Netlify sirve el bundle desplegado con la ruta `/control/clientes` en HTTP 200.

## Riesgos Pendientes

- Revisar duplicación masiva de horarios con volumen productivo antes de uso intensivo.
