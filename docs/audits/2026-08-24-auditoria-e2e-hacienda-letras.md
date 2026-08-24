# Auditoria E2E Real Hacienda de Letras

Fecha: 2026-08-24
Repositorio auditado: `/Users/pattyg/Developer/HaciendaDemo-rescate`
Rama: `main`
Base local al iniciar: `95fbbb9ac949055681cd936e51d9ddb7507f5124`

Este documento responde la solicitud de auditoria de punta a punta del Centro de Control, Supabase y app nativa. No marca como aprobado lo que no fue validado en esta corrida.

## Reglas de esta auditoria

- No se modifico produccion de Supabase.
- No se ejecutaron cobros reales de Stripe.
- No se enviaron campanas masivas.
- No se expusieron secretos ni llaves.
- No se uso informacion inventada para declarar conexiones.
- Donde hubo evidencia por codigo, prueba local y Supabase remoto, se separa de validacion fisica en dispositivo.

## Cambios aplicados para cerrar riesgos criticos

### IA Asistente y Sommelier sin Markdown

Estado: corregido y probado localmente.

Archivos:
- `backend/src/modules/ai/plainText.ts`
- `backend/src/modules/executiveAssistant/executiveAssistant.service.ts`
- `backend/src/modules/sommelier/sommelier.service.ts`
- `src/app/components/control/ExecutiveAssistant.tsx`
- `backend/__tests__/plain-ai-response.test.ts`
- `backend/__tests__/executive-assistant-privacy.test.ts`
- `backend/__tests__/sommelier-public-knowledge.test.ts`

Resultado:
- Las respuestas se fuerzan a texto plano.
- Se limpian asteriscos, negritas, encabezados Markdown, bloques de codigo y fences.
- La limpieza ocurre en backend y tambien en el componente del Centro de Control.
- La asistente mantiene lectura real y no ejecuta mutaciones operativas.

Riesgo restante:
- En `backend/.env` no esta configurada `OPENAI_API_KEY`. Sin esa llave, Sommelier y realtime generativo no pueden responder en vivo con proveedor externo. La asistente conserva respuestas locales precisas cuando aplica.

### Campanas a correos exactos de QA

Estado: corregido y probado localmente, envio real pendiente por consentimiento.

Archivos:
- `backend/src/modules/content/content.schemas.ts`
- `backend/src/modules/content/content.service.ts`
- `src/services/content.service.ts`
- `backend/__tests__/api.test.ts`

Resultado:
- La audiencia de campana acepta una lista exacta de correos.
- La prueba valida que `pcgaribayg@gmail.com` y `mav@alqia.tech` no expanden audiencia por segmento, origen o filtros generales.
- La entrega queda preparada para pruebas controladas sin mandar a mas clientes.

Evidencia Supabase:
- `pcgaribayg@gmail.com`: cliente existe, usuario existe, consentimiento email marketing en falso.
- `mav@alqia.tech`: cliente existe, usuario existe, consentimiento email marketing en falso.

Decision correcta:
- No se envio campana real a esas cuentas porque no tienen consentimiento de marketing activo. Forzar el envio romperia la logica de consentimiento.

### QR y boletos movidos a Perfil

Estado: corregido y probado localmente.

Archivo:
- `src/app/pages/mobile/PaymentStatusScreen.tsx`

Resultado:
- Al pagar una compra con acceso QR, el boton ya lleva a `Perfil` en `#accesses`, no al flujo de nueva reserva.
- La pantalla de nueva reservacion no debe mostrar boletos o QR previos.
- Los boletos y reservaciones pagadas viven en Perfil, que es donde se acumula el historial real del usuario.

Evidencia Supabase para QA:
- Hay 2 reservaciones, 3 ordenes, 4 pases QR, 3 pases activos y 0 usados para los correos QA consultados.
- Los QR vistos en perfil existen en Supabase para el usuario QA; no son mock.
- Un pase de vino estaba archivado y no debe operar como entrada vigente.

## Inventario tecnico validado

### Migraciones y Supabase

Estado: conectado por objetos criticos, ledger de migraciones pendiente.

Evidencia:
- Migraciones locales en `backend/migrations`: 73 archivos, de `001_system_health.sql` a `073_entry_qr_expiry_12h.sql`.
- Supabase remoto publico:
  - 93 tablas.
  - 465 funciones.
  - 186 triggers.
  - 197 policies.
  - 93 tablas con RLS activo.
  - Buckets presentes: `avatars`, `documents`, `events`, `experiences`, `wines`.
- Revision de tablas, funciones y buckets criticos usados por el codigo: sin faltantes en la comprobacion final.

Bloqueo:
- `supabase_migrations` no aparece como ledger remoto consultable.
- `supabase db dump --linked` no se pudo ejecutar porque Docker no estaba corriendo.

Lectura honesta:
- El esquema remoto tiene los objetos criticos, pero no puedo afirmar migracion por migracion aplicada desde ledger porque ese historial no esta disponible en esta corrida.

### Configuracion

Estado: parcial.

Detectado:
- Supabase frontend y backend configurados.
- Resend configurado en backend.
- Stripe configurado en backend.
- Firebase configurado en frontend.
- Mapbox configurado en frontend.
- `OPENAI_API_KEY` ausente en backend.

Impacto:
- IA generativa externa queda pendiente hasta configurar la llave.
- Envio real de correos depende de consentimiento y de prueba controlada de Resend.
- Push real requiere validacion fisica con dispositivos.

## Matriz E2E por modulo

### Centro de Control

Dashboard
- Estado: probado por build y rutas.
- Riesgo: no se hizo validacion visual completa en navegador real durante esta corrida.

Reservaciones
- Estado: probado localmente por suite.
- Conexion: frontend, backend, Supabase y pagos enlazados por servicios.
- Riesgo: no se ejecuto nueva reservacion pagada real en dispositivo.

Cotizaciones
- Estado: cubierto por backend y rutas de control.
- Riesgo: no se envio cotizacion real al cliente en esta corrida.

Ordenes
- Estado: probado localmente.
- Conexion: ordenes, pagos, partidas, folios, estados y acceso a detalle.
- Riesgo: no se valido manualmente cada estado visual en navegador despues de esta auditoria.

Disponibilidad
- Estado: probado localmente.
- Conexion: horarios, slots, reservaciones y contenido publico.
- Riesgo: validacion manual pendiente en Android e iOS.

Inventario
- Estado: conectado a tablas y servicios.
- Evidencia: tablas criticas presentes y pruebas locales limpias.
- Riesgo: prueba fisica pendiente de compra real que descuente inventario por ubicacion.

Logistica
- Estado: conectado por codigo a ordenes, shipments, partidas y pagos.
- Evidencia: la app y Centro leen ordenes reales, no mock.
- Riesgo: validacion visual y filtros en navegador pendiente fuera de esta corrida.

Control de entradas
- Estado: conectado a eventos, reservaciones, access passes y checkins.
- Evidencia: QR expira con ventana del evento mas 12 horas y hay pruebas locales.
- Riesgo: prueba fisica de escaneo QR con telefono pendiente.

Clientes
- Estado: conectado a customers, reservaciones, ordenes, membresias e historial.
- Evidencia: filtros de origen, segmento y consentimiento existen; etiquetas sin data util deben mantenerse fuera si no hay datos.
- Riesgo: campanas dependen de consentimiento real.

Pagos
- Estado: conectado a payments, orders y Stripe.
- Evidencia: builds y tests pasan; detalle de transaccion debe abrir con origen, hora, compra, canal y proveedor.
- Riesgo: no se hizo cobro real ni webhook real en esta corrida.

Carritos
- Estado: probado por flujo de checkout local.
- Riesgo: prueba real en dispositivo pendiente.

Wine Club
- Estado: rutas y membresias conectadas.
- Riesgo: alta de membresia real no ejecutada.

Distribuidores
- Estado: rutas presentes.
- Riesgo: no fue flujo principal de esta auditoria, requiere prueba operativa separada.

Reportes
- Estado: rutas presentes.
- Riesgo: no se compararon reportes con cortes contables reales.

Usuarios y permisos
- Estado: permisos y roles existen.
- Evidencia: pruebas backend validan 401, 403 y permisos.
- Riesgo: no se probo cada rol con login manual real.

### App nativa

Vinos
- Estado: conectado a contenido publico y carrito.
- Evidencia: rutas, imagenes y compra existen en codigo.
- Riesgo: validar en Android e iOS que filtros, titulos, margenes y cards queden visualmente correctos.

Experiencias
- Estado: conectado a contenido, horarios, checkout y perfil.
- Correccion: QR de reservas pagadas ya no se debe inyectar en nueva reserva.
- Riesgo: prueba fisica de nueva compra pendiente.

Eventos
- Estado: conectado a eventos, boletos y checkout.
- Riesgo: validar que el evento Salsa use el modo correcto de reserva segun su metadata real. Si Supabase lo trae como telefono, la app lo muestra como telefono; el origen debe corregirse en el contenido del evento.

Restaurantes
- Estado: conectado como reserva separada.
- Riesgo: verificar que no se mezcle con eventos cuando el contenido corresponde a evento.

Perfil
- Estado: fuente correcta para Mis boletos, accesos, reservas y ordenes.
- Evidencia: botones QR viven en Perfil, con `AccessTicketSheet`.
- Riesgo: validar fisicamente PDF y compartir en Android e iOS.

Promociones
- Estado: si existe apartado visible en app.
- Evidencia: ruta `/app/promociones`, pantalla `PromotionsScreen`, entrada en menu lateral movil y contenido remoto de `promotions`.
- Aclaracion: las campanas no son contenido navegable del cliente; las campanas se operan desde Centro de Control y pueden crear email, push e in-app.

Sommelier
- Estado: conectado a base de conocimiento del proyecto, vinos, experiencias, eventos, promociones y membresias.
- Riesgo: `OPENAI_API_KEY` ausente en backend bloquea respuesta generativa viva.

### Campanas y comunicaciones

Email
- Estado: preparado y probado con audiencia exacta.
- Resend: configurado.
- Bloqueo: los dos correos QA no tienen consentimiento de email marketing activo.
- Siguiente paso seguro: activar consentimiento de QA o crear campana transaccional de prueba si el proceso lo permite.

Push
- Estado: arquitectura presente por Firebase y notificaciones.
- Bloqueo: usuarios QA no tienen consentimiento push activo y no se valido token fisico.

In-app
- Estado: backend crea registros de notificacion/campana.
- Riesgo: validar lectura en app con usuario QA.

Confirmacion de recepcion
- Estado: requiere prueba controlada de webhook/metricas.
- Evidencia parcial: existen `campaign_recipient_deliveries`, metricas de campana y endpoints de seguimiento.
- Pendiente: enviar a QA con consentimiento y confirmar delivered/open/click cuando aplique.

### IA Asistente ejecutiva

Estado: lectura real preparada, generativo externo pendiente por llave.

Capacidad validada por codigo:
- Lee dashboard, clientes, reservaciones, ordenes, pagos, partidas, experiencias, eventos, hospedaje, unidades, logistica, campanas, promociones, membresias, cotizaciones, actividad e inventario.
- Para preguntas precisas de evento usa busqueda local sobre Eventos, Experiencias, Reservaciones, Tipos de boleto, Pases QR y Check-ins.
- Ejemplo de pregunta cubierta por ruta local: "cuantas personas han ingresado al evento".
- Respuesta esperada: conteo de personas ingresadas por QR leido, pases activos, pendientes, ocupacion y ultimos ingresos.

Seguridad:
- Solo admins autorizados con acceso `executive_ai_access`.
- No crea, edita, confirma, cancela ni elimina registros.
- No expone payloads sensibles crudos.

Pendiente:
- Configurar `OPENAI_API_KEY` para respuestas generativas y realtime.

## Pruebas ejecutadas

Backend dirigido:
- `backend`: `npm test -- __tests__/plain-ai-response.test.ts __tests__/sommelier-public-knowledge.test.ts __tests__/executive-assistant-privacy.test.ts __tests__/api.test.ts`
- Resultado: 4 archivos, 130 pruebas aprobadas.

Backend completo:
- `backend`: `npm test`
- Resultado: 15 archivos, 172 pruebas aprobadas.

Backend tipos y build:
- `backend`: `npm run typecheck`
- Resultado: aprobado.
- `backend`: `npm run build`
- Resultado: aprobado.

Frontend dirigido:
- `npm test -- src/__tests__/mobile.booking-flow.test.ts src/__tests__/premium.mobile.experience.test.ts src/__tests__/mobile.runtime.content.test.ts src/__tests__/payment.status.reconciliation.test.ts`
- Resultado: 4 archivos, 44 pruebas aprobadas.

Frontend completo:
- `npm test`
- Resultado: 37 archivos, 183 pruebas aprobadas.

Web build:
- `npm run build:web`
- Resultado: aprobado.
- Advertencia no bloqueante: bundles grandes.

Mobile build:
- `npm run build:mobile`
- Resultado: aprobado tras ejecutar fuera del sandbox por bloqueo de escritura en `node_modules/.tmp`.
- Advertencia no bloqueante: bundles grandes.

## Riesgos que no deben ocultarse

1. La llave `OPENAI_API_KEY` no esta configurada en backend. Esto bloquea Sommelier vivo y realtime de IA.
2. Los usuarios QA no tienen consentimiento de marketing, por eso no se envio campana real.
3. El ledger remoto de migraciones no esta disponible, aunque el esquema remoto si contiene objetos criticos.
4. Docker no estaba corriendo y bloqueo el dump del esquema remoto.
5. No se hizo prueba fisica completa Android e iOS en esta corrida.
6. No se hizo cobro real de Stripe ni webhook real.
7. No se hizo push notification real con token fisico.
8. No se valido despliegue productivo web/backend contra commit actual.
9. No se genero AAB ni build iOS en esta corrida de auditoria.

## Veredicto

El proyecto esta conectado por codigo entre Centro de Control, Supabase y app en los flujos principales auditados. Las pruebas locales completas pasan en backend y frontend. Supabase remoto contiene los objetos criticos esperados.

No esta certificado como E2E productivo total porque faltan validaciones fisicas de dispositivo, envio real con consentimiento, push real, cobro/webhook real, deploy productivo y builds de tienda de esta corrida.

Clasificacion final: PARCIAL OPERATIVO CON BLOQUEOS EXTERNOS Y VALIDACION FISICA PENDIENTE.
