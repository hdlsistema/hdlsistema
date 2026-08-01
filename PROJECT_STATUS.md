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
- Índices: 162.
- Policies: 89.
- RLS: activo en tablas operativas; sin tablas esperadas con RLS deshabilitado.
- Buckets: 9 creados/validados.
- Extensiones: `pgcrypto`, `citext` y `vector` disponibles.
- Seeds: 7 roles, 3 vinos, 2 experiencias, 2 eventos, 2 promociones, 2 planes Wine Club.
- Helpers: `has_role`, `has_any_role`, `is_admin`, `current_customer_id`, `reserve_experience_slot`.
- Triggers: `updated_at`, historial de reservaciones y auditoría administrativa.

### Riesgos Pendientes

- Las pantallas siguen usando mocks hasta que Fase 3 conecte frontend/autenticación.
- No se implementaron pagos reales.
- No se integró OpenAI; Sommelier solo tiene estructura de datos.
- No se crearon usuarios auth ficticios.

## Fase 3

Estado: aprobada en producción.

### Autenticación

- Cliente Supabase frontend: `src/lib/supabase.ts` con anon key, sesión persistente, refresh automático y detección de sesión en URL.
- Servicio: `src/services/auth.service.ts`.
- Contexto: `src/contexts/AuthContext.tsx`.
- Rutas públicas: `/`, `/login`, `/registro`, `/recuperar`, `/reset-password`, `/app/home`, `/app/tienda`, `/app/experiencias`, `/app/eventos`, `/app/mapa`.
- Rutas cliente protegidas: `/app/perfil`, `/app/carrito`, `/app/club`, `/app/reservacion`.
- Rutas administrativas protegidas: `/control/*`.

### Backend Auth

- Middleware: `authenticate`, `authorize`, `rateLimit`.
- Endpoints seguros: `/api/auth/me`, `/api/auth/roles`, `/api/auth/profile`.
- Endpoints admin: `/api/admin/users`, `/api/admin/users/:id`, roles, enable/disable.
- Service role solo se usa en backend.

### Supabase

- Migración `018_auth_customer_role.sql` aplicada.
- Todo usuario nuevo recibe profile, preferences, customer y rol `customer`.
- Proceso seguro para primer super admin: `backend/scripts/assign-super-admin.mjs`.

### Pruebas Fase 3

- Backend tests: 24/24.
- Frontend tests: 9/9.
- Cliente real controlado `cliente.prueba@alqia.tech`: login OK, profile OK, customer OK, rol `customer` OK.
- Recuperación real solicitada para cliente de prueba sin imprimir enlace ni tokens.
- Usuario admin inicial `pgaribay@alqia.tech`: creado en Supabase Auth, email confirmado, profile/customer creados, rol `super_admin` asignado por script seguro, sin duplicados y con audit log.
- Backend local compilado con token real admin: `/api/auth/me`, `/api/auth/roles`, `/api/auth/profile`, `/api/admin/users` responden 200.
- Customer real bloqueado en endpoint admin con 403.
- Supabase Auth configurado con Site URL productiva, redirect URLs local/productiva, email/password, recovery, refresh token rotation y secure password change.
- Railway producción corregido: `SUPABASE_ANON_KEY` alineada con el mismo proyecto que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
- Backend productivo validado: admin real responde 200 en endpoints auth/admin; customer responde 403 en `/api/admin/users`.
- Netlify corregido: el dominio productivo usaba un deploy manual anterior sin `build_id` ni `commit_ref`; quedó publicado el deploy GitHub desde `main`.
- Netlify producción validado: sitio `haciendadeletras`, repo `hdlsistema/hdlsistema`, rama `main`, commit `5724395d0be1acbca12fc03eb4b05ac9543c7e83`.
- Rutas auth productivas validadas: `/login`, `/registro`, `/recuperar`, `/reset-password`, `/app/home`, `/app/perfil` y `/control/dashboard`.
- Customer queda bloqueado visualmente en `/control/dashboard`; super_admin accede al Centro de Control.
- Recargas directas SPA validadas con 200 y sin redirects HTTP inesperados.

### Riesgos Pendientes Fase 3

- No hay E2E con navegador configurado en el repo; la validación productiva se hizo con navegador headless y sesiones reales saneadas.

## Fase 4B

Estado: implementada y validada técnicamente.

### Aclaración Arquitectónica

- La PWA corresponde exclusivamente al Centro de Control administrativo.
- Rutas administrativas: `/login`, `/recuperar`, `/reset-password`, `/control/*`.
- La PWA no tendrá registro público, registro libre, Google, Apple ni autoasignación de roles.
- Las cuentas administrativas se crean previamente por ALQIA o por un `super_admin` autorizado.
- La app cliente queda separada en `/app/login`, `/app/registro`, `/app/recuperar`, `/app/auth/callback` y `/app/*`.
- La app cliente tendrá rol fijo `customer` y queda preparada para email/password, Google y Apple en fases posteriores.
- La app cliente debe operar en español e inglés.

### Modelo Editorial

- Migraciones aplicadas e idempotentes: `019_editorial_publication_model.sql`, `020_preview_and_scheduling.sql`, `021_content_audit_and_versions.sql`, `022_content_translations.sql`, `023_copy_corrections.sql`.
- Entidades iniciales: vinos, experiencias, eventos, promociones, planes de membresía y campañas.
- Modelo común: visibilidad, orden, ventanas de publicación, autoría, publicación, archivado, borrado lógico, versión, locale y metadata.
- `content_translations` soporta español/inglés, fallback a español, slug por idioma, estado de traducción, publicación por idioma, auditoría y versionado.
- Preview guarda solo hash del token, expira y puede revocarse.
- Scheduler interno procesa jobs vencidos por lotes sin depender del navegador.
- Realtime preparado para `wines`, `experiences`, `events`, `promotions`, `content_translations`, `content_versions` y `content_publication_jobs`.

### Backend Editorial

- Módulo común en `backend/src/modules/content/`.
- Endpoints administrativos bajo `/api/admin/{wines|experiences|events|promotions|membership-plans|campaigns}`.
- Endpoints públicos bajo `/api/public/wines`, `/api/public/experiences`, `/api/public/events`, `/api/public/promotions` y `/api/public/membership-plans`.
- `GET /api/preview/:token` disponible con rate limit y sin enumeración.
- Validación estricta por entidad con Zod.
- Allowlist explícita; no hay endpoint genérico contra cualquier tabla.

### Validación Fase 4B

- Supabase productivo: columnas, constraints, índices, funciones, triggers, policies, RLS y realtime validados.
- `rls_disabled = []`.
- Prueba real controlada con vino, experiencia y evento: draft oculto, publicación visible, edición versionada, despublicación oculta, restore visible y archivado oculto.
- Preview real: token guardado como hash, no impreso y revocable.
- Scheduler real: worker procesó jobs vencidos.
- Tipos TypeScript regenerados desde Supabase.
- Copia seed visible corregida con acentos donde aplicaba.
- Ningún secreto fue impreso.

### Riesgos Pendientes Fase 4B

- No se conectaron todavía todos los formularios del Centro de Control.
- Google y Apple Auth quedan documentados para la app cliente, no implementados.
- La experiencia bilingüe completa requiere conexión frontend posterior.

## Siguiente Fase

Centro de Control conectado como sistema de autogestión.
