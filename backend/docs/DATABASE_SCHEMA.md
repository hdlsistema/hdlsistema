# Esquema de Base de Datos - Hacienda de Letras OS

## Alcance

La Fase 2 crea la base productiva para usuarios, CRM, catálogo de vinos, experiencias, eventos, reservaciones, promociones, carrito, órdenes, pagos, QR, check-in, Wine Club, Sommelier ALQIA, campañas, documentos, auditoría, inventario, logística, distribuidores y reportes.

No conecta pantallas, no implementa pagos reales y no integra OpenAI.

## Migraciones

1. `001_system_health.sql`: health check técnico.
2. `002_extensions_and_enums.sql`: extensiones, enums y `set_updated_at`.
3. `003_identity_and_roles.sql`: profiles, roles, user_roles, preferencias y direcciones.
4. `004_customers_crm.sql`: customers, tags y notas.
5. `005_wines_catalog.sql`: categorías, vinos, imágenes, maridajes y servicio.
6. `006_experiences_events.sql`: experiencias, slots, bloqueos, eventos y tickets.
7. `007_reservations.sql`: reservaciones, invitados, historial y RPC de capacidad.
8. `008_promotions.sql`: promociones, targets y redenciones.
9. `009_orders_payments.sql`: carritos, ordenes, pagos, webhooks, QR y check-ins.
10. `010_wine_club.sql`: planes, membresías, puntos y beneficios.
11. `011_sommelier.sql`: conocimiento, sesiones, mensajes, uso y feedback.
12. `012_campaigns_notifications.sql`: campañas, destinatarios, notificaciones y dispositivos.
13. `013_inventory_logistics.sql`: ubicaciones, inventario, movimientos, envíos y distribuidores.
14. `014_documents_audit.sql`: documentos, auditoría, settings y triggers.
15. `015_rls_policies.sql`: helpers de rol y policies.
16. `016_storage_buckets.sql`: buckets y policies Storage.
17. `017_seed_data.sql`: roles, settings y datos seed/test.
18. `018_auth_customer_role.sql`: asignación segura de rol `customer`.
19. `019_editorial_publication_model.sql`: modelo editorial, visibilidad, publicación y RLS público.
20. `020_preview_and_scheduling.sql`: preview seguro y jobs de publicación.
21. `021_content_audit_and_versions.sql`: permisos editoriales, versionado, triggers y realtime.
22. `022_content_translations.sql`: traducciones bilingües por entidad e idioma.

## Entidades Principales

- Identidad: `profiles`, `roles`, `user_roles`, `user_preferences`, `addresses`.
- CRM: `customers`, `customer_tags`, `customer_tag_assignments`, `customer_notes`.
- Catálogo: `wine_categories`, `wines`, `wine_images`, `wine_pairings`, `wine_service_notes`.
- Experiencias y eventos: `experiences`, `experience_slots`, `experience_blockouts`, `events`, `event_ticket_types`.
- Reservaciones: `reservations`, `reservation_guests`, `reservation_status_history`.
- Comercio: `carts`, `cart_items`, `orders`, `order_items`, `payments`, `payment_webhook_events`.
- Acceso: `access_passes`, `checkins`.
- Wine Club: `membership_plans`, `memberships`, `loyalty_transactions`, `membership_benefits`.
- Sommelier: `sommelier_knowledge`, `sommelier_sessions`, `sommelier_messages`, `sommelier_usage`, `sommelier_feedback`.
- Marketing: `campaigns`, `campaign_recipients`, `notifications`, `notification_devices`.
- Operación: `inventory_locations`, `inventory_items`, `inventory_movements`, `shipments`, `distributors`, `distributor_orders`.
- Gobierno: `documents`, `audit_logs`, `system_settings`, `system_health`.
- Editorial: `content_versions`, `content_preview_tokens`, `content_publication_jobs`, `content_publication_requirements`, `content_translations`.

## Estados

Enums creados:

- `user_role`
- `content_status`
- `reservation_status`
- `payment_status`
- `order_status`
- `event_status`
- `membership_status`
- `notification_status`
- `campaign_status`

## Permisos

RLS está activo en tablas con datos de usuarios, clientes, operación y contenido editorial.

Funciones helper:

- `has_role(role_code)`
- `has_any_role(role_codes)`
- `is_admin()`
- `current_customer_id()`
- `can_manage_content(entity_type)`
- `can_publish_content(entity_type)`
- `can_restore_content(entity_type)`

Reglas base:

- Público lee solo vinos, experiencias, eventos, promociones y planes publicados/activos.
- Customer lee sus profiles, direcciones, reservaciones, órdenes, membresías y notificaciones.
- Admin opera según roles de `roles` y `user_roles`, sin correos hardcodeados.
- Service role queda reservado al backend.
- Viewer solo lee contenido administrativo.
- Operations, marketing y finance quedan limitados por dominio editorial.

## Storage

Buckets públicos:

- `brand`
- `wines`
- `events`
- `experiences`
- `promotions`

Buckets privados:

- `avatars`
- `documents`
- `campaigns`
- `delivery-evidence`

No hay escritura pública anónima. Avatares permiten gestión por propietario autenticado; buckets privados requieren roles administrativos o service role.

## Triggers y Funciones

- `set_updated_at`: actualiza columnas `updated_at`.
- `handle_new_user_profile`: crea profile/preferencias al registrar usuario auth.
- `log_reservation_status_change`: registra historial de reservaciones.
- `reserve_experience_slot`: actualiza capacidad de slots sin sobrecupo.
- `write_admin_audit_log`: registra cambios administrativos críticos.
- `is_content_live`: decide si un contenido puede verse públicamente.
- `capture_content_version`: guarda snapshot versionado.
- `translation_publication_state`: clasifica preparación/publicación bilingüe.

## Modelo Editorial

Las entidades editoriales iniciales comparten:

- `visible_in_app`
- `visible_in_control`
- `sort_order`
- `publish_at`
- `unpublish_at`
- `created_by`
- `updated_by`
- `published_by`
- `published_at`
- `archived_at`
- `deleted_at`
- `version`
- `locale`
- `metadata`

`content_translations` permite español e inglés con fallback a español, slug por idioma, estado de traducción, publicación por idioma, versionado y auditoría.

## Reglas Críticas

- No se guardan datos completos de tarjeta.
- QR se almacena como hash en `access_passes.qr_token_hash`.
- Cantidades, precios y capacidades tienen constraints no negativas.
- Fechas finales deben ser posteriores a fechas iniciales cuando aplica.
- `sold_count` y `reserved_count` no pueden exceder capacidad.
- Seeds son idempotentes y marcados como seed/test.
