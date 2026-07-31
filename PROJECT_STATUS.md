# Hacienda de Letras OS - Project Status

## Fase 1

Estado: cerrada en produccion.

- Railway despliega backend desde `main` con root `/backend`.
- `/api/health` responde con Supabase configurado, alcanzable y saludable.
- `/api/version` responde 200.
- `/api/public/status` responde 200.
- Netlify responde 200 en `/`, `/control/dashboard` y `/app/home`.
- Redirect SPA conservado en `public/_redirects`.

## Fase 2

Estado: implementada a nivel base de datos.

### Migraciones

- `001_system_health.sql`
- `002_extensions_and_enums.sql`
- `003_identity_and_roles.sql`
- `004_customers_crm.sql`
- `005_wines_catalog.sql`
- `006_experiences_events.sql`
- `007_reservations.sql`
- `008_promotions.sql`
- `009_orders_payments.sql`
- `010_wine_club.sql`
- `011_sommelier.sql`
- `012_campaigns_notifications.sql`
- `013_inventory_logistics.sql`
- `014_documents_audit.sql`
- `015_rls_policies.sql`
- `016_storage_buckets.sql`
- `017_seed_data.sql`

### Validacion Supabase

- Tablas publicas: 58.
- Foreign keys: 73.
- Indices: 162.
- Policies: 89.
- RLS: activo en tablas operativas; sin tablas esperadas con RLS deshabilitado.
- Buckets: 9 creados/validados.
- Extensiones: `pgcrypto`, `citext` y `vector` disponibles.
- Seeds: 7 roles, 3 vinos, 2 experiencias, 2 eventos, 2 promociones, 2 planes Wine Club.
- Helpers: `has_role`, `has_any_role`, `is_admin`, `current_customer_id`, `reserve_experience_slot`.
- Triggers: `updated_at`, historial de reservaciones y auditoria administrativa.

### Riesgos Pendientes

- Las pantallas siguen usando mocks hasta que Fase 3 conecte frontend/autenticacion.
- No se implementaron pagos reales.
- No se integro OpenAI; Sommelier solo tiene estructura de datos.
- No se crearon usuarios auth ficticios.

## Siguiente Fase

Fase 3: autenticacion, usuarios reales y conexion progresiva de pantallas a Supabase.
