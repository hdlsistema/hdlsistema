# Eliminación de cuenta compatible con Apple 5.1.1(v)

## Flujo visible para la persona usuaria

1. App > Perfil > Privacidad y cuenta > Eliminar mi cuenta.
2. La app explica consecuencias, conservación limitada y plazo máximo de procesamiento.
3. El botón **Eliminar definitivamente mi cuenta** crea una pre-solicitud y envía un correo Resend.
4. El correo tiene asunto **Confirma la eliminación de tu cuenta de Hacienda de Letras** y botón **Confirmar eliminación de cuenta**.
5. El enlace valida token firmado, de un solo uso y con expiración.
6. Al confirmar, el estado cambia a `pending_processing`, se revocan sesiones y se bloquea el acceso mientras se procesa.
7. La pantalla de confirmación informa que la eliminación está en proceso y que se enviará un correo final.

## Plazo

No se encontró un plazo explícito previo en la documentación pública del repo. El backend usa `ACCOUNT_DELETION_PROCESSING_DAYS` y deja `30` días naturales como valor operativo por defecto hasta que legal/operación confirmen otro plazo.

## Estados

`awaiting_email_confirmation` es una pre-solicitud y no aparece en la cola operativa del Centro de Control.

Estados operativos del Centro de Control:

- `pending_processing`: orden confirmada y pendiente de procesar.
- `in_progress`: ejecución iniciada.
- `completed`: eliminación/anonimización completada y correo final enviado.
- `technical_error`: error técnico que requiere corrección y reintento.

No existen estados administrativos para negar o decidir una eliminación ya confirmada.

## Datos eliminados

Cuando existe `user_id` o `customer_id`, el proceso elimina datos personales no requeridos de:

- `user_preferences`
- `user_roles`
- `addresses`
- `notification_devices`
- `carts` y `cart_items`
- `customer_payment_profiles`
- `communication_preferences`
- `sommelier_usage`
- `sommelier_feedback`
- `control_user_site_scopes`
- `customer_addresses`
- `customer_notes`
- `customer_tag_assignments`
- `campaign_recipients`
- `notifications`
- `customer_app_events`
- `sommelier_sessions` y mensajes asociados por cascada

## Datos anonimizados

El proceso anonimiza o desvincula datos personales en:

- `profiles`: nombre, teléfono, avatar y fecha de nacimiento.
- `customers`: `user_id`, nombre, email, teléfono, fecha de nacimiento, notas, consentimientos y segmento.
- `reservations`: `user_id` y notas personales del cliente.
- `orders`: `user_id`, dirección de facturación y dirección de envío en snapshot.
- `quote_requests`: nombre, correo, teléfono, empresa y notas de contacto.
- `order_shipping_addresses`: destinatario, teléfono, email y domicilio.
- `memberships`: renovación automática desactivada y membresía cerrada.
- `reservation_guests`: datos de acompañantes.
- `payments`: payload del proveedor sin borrar importes ni referencias obligatorias.
- `shipments`: destino y metadatos personales.
- `access_passes`: metadatos personales.
- `communication_events`, `email_outbox` y `email_deliveries`: payloads, cuerpos y destinatarios asociados.

## Datos conservados

Se conservan registros necesarios para obligaciones fiscales, legales, seguridad, prevención de fraude y evidencia operativa, sin datos personales directos cuando corresponde:

- `orders`: importes, moneda, folio y estado.
- `payments`: importes, proveedor, estado y referencia de pago.
- `reservations`, `access_passes` y `checkins`: folios, estados y evidencia operativa.
- `audit_logs`: bitácora de seguridad y operación.

## Auth y sesiones

Al confirmar el correo, el backend marca `auth.users.app_metadata.account_deletion_status = pending_processing`, guarda el folio de solicitud, revoca sesiones globalmente con Supabase Admin y aplica `ban_duration` por el plazo operativo configurado. La app y el middleware backend también bloquean sesiones nuevas mientras la orden esté en `pending_processing`, `in_progress` o `technical_error`.

Al completar, el backend elimina el usuario de Supabase Auth con `auth.admin.deleteUser`.

## Sign in with Apple

El plugin nativo iOS captura `identityToken` y `authorizationCode`. El frontend envía el `authorizationCode` al backend autenticado. El backend intercambia ese código con Apple, guarda refresh/access tokens cifrados en `apple_sign_in_tokens` y, al procesar la eliminación, revoca el token contra `https://appleid.apple.com/auth/revoke`.

Los secretos de Apple (`APPLE_SIGN_IN_CLIENT_ID`, `APPLE_SIGN_IN_TEAM_ID`, `APPLE_SIGN_IN_KEY_ID`, `APPLE_SIGN_IN_PRIVATE_KEY`, `APPLE_SIGN_IN_REDIRECT_URI`) son variables server-side y nunca se exponen en frontend.

## Correo final

Cuando el Centro de Control procesa correctamente, Resend envía:

**Asunto:** Tu cuenta de Hacienda de Letras ha sido eliminada

El mensaje informa que la cuenta fue eliminada, que los datos personales correspondientes fueron eliminados o anonimizados y que sólo se conserva información requerida por obligaciones legales o fiscales.
