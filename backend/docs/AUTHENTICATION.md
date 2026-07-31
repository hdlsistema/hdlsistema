# Authentication - Hacienda de Letras OS

## Arquitectura

La autenticacion usa Supabase Auth con email/password. El frontend usa solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` mediante `src/lib/supabase.ts`.

El backend valida Bearer tokens con el cliente anon y usa service role solo en rutas administrativas del servidor.

## Frontend

- Cliente unico: `src/lib/supabase.ts`.
- Servicio: `src/services/auth.service.ts`.
- Contexto: `src/contexts/AuthContext.tsx`.
- Rutas protegidas: `src/routes/ProtectedRoute.tsx`, `src/routes/RoleRoute.tsx`.

El contexto expone:

- `user`
- `session`
- `profile`
- `roles`
- `isAuthenticated`
- `isLoading`
- `isAdmin`
- `hasRole()`
- `signIn()`
- `signOut()`
- `refreshProfile()`

## Registro

`signUpCustomer()` registra usuarios publicos con metadata minima:

- first_name
- last_name
- display_name
- phone
- preferred_language

No acepta `role`, `is_admin`, `permissions` ni `service_role`. La asignacion real de rol ocurre en la base mediante trigger.

## Login

`signIn()` usa Supabase Auth y carga roles desde `user_roles`. La redireccion respeta prioridad administrativa:

1. `super_admin`
2. `admin`
3. `operations`
4. `marketing`
5. `finance`
6. `viewer`
7. `customer`

Roles administrativos entran a `/control/dashboard`; customer entra a `/app/home`.

## Recuperacion

Rutas:

- `/recuperar`
- `/reset-password`

Redirect URLs requeridas:

- `https://admhaciendadeletras.com/reset-password`
- `http://localhost:5173/reset-password`

Supabase procesa la sesion temporal por `detectSessionInUrl`; no se muestran tokens.

## Verificacion de Correo

Tras registro se muestra mensaje para verificar correo y opcion de reenviar. URLs recomendadas en Supabase Auth:

- Site URL: `https://admhaciendadeletras.com`
- Redirect URLs: `https://admhaciendadeletras.com/**`, `http://localhost:5173/**`

No se habilitaron proveedores sociales.

## Perfil y Avatar

`/app/perfil` lee:

- `profiles`
- `user_preferences`
- `customers`

Solo actualiza campos permitidos por RLS. Avatar usa bucket privado `avatars`, ruta `user_id/avatar.ext`, tipos `jpg`, `jpeg`, `png`, `webp` y maximo 5 MB. La visualizacion usa signed URL.

## Backend

Middleware:

- `backend/src/middleware/authenticate.ts`
- `backend/src/middleware/authorize.ts`
- `backend/src/middleware/rateLimit.ts`

Endpoints sesion:

- `GET /api/auth/me`
- `GET /api/auth/roles`
- `GET /api/auth/profile`

Endpoints admin:

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `POST /api/admin/users/:id/roles`
- `DELETE /api/admin/users/:id/roles/:roleCode`
- `POST /api/admin/users/:id/disable`
- `POST /api/admin/users/:id/enable`

Solo `super_admin` y `admin` pueden administrar usuarios.

## Base de Datos

`018_auth_customer_role.sql` actualiza `handle_new_user_profile()` para crear de forma idempotente:

- `profiles`
- `user_preferences`
- `customers`
- `user_roles` con rol `customer`

No permite autoasignacion administrativa.

## Primer Super Admin

Script:

`backend/scripts/assign-super-admin.mjs`

Uso seguro:

`node scripts/assign-super-admin.mjs correo-autorizado@dominio.com`

El usuario debe existir previamente en Supabase Auth. El script no imprime secretos, no crea usuarios automaticamente y registra auditoria.

## Variables

Frontend permitidas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`
- `VITE_API_BASE_URL`

Backend:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No crear:

- `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `VITE_OPENAI_API_KEY`
- `VITE_ADMIN_EMAIL`
- `VITE_ADMIN_PASSWORD`

## Pruebas

- Backend: auth sin token, auth con token mockeado, admin protegido, health y schema.
- Frontend: signup sin payload administrativo, reset password con redirect seguro, API wrapper.
- Prueba real: cliente controlado `cliente.prueba@alqia.tech` con contraseña temporal en memoria.
- Prueba admin: `pgaribay@alqia.tech` creado/encontrado en Supabase Auth, `super_admin` asignado con `assign-super-admin.mjs`, profile/customer/roles/audit validados.
- Backend local compilado valida token real admin y permite endpoints auth/admin.
- Produccion Railway responde 401 con token real admin; revisar `SUPABASE_ANON_KEY`/variables Auth productivas en Railway.

## Riesgos

- Validacion productiva admin bloqueada hasta alinear variables Auth en Railway.
- No hay E2E con navegador configurado en este repo.
