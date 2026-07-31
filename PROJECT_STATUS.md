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

## Fase 3

Estado: implementada localmente; aprobacion productiva pendiente de prueba admin real.

### Autenticacion

- Cliente Supabase frontend: `src/lib/supabase.ts` con anon key, sesion persistente, refresh automatico y deteccion de sesion en URL.
- Servicio: `src/services/auth.service.ts`.
- Contexto: `src/contexts/AuthContext.tsx`.
- Rutas publicas: `/`, `/login`, `/registro`, `/recuperar`, `/reset-password`, `/app/home`, `/app/tienda`, `/app/experiencias`, `/app/eventos`, `/app/mapa`.
- Rutas cliente protegidas: `/app/perfil`, `/app/carrito`, `/app/club`, `/app/reservacion`.
- Rutas administrativas protegidas: `/control/*`.

### Backend Auth

- Middleware: `authenticate`, `authorize`, `rateLimit`.
- Endpoints seguros: `/api/auth/me`, `/api/auth/roles`, `/api/auth/profile`.
- Endpoints admin: `/api/admin/users`, `/api/admin/users/:id`, roles, enable/disable.
- Service role solo se usa en backend.

### Supabase

- Migracion `018_auth_customer_role.sql` aplicada.
- Todo usuario nuevo recibe profile, preferences, customer y rol `customer`.
- Proceso seguro para primer super admin: `backend/scripts/assign-super-admin.mjs`.

### Pruebas Fase 3

- Backend tests: 24/24.
- Frontend tests: 9/9.
- Cliente real controlado `cliente.prueba@alqia.tech`: login OK, profile OK, customer OK, rol `customer` OK.
- Recuperacion real solicitada para cliente de prueba sin imprimir enlace ni tokens.

### Riesgos Pendientes Fase 3

- Falta ejecutar prueba real admin porque no se proporciono correo autorizado objetivo.
- Supabase Auth debe tener configuradas las Redirect URLs documentadas.
- No se agrego E2E con navegador porque el repo no tiene Playwright/Cypress configurado.

## Siguiente Fase

Completar validacion admin real de Fase 3 antes de iniciar Fase 4.
