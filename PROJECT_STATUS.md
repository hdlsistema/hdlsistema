# Hacienda de Letras OS - Project Status

Este documento es la fuente única de verdad del estado del proyecto hasta Fase 8C.

## Fase 1

Estado: cerrada en producción.

### Infraestructura Base

- Commit principal: `054bb29 feat: complete phase 1 backend infrastructure`.
- Railway despliega backend desde `main` con root `/backend`.
- Netlify despliega frontend desde `main`.
- Redirect SPA conservado en `public/_redirects`.
- Backend base:
  - `/api/health`
  - `/api/version`
  - `/api/public/status`
- Health check de Supabase distingue:
  - `configured`
  - `reachable`
  - `healthy`
  - `status`
- Corrección de diagnóstico Supabase:
  - `33744a3 fix: improve Supabase health diagnostics`
  - `e9aa74a fix: use supabaseAdminClient for reachable check instead of raw fetch HEAD`
- Estado productivo validado: Railway y Netlify responden correctamente.

## Fase 2

Estado: implementada a nivel base de datos.

### Migraciones Base

- Commit principal: `3bc0ded feat: implement phase 2 database foundation`.
- Migraciones aplicadas:
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
- Validación Supabase:
  - Tablas públicas: 58.
  - Foreign keys: 73.
  - Índices: 162.
  - Policies: 89.
  - RLS activo en tablas operativas.
  - Buckets: 9 creados/validados.
  - Extensiones: `pgcrypto`, `citext` y `vector`.
  - Helpers: `has_role`, `has_any_role`, `is_admin`, `current_customer_id`, `reserve_experience_slot`.
- Riesgos históricos:
  - En esta fase aún no había pagos reales.
  - OpenAI/Sommelier quedó solo con estructura de datos.
  - No se crearon usuarios Auth ficticios.

## Fase 3

Estado: aprobada en producción.

### Autenticación y Roles

- Commit funcional: `8286e3c feat: implement phase 3 authentication and roles`.
- Corrección/validación admin: `5724395 fix: complete phase 3 admin validation`.
- Commit documental: `7a7149b docs: close phase 3 authentication validation`.
- Migración aplicada: `018_auth_customer_role.sql`.
- Frontend:
  - `src/lib/supabase.ts`
  - `src/services/auth.service.ts`
  - `src/contexts/AuthContext.tsx`
  - `src/routes/ProtectedRoute.tsx`
  - `src/routes/RoleRoute.tsx`
- Backend:
  - `authenticate`
  - `authorize`
  - `rateLimit`
  - `/api/auth/me`
  - `/api/auth/roles`
  - `/api/auth/profile`
  - `/api/admin/users`
- Usuario inicial `super_admin` asignado por script seguro:
  - `backend/scripts/assign-super-admin.mjs`
- Usuario `customer` bloqueado correctamente en endpoints administrativos.
- Supabase Auth validado con email/password, recuperación, rotación de refresh token y cambio seguro de contraseña.
- Netlify fue corregido para publicar el deploy GitHub desde `main`.
- Pruebas históricas:
  - Backend: 24/24.
  - Frontend: 9/9.
- Riesgo pendiente:
  - No hay E2E de navegador configurado en el repo.

## Fase 4A

Estado: auditoría previa.

### Auditoría Editorial

- Objetivo: revisar el alcance editorial antes de construir el modelo productivo.
- No se identificó commit funcional independiente asociado exclusivamente a Fase 4A.
- Clasificación: auditoría únicamente.
- No se registran migraciones propias de Fase 4A.
- No se registran endpoints propios de Fase 4A.

## Fase 4B

Estado: cerrada en producción.

### Modelo Editorial Productivo

- Commit funcional: `a494e22 feat: implement phase 4 editorial foundation`.
- Corrección editorial: `ae2e7a5 fix: correct phase 4 editorial copy`.
- Commit documental: `15169d2 docs: close phase 4b authenticated validation`.
- Migraciones aplicadas e idempotentes:
  - `019_editorial_publication_model.sql`
  - `020_preview_and_scheduling.sql`
  - `021_content_audit_and_versions.sql`
  - `022_content_translations.sql`
  - `023_copy_corrections.sql`
- Entidades editoriales:
  - vinos
  - experiencias
  - eventos
  - promociones
  - planes de membresía
  - campañas
- Backend:
  - `backend/src/modules/content/`
  - `/api/admin/{wines|experiences|events|promotions|membership-plans|campaigns}`
  - `/api/public/wines`
  - `/api/public/experiences`
  - `/api/public/events`
  - `/api/public/promotions`
  - `/api/public/membership-plans`
  - `/api/preview/:token`
- Validaciones:
  - RLS validado.
  - Preview guarda solo hash.
  - Scheduler interno procesa jobs vencidos.
  - Admin autenticado recibe 200.
  - Customer recibe 403.
  - Sin sesión recibe 401.
- Ningún secreto fue impreso.

## Fase 5

Estado: implementada y desplegada.

### Centro de Control Editorial Conectado

- Commit funcional: `b750fbd feat: connect editorial control center to backend`.
- Evidencia de archivos:
  - `src/services/content.service.ts`
  - `src/app/hooks/usePublicContent.ts`
  - `src/app/pages/control/EditorialContentPage.tsx`
  - `src/app/routes/AppRouter.tsx`
  - `src/app/layout/ControlLayout.tsx`
  - `backend/scripts/phase5-production-check.mjs`
- Conexión real:
  - El Centro de Control editorial consume endpoints administrativos reales.
  - La app cliente consume endpoints públicos reales donde corresponde.
  - Se reemplazaron pantallas editoriales previas por flujo común conectado.
- Rutas relacionadas:
  - `/control/vinos`
  - `/control/experiencias`
  - `/control/eventos`
  - `/control/promociones`
  - `/control/membresias`
  - `/control/campanas`
- No se identificó commit documental histórico separado para Fase 5.

## Fase 6A

Estado: auditoría previa.

### Auditoría UX / CRUD Editorial

- Objetivo: revisar el Centro de Control antes de formularios especializados y acciones críticas.
- Clasificación: auditoría únicamente.
- Sin implementación funcional independiente registrada para Fase 6A.
- Sin migración propia.
- Sin commit funcional independiente identificado.

## Fase 6B

Estado: cerrada en producción.

### Formularios Editoriales Especializados

- Commit funcional: `e4156e8 feat: add specialized editorial forms`.
- Archivos principales:
  - `src/app/pages/control/EditorialContentPage.tsx`
  - `src/app/pages/control/editorial/EditorialFormShell.tsx`
  - `src/app/pages/control/editorial/forms/`
  - `src/__tests__/editorial.forms.test.tsx`
- Formularios especializados para:
  - vinos
  - experiencias
  - eventos
  - promociones
  - membresías
  - campañas
- Validación productiva manual por `super_admin` completada.

## Fase 6C

Estado: cerrada en producción.

### Confirmaciones y Acciones Críticas

- Commit funcional: `13fd995 feat: add editorial action confirmations`.
- Commit documental Fase 6: `9897920 docs: close phase 6 production validation`.
- Acciones cubiertas:
  - publicar
  - despublicar
  - archivar
  - restaurar
  - restaurar versión
  - duplicar como borrador
  - programar
  - retirar
- Validación manual `super_admin`:
  - `ControlLayout` carga correctamente.
  - Formularios especializados aparecen.
  - Confirmaciones críticas aparecen.
  - Cancelar no ejecuta acciones.
  - No hay 404.
  - No hay pantalla blanca.
- Pruebas históricas de cierre Fase 6:
  - Frontend: 40/40.
  - Backend: 31/31.
  - Builds frontend y backend exitosos.
  - Railway health OK.
  - Netlify HTTP 200.

## Fase 6D

Estado: no existió como fase independiente.

- No se encontró commit funcional específico.
- No se encontró migración específica.
- No se encontró cierre documental propio.
- Clasificación: no iniciada / no aplica.

## Fase 7A

Estado: auditoría operativa.

### Auditoría del Centro de Control Operativo

- Objetivo: auditar el Centro de Control antes de conectar operaciones reales.
- Clasificación: auditoría únicamente.
- Sin cambios funcionales registrados como Fase 7A.
- Sin migración propia.
- Sin commit funcional independiente identificado.

## Fase 7B

Estado: cerrada en producción.

### Disponibilidad y Reservaciones

- Commit funcional: `91ee60a feat: connect availability and reservations operations`.
- Commit documental: `9b87bba docs: close phase 7b production validation`.
- Migración aplicada: `024_reservation_operations.sql`.
- Backend:
  - `/api/admin/availability`
  - `/api/admin/availability/calendar`
  - `/api/admin/availability/slots`
  - `/api/admin/reservations`
  - `/api/admin/reservations/:id`
  - `/api/admin/reservations/export`
- RPC operativas:
  - `create_experience_slot`
  - `update_experience_slot`
  - `block_experience_slot`
  - `unblock_experience_slot`
  - `create_reservation_admin`
  - `confirm_reservation`
  - `cancel_reservation`
  - `reschedule_reservation`
  - `update_reservation_people`
- Frontend:
  - `/control/disponibilidad`
  - `/control/reservaciones`
- Validación:
  - Admin `super_admin`: lectura y escritura operativa aprobadas.
  - Customer: 403.
  - Sin sesión: 401.
  - QA temporal `QA_FASE7B_` creado y limpiado.
- Pruebas históricas:
  - Frontend: 44/44.
  - Backend: 38/38.
  - Builds exitosos.
  - Railway OK.
  - Netlify desplegado correctamente.

## Fase 7C

Estado: cerrada en producción.

### Clientes y CRM Real

- Commit funcional: `f3c7371 feat: connect customer crm operations`.
- Commit documental: `1220a43 docs: close phase 7c production validation`.
- Migración aplicada: `025_customer_crm_operations.sql`.
- Backend:
  - `/api/admin/customers`
  - `/api/admin/customers/:id`
  - `/api/admin/customer-tags`
  - `/api/admin/customers/export`
- Frontend:
  - `/control/clientes`
- Reglas:
  - Cliente CRM puede existir sin usuario Auth.
  - Usuario Auth `customer` puede vincularse a `customers`.
  - El CRM administrativo no crea usuarios Auth automáticamente.
- Validación:
  - Admin aprobado.
  - Customer bloqueado con 403.
  - Sin sesión bloqueado con 401.
  - QA temporal `QA_FASE7C_` creado y limpiado.
- Pruebas históricas:
  - Frontend: 48/48.
  - Backend: 47/47.
  - Builds exitosos.
  - Railway OK.
  - Netlify desplegado correctamente.

## Fase 7D

Estado: cerrada en producción.

### Órdenes, Pagos Administrativos, QR y Check-In

- Commit funcional: `c1d8eca feat: connect orders payments and checkin operations`.
- Migración aplicada: `026_order_payment_checkin_operations.sql`.
- No se encontró commit documental histórico separado de cierre 7D; no se inventa.
- Backend:
  - `/api/admin/orders`
  - `/api/admin/payments`
  - `/api/admin/access-passes`
  - `/api/admin/checkins`
  - exportaciones administrativas de órdenes, pagos y check-in
- RPC y operaciones:
  - creación de órdenes administrativas
  - actualización de estado de órdenes
  - pago administrativo manual
  - reembolso
  - webhooks preparados
  - emisión de QR
  - access passes
  - validación de access pass
  - check-in
  - bloqueo de doble check-in con 409
  - reversión de check-in
  - revocación de pase
- Frontend:
  - `/control/ordenes`
  - `/control/pagos`
  - `/control/check-in`
  - `src/services/commerce.service.ts`
  - `src/app/pages/control/OrdersPage.tsx`
  - `src/app/pages/control/PaymentsPage.tsx`
  - `src/app/pages/control/CheckInPage.tsx`
- Runner real:
  - `backend/scripts/phase7d-real-check.mjs`
  - QA temporal `QA_FASE7D_` creado y limpiado durante validación.
- Pruebas históricas reportadas para Fase 7D:
  - Frontend: 53/53.
  - Backend: 53/53.
- Deploy:
  - Railway OK.
  - Netlify desplegado correctamente.
  - Rutas `/control/ordenes`, `/control/pagos` y `/control/check-in` responden en producción.
- Seguridad:
  - No se imprimieron tokens, JWT, service role key, headers sensibles ni variables de entorno.

## Fase 7E

Estado: cerrada en producción.

### Wine Club, Inventario, Logística y Distribuidores

- Commit funcional: `f9209a5 feat: connect wine club inventory logistics and distributors`.
- Commit documental: `18f58d5 docs: close phase 7e production validation`.
- Migración aplicada: `027_wineclub_inventory_logistics_distributors.sql`.
- Migración reaplicada sin efectos destructivos para validar idempotencia.
- Backend real activo para:
  - Wine Club: `/api/admin/memberships`
  - inventario: `/api/admin/inventory`
  - logística: `/api/admin/shipments`
  - distribuidores: `/api/admin/distributors`
  - órdenes de distribuidores: `/api/admin/distributor-orders`
- Frontend productivo:
  - `/control/wine-club`
  - `/control/inventario`
  - `/control/logistica`
  - `/control/distribuidores`
- Validación productiva:
  - Runner real productivo aprobado.
  - Admin autorizado.
  - Customer bloqueado con 403.
  - Sin sesión bloqueado con 401.
  - Datos temporales `QA_FASE7E_` creados y eliminados.
  - No quedaron mutaciones QA permanentes.
- Pruebas:
  - Frontend: 58/58.
  - Backend: 61/61.
  - Frontend build: exitoso.
  - Backend build: exitoso.
  - Lint: exitoso con warnings preexistentes.
- Railway:
  - `/api/health` HTTP 200.
  - Supabase `configured: true`.
  - Supabase `reachable: true`.
  - Supabase `healthy: true`.
  - Supabase `status: ok`.
- Netlify:
  - raíz HTTP 200.
  - rutas 7E HTTP 200.
  - bundle `index-BJV4wwsd.js`.
- Documentación actualizada:
  - `PROJECT_STATUS.md`
  - `backend/docs/OPERATIONS.md`
- Seguridad:
  - No se imprimieron secretos, JWT, tokens, service role key, headers sensibles ni variables.
- Fase 7F no iniciada.

## Fase 8A

Estado: auditoría aprobada.

### Auditoría Completa de App Cliente

- Objetivo: auditar la app cliente antes de conectar flujos transaccionales reales.
- Clasificación: auditoría previa.
- Sin commit funcional independiente identificado.
- Hallazgos que guiaron Fase 8B:
  - `/app/*` y `/control/*` permanecían separados.
  - La app cliente consumía contenido editorial real solo parcialmente.
  - Los flujos customer de perfil, reservaciones y Wine Club requerían endpoints propios.
  - La app cliente no debía consumir `/api/admin/*`.
  - Los mocks visibles críticos debían eliminarse o convertirse en estados honestos.
- No se inició Fase 8B hasta completar esta revisión.

## Fase 8B

Estado: aprobada en producción.

### App Cliente Conectada Base

- Commit funcional: `5dd39b7 feat: connect customer app base flows`.
- Migración aplicada: `028_customer_app_operations.sql`.
- Migración idempotente, no destructiva y sin `DROP`, `TRUNCATE` ni `DELETE`.
- RLS auditado para:
  - `customers`
  - `profiles`
  - `user_preferences`
  - `reservations`
  - `reservation_guests`
  - `reservation_status_history`
  - `experience_slots`
  - `experience_blockouts`
  - `membership_plans`
  - `memberships`
  - `membership_benefits`
  - `loyalty_transactions`
  - contenido público editorial
  - `audit_logs`
- Policies nuevas o confirmadas:
  - lectura propia de beneficios de membresía customer.
  - lectura propia de transacciones de lealtad customer.
  - lectura, creación y operación de reservaciones propias mediante RPC seguras.
- RPC customer:
  - `get_customer_profile`
  - `update_customer_profile`
  - `get_bookable_experience_slots`
  - `create_customer_reservation`
  - `cancel_customer_reservation`
  - `reschedule_customer_reservation`
  - `get_customer_reservations`
  - `get_customer_membership`
  - `get_customer_loyalty_summary`
- Backend customer:
  - `backend/src/modules/customer/`
  - `GET /api/customer/me`
  - `PATCH /api/customer/me`
  - `GET /api/customer/availability`
  - `GET /api/customer/availability/:experienceId`
  - `GET /api/customer/reservations`
  - `GET /api/customer/reservations/:id`
  - `POST /api/customer/reservations`
  - `POST /api/customer/reservations/:id/cancel`
  - `POST /api/customer/reservations/:id/reschedule`
  - `GET /api/customer/membership`
  - `GET /api/customer/membership/benefits`
  - `GET /api/customer/membership/loyalty`
  - `GET /api/customer/membership/history`
- Seguridad backend:
  - `customer_id` se deriva en backend y RPC; no se acepta desde frontend como autoridad.
  - Precios, cupo, estado y número de reserva se derivan en servidor.
  - Endpoints customer requieren sesión.
  - Customer recibe 403 en endpoints administrativos.
  - Sin sesión recibe 401.
  - No se expone service role a frontend.
  - No se imprimieron JWT, tokens, service role key, headers sensibles ni variables.
- Auth customer:
  - `/app/login`
  - `/app/registro`
  - `/app/recuperar`
  - `/app/reset-password`
  - `/app/auth/callback`
  - compatibilidad temporal conservada con rutas públicas raíz de autenticación.
- App cliente conectada:
  - `/app/home`: vinos, experiencias, eventos, promociones y planes publicados reales.
  - `/app/tienda`: vinos publicados reales, búsqueda, filtros y orden.
  - `/app/tienda/:wineId`: detalle real de vino.
  - `/app/experiencias`: experiencias publicadas reales.
  - `/app/experiencias/:experienceId`: detalle real con disponibilidad customer cuando aplica.
  - `/app/eventos`: eventos publicados reales.
  - `/app/eventos/:eventId`: detalle real de evento.
  - `/app/reservacion`: disponibilidad, creación, cancelación y reprogramación customer.
  - `/app/club`: planes reales, membresía propia, beneficios y lealtad.
  - `/app/perfil`: perfil propio, preferencias, reservaciones, membresía y puntos reales.
  - `/app/mapa`: Mapbox real configurable, sin distancias ni rutas falsas.
  - `/app/sommelier`: estado temporal honesto; no simula conversación OpenAI.
  - `/app/carrito`: estado temporal honesto; no simula checkout ni pago.
- Idioma:
  - locale estructural preparado.
  - español por defecto.
  - fallback a español para contenido editorial.
  - preferencia customer preparada desde perfil.
- Mocks visibles:
  - eliminadas métricas críticas inventadas de reservaciones, carrito, pagos, puntos, membresía, pedidos, reseñas, ratings, rutas GPS y respuestas IA.
  - los mocks permanecen permitidos únicamente en archivos de prueba.
- Runner real:
  - `backend/scripts/phase8b-real-check.mjs`.
  - Validación local aprobada contra Supabase real.
  - Validación productiva aprobada contra Railway.
  - Admin autorizado.
  - Customer temporal `QA_FASE8B_` creado por flujo seguro, usado y eliminado.
  - Customer bloqueado de admin con 403.
  - Sin sesión bloqueada con 401.
  - Reserva creada, reprogramada y cancelada.
  - Auditoría confirmada.
  - Datos temporales limpiados.
- Pruebas:
  - Frontend: 62/62.
  - Backend: 68/68.
  - Frontend build: exitoso.
  - Backend build: exitoso.
  - Lint: exitoso con warnings preexistentes.
  - `git diff --check`: exitoso.
  - `.env`, `.env.local`, `backend/.env` y `backend/.env.local` ignorados.
- Railway:
  - `/api/health` HTTP 200.
  - Supabase `configured: true`.
  - Supabase `reachable: true`.
  - Supabase `healthy: true`.
  - Supabase `status: ok`.
  - Endpoints customer reales desplegados.
- Netlify:
  - raíz y rutas `/app/*` de Fase 8B responden HTTP 200.
  - bundle desplegado: `index-C-XNEYfq.js`.
  - rutas de detalle validadas con slugs publicados reales.
  - No se detectó reemplazo del Centro de Control.
- Documentación:
  - `PROJECT_STATUS.md`.
  - `backend/docs/OPERATIONS.md`.
  - `backend/docs/CUSTOMER_APP.md`.
- Fase 8C inició después de este cierre.

## Fase 8C

Estado: aprobada en producción.

### Carrito, Orden y Checkout Base

- Commit funcional: `1dab2b1 feat: connect customer cart and checkout base`.
- Commit documental: `docs: close phase 8c cart and checkout base`.
- Migración aplicada: `029_customer_cart_checkout.sql`.
- Migración idempotente, no destructiva, sin `DROP`, sin `TRUNCATE`, sin tocar `auth.users` directamente, sin correos hardcodeados y sin secretos.
- Modelo real:
  - carrito persistente por customer.
  - un carrito activo por customer.
  - items de carrito.
  - snapshots de precio, nombre, SKU y moneda.
  - totales calculados en backend.
  - descuentos validados en backend cuando existe código elegible.
  - orden customer real con estado `pending_payment`.
  - historial de órdenes propias.
  - checkout base sin cobro real.
- Policies y RLS:
  - `carts_customer_select`.
  - `carts_customer_insert`.
  - `carts_customer_update`.
  - `cart_items_customer_select`.
  - `cart_items_customer_insert`.
  - `cart_items_customer_update`.
  - `cart_items_customer_delete`.
  - lectura propia de órdenes y partidas ya conservada.
- RPC customer:
  - `get_active_customer_cart_id`.
  - `resolve_customer_cart_item`.
  - `calculate_customer_cart_totals`.
  - `get_customer_cart`.
  - `add_customer_cart_item`.
  - `update_customer_cart_item`.
  - `remove_customer_cart_item`.
  - `clear_customer_cart`.
  - `create_customer_order_from_cart`.
  - `get_customer_orders`.
  - `get_customer_order_detail`.
- Backend customer:
  - `GET /api/customer/cart`.
  - `POST /api/customer/cart/items`.
  - `PATCH /api/customer/cart/items/:id`.
  - `DELETE /api/customer/cart/items/:id`.
  - `DELETE /api/customer/cart`.
  - `POST /api/customer/orders`.
  - `GET /api/customer/orders`.
  - `GET /api/customer/orders/:id`.
- Seguridad backend:
  - El frontend no envía ni controla precio, total ni `customer_id`.
  - El backend deriva customer desde sesión y RPC.
  - El backend revalida publicación, disponibilidad, stock, precio, descuentos e idempotencia.
  - `experience` queda fuera de carrito y conserva flujo de reservaciones.
  - `event_ticket` queda preparado por RPC para tickets publicados y vendibles.
  - La orden queda `pending_payment`; no se crea pago y no se marca `paid`.
  - Customer no ve órdenes ajenas.
  - Customer recibe 403 en endpoints administrativos.
  - Sin sesión recibe 401.
- App cliente conectada:
  - `/app/tienda`: agrega vinos publicados reales al carrito.
  - `/app/tienda/:wineId`: permite seleccionar cantidad y agregar al carrito real.
  - `/app/carrito`: lee carrito real, actualiza cantidades, elimina, vacía, persiste recarga y muestra totales backend.
  - `/app/checkout`: crea orden real `pending_payment` y comunica que el pago en línea estará disponible próximamente.
  - `/app/perfil`: muestra historial real de órdenes propias.
- Envío:
  - Fase 8C queda limitada a recolección en Hacienda.
  - No se inventan tarifas de envío ni envío gratis ficticio.
- Pagos:
  - No se implementó pasarela productiva.
  - No se solicitó tarjeta.
  - No se guardaron datos de pago.
  - No se simuló pago aprobado.
- Runner real:
  - `backend/scripts/phase8c-real-check.mjs`.
  - Validación local aprobada contra Supabase real.
  - Validación productiva aprobada contra Railway.
  - Customers temporales `QA_FASE8C_` creados por flujo seguro, usados y eliminados.
  - Vino publicado real usado como item de carrito.
  - Carrito creado, persistido y actualizado.
  - Payload manipulado con precio/customer rechazado con 422.
  - Orden creada con `pending_payment`.
  - Otro customer recibió 404 al consultar orden ajena.
  - Customer recibió 403 en admin.
  - Sin sesión recibió 401.
  - Auditoría confirmada.
  - No se creó pago.
  - Datos temporales limpiados.
- Pruebas:
  - Frontend: 65/65.
  - Backend: 74/74.
  - Frontend build: exitoso.
  - Backend build: exitoso.
  - Lint: exitoso con warnings preexistentes.
  - `git diff --check`: exitoso.
  - `.env`, `.env.local`, `backend/.env` y `backend/.env.local` ignorados.
- Railway:
  - `/api/health` HTTP 200.
  - Supabase `configured: true`.
  - Supabase `reachable: true`.
  - Supabase `healthy: true`.
  - Supabase `status: ok`.
  - Endpoints customer de carrito y órdenes desplegados.
- Netlify:
  - raíz HTTP 200.
  - `/app/tienda` HTTP 200.
  - `/app/vinos` HTTP 200.
  - `/app/carrito` HTTP 200.
  - `/app/checkout` HTTP 200.
  - `/app/perfil` HTTP 200.
  - `/control/vinos` HTTP 200; Centro de Control intacto.
  - bundle desplegado: `index-VU0eV1pM.js`.
  - Render headless de `/app/tienda` y `/app/carrito` generó DOM, sin pantalla blanca.
- Documentación:
  - `PROJECT_STATUS.md`.
  - `backend/docs/OPERATIONS.md`.
  - `backend/docs/CUSTOMER_APP.md`.
  - `backend/docs/CART_CHECKOUT.md`.
- Seguridad:
  - No se imprimieron secretos, JWT, tokens, service role key, headers sensibles ni variables.
- No se inició Fase 8D.

## Estado de Arquitectura

- `/app/*` monta `MobileShell`.
- `/control/*` monta `RoleRoute` + `ControlLayout`.
- `customer` no entra a `/control/*`.
- Centro de Control intacto.
- No hay wildcard que envíe `/control/*` a `/app/home`.
- `/app/*` y `/control/*` permanecen separados.
- `ControlLayout` no monta la app cliente.
- `MobileShell` no monta el Centro de Control.

## Pendientes V1

- Pago real.
- Pasarela productiva.
- Sommelier OpenAI.
- Resend.
- Firebase/push.
- Google/Apple.
- Bilingüe completo.
- Raíz institucional OS.
- Diseño premium.
- QA E2E.
- Tiendas.
- App cliente avanzada posterior a carrito y checkout base 8C.

## Roadmap Adicional Ya Implementado

- Inventario.
- Logística.
- Distribuidores.

Estos módulos fueron construidos y validados en Fase 7E aunque originalmente aparecían como fuera de V1 salvo autorización adicional.

## Deuda Técnica y Visual

- Mocks legacy/future todavía presentes en zonas no operativas o futuras.
- Dashboard con datos simulados.
- Páginas futuras pendientes de conexión final.
- Ausencia de E2E de navegador configurado.
- Estética todavía genérica en varias pantallas.
- Raíz aún implementada como `LandingPage`.
- No se deben confundir validaciones funcionales con cierre visual premium.
- Pagos productivos y Sommelier real siguen pendientes.

## Siguiente Fase

Fase 8D — Pendiente de definición y aprobación.
