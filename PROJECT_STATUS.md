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

Estado: cerrada en producción.

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
- Validación productiva autenticada: admin real/autorizado recibió 200 en endpoints editoriales; customer-only recibió 403 en endpoint admin; sin sesión recibió 401.
- Ningún secreto fue impreso.

### Riesgos Pendientes Fase 4B

- Los formularios especializados del Centro de Control quedaron conectados y validados en Fase 6B.
- Google y Apple Auth quedan documentados para la app cliente, no implementados.
- La experiencia bilingüe completa requiere conexión frontend posterior.

## Fase 6

Estado: cerrada en producción.

### Validación Productiva

- Fase 6B desplegada: formularios especializados editoriales para vinos, experiencias, eventos, promociones, membresías y campañas.
- Fase 6C desplegada: confirmaciones críticas para publicar, despublicar, archivar, restaurar, restaurar versión, duplicar como borrador, programar y retirar contenido.
- Commits presentes en `origin/main`:
  - `e4156e8 feat: add specialized editorial forms`
  - `13fd995 feat: add editorial action confirmations`
- Validación manual `super_admin` completada por la usuaria en producción.
- Rutas validadas con sesión `super_admin`: `/control/vinos`, `/control/experiencias`, `/control/eventos`, `/control/promociones`, `/control/membresias` y `/control/campanas`.
- `ControlLayout` carga correctamente en las rutas editoriales.
- Las rutas no redirigen a `/app/home`, no dan 404 y no presentan pantalla blanca.
- Los formularios especializados de Fase 6B aparecen correctamente.
- Las confirmaciones críticas de Fase 6C aparecen correctamente y cancelar no ejecuta acciones.
- No se observaron errores críticos visibles en producción.
- Frontend tests: 40/40.
- Backend tests: 31/31.
- Builds frontend y backend exitosos.
- Railway health OK: `/api/health` con Supabase configurado, alcanzable, saludable y `status: ok`.
- Netlify HTTP 200.
- No se imprimieron secretos, tokens, contraseñas ni credenciales.

## Siguiente Fase

Fase 7 — Centro de Control conectado como sistema de autogestión.

## Fase 7B

Estado: cerrada en producción.

### Disponibilidad y Reservaciones

- Migración aplicada en Supabase productivo: `024_reservation_operations.sql`.
- Commit desplegado: `91ee60a feat: connect availability and reservations operations`.
- Tablas extendidas de forma no destructiva: `reservations`, `experience_slots`, `experience_blockouts`.
- RPC operativas: `create_experience_slot`, `update_experience_slot`, `block_experience_slot`, `unblock_experience_slot`, `create_reservation_admin`, `confirm_reservation`, `cancel_reservation`, `reschedule_reservation`, `update_reservation_people`.
- Las RPC derivan el actor desde `auth.uid()`, no aceptan actor parametrizable y solo conceden `EXECUTE` a usuarios autenticados.
- Backend nuevo:
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
- Frontend conectado:
  - `/control/disponibilidad` consume API real y permite crear, editar, bloquear, desbloquear, duplicar horarios y crear bloqueos.
  - `/control/reservaciones` consume API real y permite crear, confirmar, cancelar, reprogramar, cambiar personas, agregar notas, consultar historial y exportar CSV real.
- Permisos:
  - Lectura: `super_admin`, `admin`, `operations`, `marketing`, `finance`, `viewer`.
  - Escritura: `super_admin`, `admin`, `operations`.
  - `customer` queda bloqueado en endpoints admin.
- Reglas de cupo:
  - `pending` no consume cupo confirmado.
  - `confirmed` consume cupo.
  - `cancelled` libera cupo si estaba confirmada.
  - Reprogramación y cambios de personas se ejecutan vía RPC transaccional con validación de capacidad.
- Pruebas locales:
  - Frontend tests: 44/44.
  - Backend tests: 38/38.
  - Frontend build: exitoso.
  - Backend build: exitoso.
- Prueba real local contra Supabase productivo:
  - Admin `super_admin`: lectura y escritura operativa aprobadas.
  - Customer: bloqueado con 403 en endpoints administrativos.
  - Sin sesión: bloqueado con 401.
  - Datos temporales `QA_FASE7B_` creados para validación y limpiados al finalizar.
  - No se imprimieron secretos, tokens, headers sensibles ni credenciales.
- Validación productiva:
  - Railway `/api/health`: OK con Supabase configurado, alcanzable, saludable y `status: ok`.
  - Railway endpoints reales de disponibilidad y reservaciones: admin `super_admin` aprobado con 200/201.
  - Railway bloqueo de permisos: sin sesión 401; customer 403.
  - Netlify HTTP 200 en `/control/disponibilidad` y `/control/reservaciones`.
  - Netlify sirve el bundle nuevo `index-mBUMbP1Z.js`.
  - Prueba productiva `QA_FASE7B_`: datos temporales creados y limpiados al finalizar.
  - No se imprimieron secretos, tokens, headers sensibles ni credenciales.
- Riesgo pendiente:
  - Revisar duplicación masiva de horarios con volumen productivo antes de uso intensivo.
- Fase 7C cerrada en producción.

## Fase 7C

Estado: aprobada en producción.

### Clientes y CRM Real

- Migración aplicada en Supabase productivo: `025_customer_crm_operations.sql`.
- Commit desplegado: `f3c7371 feat: connect customer crm operations`.
- Tablas extendidas de forma no destructiva: `customers`, `customer_tags`, `customer_tag_assignments`, `customer_notes`.
- Reglas de identidad:
  - Un cliente CRM puede existir sin usuario Auth.
  - Un usuario Auth tipo `customer` puede estar vinculado a un registro en `customers`.
  - El CRM administrativo no crea usuarios Auth automáticamente.
  - La creación evita duplicados por correo y teléfono normalizados.
  - `customer_number` se genera como identificador operativo único.
- Backend nuevo:
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
- Frontend conectado:
  - `/control/clientes` consume API real.
  - Lista, filtros, búsqueda, alta, edición, consentimiento, notas, etiquetas, relaciones, historial, exportación, archivado y restauración funcionan contra backend real.
  - Ya no depende de `src/app/data/customers.ts` para operación.
- Permisos:
  - Lectura: `super_admin`, `admin`, `operations`, `marketing`, `finance`, `viewer`.
  - Escritura CRM: `super_admin`, `admin`, `operations`, `marketing`.
  - Etiquetas: `super_admin`, `admin`, `marketing`.
  - Exportación: `super_admin`, `admin`, `operations`, `marketing`, `finance`.
  - `customer` queda bloqueado en endpoints admin.
- Privacidad:
  - No se exponen tokens, headers sensibles, service role key ni variables de entorno.
  - Exportación CSV no incluye UUID internos innecesarios, metadata completa ni notas privadas.
  - Etiquetas internas no quedan disponibles para usuarios `customer`.
- Pruebas locales:
  - Frontend tests: 48/48.
  - Backend tests: 47/47.
  - Frontend build: exitoso.
  - Backend build: exitoso.
  - Lint: exitoso con warnings preexistentes.
  - `git diff --check`: limpio.
- Prueba real local contra Supabase productivo:
  - Admin `super_admin`: lectura, escritura, notas, etiquetas, exportación, archivado, restauración e historial aprobados.
  - Customer: bloqueado con 403 en endpoints administrativos.
  - Sin sesión: bloqueado con 401.
  - Datos temporales `QA_FASE7C_` creados para validación y limpiados al finalizar.
- Validación productiva:
  - Railway `/api/health`: HTTP 200.
  - Railway runner productivo Fase 7C: aprobado.
  - Railway endpoints CRM reales: admin aprobado con 200/201.
  - Railway bloqueo de permisos: sin sesión 401; customer 403.
  - Netlify HTTP 200 en `/control/clientes`.
  - Netlify sirve el bundle nuevo `index-CC25RzLF.js`.
  - No se imprimieron secretos, tokens, headers sensibles ni credenciales.

## Fase 7E

Estado: aprobada en producción.

### Wine Club, Inventario, Logística y Distribuidores

- Migración aplicada en Supabase productivo: `027_wineclub_inventory_logistics_distributors.sql`.
- Migración reaplicada sin efectos destructivos para validar idempotencia.
- Commit funcional desplegado: `f9209a5 feat: connect wine club inventory logistics and distributors`.
- Backend conectado a datos reales:
  - Wine Club administrativo en `/api/admin/memberships`.
  - Inventario administrativo en `/api/admin/inventory`.
  - Logística administrativa en `/api/admin/shipments`.
  - Distribuidores y órdenes de distribuidores en `/api/admin/distributors` y `/api/admin/distributor-orders`.
- Frontend conectado a API real:
  - `/control/wine-club`
  - `/control/inventario`
  - `/control/logistica`
  - `/control/distribuidores`
- Permisos productivos validados:
  - Admin `super_admin`: lectura y escritura operativa aprobadas.
  - Customer: bloqueado con 403 en endpoints administrativos.
  - Sin sesión: bloqueado con 401.
- Prueba real local contra Supabase productivo:
  - Datos temporales `QA_FASE7E_` creados para validación y limpiados al finalizar.
  - Validó membresías, puntos, inventario, movimientos, logística, distribuidores, órdenes y exportaciones seguras.
- Validación productiva:
  - Railway `/api/health`: HTTP 200 con Supabase `status: ok`.
  - Railway runner productivo Fase 7E: aprobado.
  - Netlify HTTP 200 en `/control/wine-club`, `/control/inventario`, `/control/logistica` y `/control/distribuidores`.
  - Netlify sirve el bundle `index-BJV4wwsd.js`.
  - Las rutas de Centro de Control están presentes en el bundle desplegado y no dependen de mocks visibles.
- Pruebas locales:
  - Frontend tests: 58/58.
  - Backend tests: 61/61.
  - Frontend build: exitoso.
  - Backend build: exitoso.
  - Lint: exitoso con warnings preexistentes.
  - `git diff --check`: limpio.
- Seguridad:
  - No se imprimieron secretos, JWT, tokens, headers sensibles ni variables de entorno.
  - No se crearon datos productivos permanentes.
  - La mutación productiva se limitó a datos temporales `QA_FASE7E_` y la limpieza quedó completada.

## Siguiente Fase

Fase 7F — No iniciada.
