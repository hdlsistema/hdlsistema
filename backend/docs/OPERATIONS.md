# Operaciones: disponibilidad y reservaciones

Documento de Fase 7B para el Centro de Control de Hacienda de Letras OS.

## Fuente de Verdad

Supabase es la fuente única de verdad para disponibilidad, bloqueos, slots, reservaciones e historial. El frontend no debe crear datos operativos locales ni mostrar mocks funcionales en `/control/disponibilidad` o `/control/reservaciones`.

## Tablas

- `experiences`: catálogo editorial de experiencias.
- `experience_slots`: horarios reservables con capacidad, cupo confirmado, estado operativo, precio especial y notas internas.
- `experience_blockouts`: bloqueos por rango, por experiencia o globales.
- `reservations`: reservaciones de experiencia, datos operativos, origen, notas, cancelación y reprogramación.
- `reservation_guests`: invitados asociados.
- `reservation_status_history`: historial de estados y eventos operativos.
- `customers`: cliente asociado a cada reservación.
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

## Permisos

- `super_admin`: lectura y escritura completa.
- `admin`: lectura y escritura completa.
- `operations`: lectura y escritura operativa.
- `marketing`: lectura operativa.
- `finance`: lectura operativa.
- `viewer`: lectura y exportación.
- `customer`: sin acceso a endpoints administrativos.

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

## Errores

- `401`: sesión requerida o inválida.
- `403`: permisos insuficientes.
- `409`: cupo insuficiente u horario no reservable.
- `422`: payload inválido, transición inválida o número de personas inválido.
- `500`: error interno sanitizado.

## Pruebas

- Pruebas backend cubren autenticación, permisos, lectura de disponibilidad, creación por RPC, payload inválido, listado de reservaciones y sobrecupo.
- Pruebas frontend cubren clientes reales de disponibilidad y reservaciones con Authorization Bearer y rechazo sin sesión.
- Las pruebas usan mocks solo dentro de archivos de test.
- Prueba real local contra Supabase productivo aprobada con datos temporales `QA_FASE7B_`, limpieza exacta y sin impresión de secretos.

## Riesgos Pendientes

- Validar deploy Railway y Netlify.
- Revisar duplicación masiva de horarios con volumen productivo antes de uso intensivo.
