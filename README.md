# Hacienda de Letras OS

Sistema operativo digital para Hacienda de Letras: una app cliente para vinos,
experiencias, eventos, reservaciones y pagos, junto con un Centro de Control
para operar contenido, clientes, inventario, logistica, check-in QR, permisos y
seguimiento comercial.

## Arquitectura

- Frontend web: React 19, TypeScript, Vite 8, Tailwind CSS 4.
- App movil: Capacitor 8 con builds Android/iOS desde `dist-mobile`.
- Backend: Node.js, Express, TypeScript.
- Base de datos, Auth y Storage: Supabase/Postgres.
- Pagos: Stripe PaymentIntent con webhook firmado.
- Email transaccional: Resend con outbox y webhook firmado.
- Push: Firebase Cloud Messaging. En iOS, la app obtiene token Firebase a partir
  de APNs y el backend entrega via FCM; el codigo APNs directo existe como ruta
  opcional pero no es la ruta activa.
- Mapas: Mapbox.
- IA: OpenAI server-side para Sommelier/asistente ejecutivo cuando la variable
  correspondiente esta configurada.

## Superficies

- `/`: entrada publica.
- `/app/*`: app cliente Hacienda de Letras.
- `/control/*`: Centro de Control administrativo protegido por roles/permisos.
- `/acceso/:token`: vista publica de pase QR; no consume el pase sin validacion
  autorizada desde Centro de Control.
- `/api/*`: API backend.
- `/api/webhooks/payments/stripe`: webhook Stripe.
- `/api/webhooks/resend`: webhook Resend.

## Comandos

```bash
npm install
npm run dev:web
npm run build:web
npm test
npm run lint
```

Backend:

```bash
cd backend
npm install
npm run dev
npm run build
npm run typecheck
npm test
```

Mobile:

```bash
npm run build:mobile
npm run android:sync
npm run android:apk
```

## Variables de entorno

Usar `.env.example` y `backend/.env.example` como plantilla. No subir `.env`,
`.env.local` ni secretos reales.

Frontend expone solo variables `VITE_*`:

- `VITE_API_BASE_URL`
- `PUBLIC_ACCESS_BASE_URL`
- `VITE_APP_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_TOKEN`
- `VITE_STRIPE_PUBLISHABLE_KEY`

Backend:

- Runtime/CORS: `NODE_ENV`, `PORT`, `FRONTEND_URL`, `PUBLIC_ACCESS_BASE_URL`,
  `ALLOWED_ORIGINS`
- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`
- IA: `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`,
  `OPENAI_EMBEDDING_MODEL`
- Email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`,
  `RESEND_WEBHOOK_SECRET`
- Push: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
  `FIREBASE_PRIVATE_KEY`, `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY`,
  `APNS_BUNDLE_ID`, `APNS_ENVIRONMENT`
- Pagos: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ACCOUNT_ID`,
  `STRIPE_ENVIRONMENT`

## Deploy actual

- Frontend produccion: `https://admhaciendadeletras.com`
- Backend produccion: `https://hdlsistema-production.up.railway.app`
- Dominio `www`: redirige a `https://admhaciendadeletras.com/`.

No hay configuracion declarativa de deploy en el repo (`netlify.toml`,
`railway.json`, `Dockerfile` o equivalente). Confirmar proveedor/commit de
deploy desde Netlify/Railway antes de afirmar trazabilidad exacta de produccion.

## Healthchecks seguros

- `GET https://admhaciendadeletras.com`
  - Esperado: `200`.
  - Significa: frontend reachable.
- `GET https://admhaciendadeletras.com/control`
  - Esperado: `200`.
  - Significa: shell del Centro de Control reachable; no valida login.
- `GET https://admhaciendadeletras.com/app/home`
  - Esperado: `200`.
  - Significa: shell de app cliente reachable.
- `GET https://hdlsistema-production.up.railway.app/api/public/status`
  - Esperado: `{ "ok": true, "frontendConnection": true }`.
  - Significa: API publica reachable.
- `GET https://hdlsistema-production.up.railway.app/api/health`
  - Esperado: `ok: true`, `supabase.status: "ok"`.
  - Significa: backend vivo, Supabase reachable y configuracion push/pagos
    diagnosticada sin exponer secretos.
- `GET https://hdlsistema-production.up.railway.app/api/version`
  - Esperado: servicio y version de API.

No monitorear webhooks con POST falso: Stripe y Resend requieren firma valida.

## Senales para ALQIA Control Center

- Frontend caido: fallo en `GET https://admhaciendadeletras.com`.
- Centro de Control caido: fallo en `GET /control`.
- App cliente caida: fallo en `GET /app/home`.
- Backend caido: fallo en `GET /api/public/status`.
- Supabase/db degradado: `/api/health` con `supabase.healthy: false` o
  `supabase.status` distinto de `ok`.
- Push degradado: `/api/health` con `push.android.configured: false` o
  `push.ios.configured: false`.
- Stripe degradado: `/api/health` con `payments.stripe.configured: false` o
  `payments.stripe.webhookConfigured: false` cuando pagos productivos esten
  activos.
- Webhooks con error: monitorear codigos HTTP 4xx/5xx en Railway para rutas
  `/api/webhooks/payments/stripe` y `/api/webhooks/resend`; no usar payloads
  falsos porque requieren firma.
- Deploy fallido: confirmar en Netlify/Railway. El repo no contiene una fuente
  declarativa local para leer deploy status.

## Backups

No hay configuracion ni politica de backups documentada en el repo. Para cierre
operativo debe verificarse en Supabase:

- tipo de backup activo,
- frecuencia,
- retencion,
- procedimiento de restauracion,
- responsable de prueba de restore.

Mientras no se confirme en Supabase, el estado operativo de backups es
`PENDIENTE DE VERIFICACION EN SUPABASE`.

## Estructura principal

- `src/app`: aplicacion web, app cliente y Centro de Control.
- `src/mobile`: entrada mobile aislada para Capacitor.
- `src/services`: clientes frontend para API/Auth/Supabase.
- `backend/src`: API Express por modulos.
- `backend/migrations`: migraciones SQL Supabase.
- `backend/scripts`: utilidades de migracion/verificacion.
- `docs` y `backend/docs`: documentacion funcional y tecnica.
- `android` / `ios`: proyectos nativos Capacitor.

## Roles y permisos

Supabase Auth maneja sesiones. El Centro de Control usa roles administrativos y
permisos granulares. Los permisos financieros se separan para evitar que staff
operativo vea importes; `admin` y `super_admin` conservan acceso financiero por
rol.

## Release checklist

1. Verificar `pwd` en `/Users/pattyg/Developer/HaciendaDemo-rescate`.
2. Ejecutar `git fetch origin main` y revisar `git status`.
3. Correr `npm test`, `npm run lint`, `npm run build:web`.
4. Correr en `backend`: `npm run typecheck`, `npm test`, `npm run build`.
5. Ejecutar `git diff --check`.
6. Confirmar migraciones necesarias en Supabase sin exponer secretos.
7. Confirmar healthchecks de frontend/API.
8. Commit con alcance claro y `git push origin main`.
9. Verificar deploy real en Netlify/Railway y registrar commit desplegado si el
   proveedor lo expone.
