# Comunicaciones Transaccionales

Documento operativo de Fases 8E y 8F para emails transaccionales de Hacienda de Letras OS.

## Estado

Fase 8F aprobada para comunicaciones bilingües sobre la base transaccional de Fase 8E.

- Migración aplicada: `030_transactional_communications.sql`.
- Runner real: `backend/scripts/phase8e-real-check.mjs`.
- Proveedor: Resend.
- Dominio de envío: verificado en proveedor.
- Envío QA real: aceptado por Resend.
- Outbox, worker, idempotencia, retry y webhook firmado: validados.
- Datos temporales `QA_FASE8E_`: creados y limpiados.
- Fase 8F validó eventos y outbox QA bilingües `es-MX` y `en-US`.
- Datos temporales `QA_FASE8F_`: creados y limpiados.

## Configuración

El runner y el backend requieren las siguientes variables del lado servidor:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `RESEND_WEBHOOK_SECRET`

Estas variables no deben imprimirse en logs, documentación, commits ni reportes. `RESEND_FROM_EMAIL` puede configurarse como correo puro o como remitente con nombre visible; el backend normaliza ambos formatos antes de llamar a Resend.

## Modelo

- `communication_events`: evento transaccional, estado e idempotencia.
- `email_templates`: plantillas por `template_key` y locale.
- `email_outbox`: cola persistente de correos.
- `email_deliveries`: eventos recibidos del proveedor.
- `communication_preferences`: preferencias transaccionales y marketing.

## Endpoints

- `GET /api/admin/communications`
- `GET /api/admin/communications/:id`
- `POST /api/admin/communications/:id/retry`
- `POST /api/webhooks/resend`

Los endpoints administrativos requieren rol operativo. El webhook de Resend no requiere sesión porque valida autoridad mediante firma criptográfica.

## Flujo

1. El backend crea un `communication_event` con `idempotency_key`.
2. El backend crea o reutiliza el `email_outbox` asociado.
3. El worker procesa el outbox cuando está en `queued`.
4. Resend acepta el correo y devuelve `provider_message_id`.
5. El backend actualiza outbox a `sent`.
6. El backend registra delivery inicial.
7. Resend confirma eventos posteriores mediante webhook firmado.
8. El webhook actualiza delivery y estado final cuando corresponde.

## Idempotencia

La idempotencia se valida por `idempotency_key` en `communication_events` y `email_outbox`. Los duplicados se rechazan o reutilizan sin crear correos adicionales. El runner productivo validó que no se dupliquen evento ni outbox.

## Retry

El retry queda controlado por estado del outbox, número de intentos, `max_attempts`, `scheduled_at` y `error_code` sanitizado. El runner productivo validó reprogramación de retry sin envío adicional.

## Webhook

El webhook valida:

- `svix-id`
- `svix-timestamp`
- `svix-signature`
- ventana de tolerancia temporal
- firma HMAC

La firma inválida responde error seguro. Los eventos duplicados se aceptan idempotentemente sin duplicar `email_deliveries`.

## Plantillas

Locales activos:

- `es-MX`
- `en-US`

Fase 8F validó que los detalles transaccionales usen etiquetas, moneda y fechas localizadas. El idioma se deriva del flujo customer cuando el frontend crea órdenes y del locale del evento en comunicaciones del backend.

Eventos preparados:

- `customer.welcome`
- `reservation.created`
- `reservation.rescheduled`
- `reservation.cancelled`
- `order.created`
- `order.pending_payment`
- `order.paid`
- `membership.activated`
- `membership.renewed`
- `membership.expiring`
- `security.password_changed`

`order.paid` está preparado, pero permanece inactivo hasta que Fase 8D apruebe pasarela productiva. Fase 8E validó que `order.paid` no se dispara durante el runner QA.

## Validación Productiva

Runner ejecutado contra Railway productivo:

- health HTTP 200.
- endpoint administrativo sin sesión HTTP 401.
- outbox creado.
- worker procesado.
- envío QA real aceptado por Resend.
- `provider_message_id` persistido.
- estado `sent`.
- idempotencia validada.
- duplicado rechazado.
- retry controlado validado.
- webhook firmado aceptado.
- firma inválida rechazada.
- evento duplicado ignorado.
- logs sanitizados.
- limpieza QA completa.

Runner 8F ejecutado contra Railway productivo:

- health HTTP 200.
- contenido público disponible en `es-MX` y `en-US`.
- eventos de comunicación QA en español e inglés creados.
- outbox QA en español e inglés creado.
- limpieza QA completa.
- cero datos QA permanentes.
- no se enviaron correos a clientes reales.

## Seguridad

- No imprimir API keys.
- No imprimir webhook secret.
- No imprimir JWT.
- No imprimir service role key.
- No imprimir headers sensibles.
- No exponer valores de variables en documentación.
- No versionar `.env`.
- No enviar correos a clientes reales durante runners QA.
