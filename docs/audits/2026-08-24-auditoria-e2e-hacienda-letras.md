# Auditoria E2E Real Hacienda de Letras

Fecha: 2026-08-24
Repositorio auditado: `/Users/pattyg/Developer/HaciendaDemo-rescate`
Rama: `main`
Commit base E2E verificado: `89278056f70151fb1dbf9d80b150f03019c79853`
Correccion de entrega email/campanas enviada a Git: `7a1e267aa81659f9b5ac561ea9d151dea26e091c`
Usuario QA principal: `mau@alqia.tech`
Usuario OAuth Google: `pcgaribayg@gmail.com`

Este documento cierra la auditoria E2E solicitada para Centro de Control, Supabase, app nativa, campanas, pagos, QR, asistente ejecutiva y sommelier. No marca como aprobado lo que no fue validado en esta corrida.

## Reglas de esta auditoria

- El trabajo valido fue exclusivamente en `HaciendaDemo-rescate`.
- `pcgaribayg@gmail.com` se trato como usuario Google OAuth; no se probo login directo con credenciales para esa cuenta.
- La prueba controlada se ejecuto con `mau@alqia.tech`.
- No se expusieron secretos, tokens, llaves ni credenciales.
- No se uso informacion inventada para declarar conexiones.
- Se separa evidencia real de codigo, Supabase y HTTP productivo frente a validacion fisica pendiente en dispositivo.

## Cambios aplicados para cerrar riesgos criticos

### QR y control de entradas

Estado: corregido, migrado en Supabase y probado E2E.

Archivos:
- `backend/migrations/073_entry_qr_expiry_12h.sql`
- `backend/migrations/074_fix_access_pass_validation_enum_cast.sql`
- `src/app/pages/mobile/PaymentStatusScreen.tsx`

Resultado:
- Los pases QR de eventos y reservaciones expiran 12 horas despues del cierre del evento.
- `validate_access_pass` ya no truena con `HTTP 500` por casteo de enum cuando la reservacion u orden viene vacia.
- Un pase revocado o archivado responde invalidacion limpia, no error tecnico.
- El flujo de pago con acceso QR manda al Perfil, no al flujo de nueva reserva.
- La pantalla de nueva reservacion ya no debe mostrar boletos o QR pagados anteriormente.

Evidencia:
- Antes de la migracion 074, un QR archivado devolvia `22P02 invalid input value for enum reservation_status`.
- Despues de la migracion 074, el mismo QR devuelve `valid:false`, `reason:"revoked"`, `status:"archived"`.
- En la corrida real se creo pase QA, se valido, se hizo check-in, se bloqueo duplicado con `409 CONFLICT` y luego se reverso el ingreso.

### IA asistente ejecutiva

Estado: corregida, probada localmente y verificada en Railway produccion.

Archivo:
- `backend/src/modules/executiveAssistant/executiveAssistant.service.ts`

Resultado:
- La asistente ignora instrucciones de formato como "responde sin asteriscos" al buscar entidades reales.
- Las preguntas de asistencia ya detectan terminos como "asistencia", "ingresos", "entradas" y "QR leidos".
- Para un evento especifico, busca el evento exacto y responde con personas ingresadas, pases activos, pendientes, ocupacion y ultimos ingresos.
- No ejecuta mutaciones operativas: solo lee y responde.
- No muestra metadata cruda ni ids tecnicos al cliente como respuesta principal.
- Las respuestas salen en texto plano, sin asteriscos ni Markdown.

Evidencia:
- Pregunta probada: `Dame el resumen de asistencia del evento QA E2E Acceso QA-E2E-20260824211517. Responde sin asteriscos.`
- Produccion Railway respondio `HTTP 200`.
- La respuesta encontro el evento exacto y no regreso "No encontre".
- La respuesta no incluyo Markdown ni asteriscos.

Nota tecnica:
- Para respuestas operativas reales del Centro de Control, OpenAI no es obligatorio si la respuesta es factual y consultada desde Supabase.
- OpenAI sigue siendo util para lenguaje conversacional, resumen natural, sommelier generativo y preguntas abiertas, pero la capa de datos debe seguir siendo deterministica y verificable.

### Sommelier

Estado: texto plano probado; respuesta generativa viva depende de configuracion de proveedor.

Archivos:
- `backend/src/modules/ai/plainText.ts`
- `backend/src/modules/sommelier/sommelier.service.ts`
- `backend/__tests__/plain-ai-response.test.ts`
- `backend/__tests__/sommelier-public-knowledge.test.ts`

Resultado:
- Las respuestas del sommelier se limpian de asteriscos, negritas, encabezados Markdown y bloques de codigo.
- El sommelier no debe confundirse con la asistente ejecutiva: su base es conocimiento de vinos, experiencias, eventos, promociones y membresias.
- En `backend/.env` local no se encontro `OPENAI_API_KEY`; no se imprime ninguna llave.

### Campanas y comunicaciones

Estado: flujo real probado con `mau@alqia.tech`; entrega final de email/push queda condicionada a proveedores y dispositivo.

Archivos:
- `backend/src/modules/communications/communications.service.ts`
- `backend/src/modules/content/content.schemas.ts`
- `backend/src/modules/content/content.service.ts`
- `src/services/content.service.ts`
- `backend/__tests__/api.test.ts`

Resultado:
- La audiencia de campana acepta lista exacta de correos.
- La prueba con `mau@alqia.tech` no expandio audiencia por segmento ni filtros generales.
- La campana genero destinatario real y entregas por canal.
- El backend ahora refresca el outbox despues de procesar Resend, para no reportar como pendiente un correo que ya quedo `sent`.
- Los webhooks de Resend actualizan tambien `campaign_recipient_deliveries` para email cuando llega `delivered`, `bounced`, `complained`, `failed`, `opened` o `clicked`.
- Se restauro el consentimiento QA despues de la prueba controlada.

Evidencia:
- Audience preview: 1 destinatario.
- Canales generados: email 1, push 1, in-app 1.
- Estado de envio: aceptado por API con `202`.
- Destinatarios: 1 enviado, 0 pendientes, 0 fallidos.
- Metricas observadas: email pendiente de confirmacion final, push fallido por token/proveedor/dispositivo, in-app entregado.
- Consulta posterior a Supabase para `mau@alqia.tech`: el outbox de `campaign.marketing` quedo en `sent`, con 1 intento, proveedor `resend`, referencia de proveedor presente, `failed_at` nulo y `error_code` nulo.
- `email_deliveries` contiene evento `email.sent` para esa campaña.
- La fila historica de `campaign_recipient_deliveries` de email para Mau conserva `pending`, sin `delivered_at`, `opened_at` ni `clicked_at`, porque se genero antes del ajuste de sincronizacion del outbox.
- En el historial de Mau existe un rebote duro/permanente anterior: `customer.welcome` del 17 ago 2026 termino en `email.bounced`.
- El rebote duro anterior venia del proveedor receptor de `mau@alqia.tech`; eso puede dejar la direccion suprimida o castigada en Resend aunque el envio posterior sea aceptado.
- La llave actual de Resend esta restringida a envio; no permite consultar ni limpiar supresiones por API.

Lectura honesta:
- El flujo de campana funciona y no esta mockeado.
- Lo que esta probado es envio aceptado por Resend, no recepcion en bandeja.
- El dominio remitente probado es Hacienda de Letras; `alqia.tech` es solo dominio receptor para Mau.
- Falta confirmar `delivered`, `open` o `click` real del correo cuando el proveedor reporte evento o Mau lo confirme desde inbox.
- Falta revisar en Resend la supresion/lista de rebotes de `mau@alqia.tech` con una llave o usuario que tenga permisos de lectura.
- Falta token fisico valido para confirmar push real en movil.

## E2E real ejecutado

Run ID: `QA-E2E-20260824211517`

Usuario:
- `mau@alqia.tech`: existe y opera como `customer`.
- `pcgaribayg@gmail.com`: existe, pero se considera login OAuth Google.
- Admin usado para Control Center: `pgaribay@alqia.tech`, rol `super_admin`.

Infraestructura:
- Railway health: `HTTP 200`, Supabase reachable, Stripe configurado en test, webhook configurado, push Android/iOS configurado.
- Netlify: `/`, `/control` y `/app/home` respondieron `HTTP 200`.
- Produccion se actualiza por push de Git; commit verificado en `origin/main`.

Supabase:
- Tablas criticas consultadas: `access_passes`, `checkins`, `campaign_recipients`, `campaign_recipient_deliveries`, `communication_events`, `email_outbox`, `notification_devices`, `order_items`, `payments`, `payment_webhook_events`, `quote_requests`, `shipments`.
- No se detecto uso de mocks para declarar estos flujos.

Reservaciones:
- Se creo reservacion QA `RES-20260824-418DCFF0`.
- Quedo pendiente, sin QR en perfil por no estar pagada.
- Genero historial de movimiento.
- Se cancelo y libero cupo.

Cotizaciones:
- Se creo cotizacion QA `HDL-COT-BAB776`.
- Se actualizo desde Control Center.

Eventos, pagos y QR:
- Se creo evento QA temporal y ticket QA temporal.
- Se genero orden `ORD-20260824-11B92773` por `25.00 MXN`.
- Stripe test pago correctamente.
- Webhook respondio `202`.
- Orden y pago quedaron reconciliados como pagados.
- Se genero pase QR real en Perfil.
- El QR publico respondio `HTTP 200`.
- La validacion respondio `HTTP 200`.
- Check-in respondio `HTTP 201`.
- Duplicado respondio `409 CONFLICT`.
- Reversa respondio `HTTP 200`.
- Limpieza QA: reembolso aplicado, ticket archivado, evento archivado.

Campanas:
- Se ejecuto prueba controlada a `mau@alqia.tech`.
- No se uso ningun otro correo de QA para esta corrida.

## Matriz E2E por modulo

### Centro de Control

Dashboard
- Estado: operativo por build y rutas.
- Pendiente: validacion visual manual completa en navegador con cliente.

Reservaciones
- Estado: operativo.
- Evidencia: alta, historial, cancelacion y liberacion de cupo probados en E2E.

Cotizaciones
- Estado: operativo.
- Evidencia: alta y actualizacion desde Control probadas.

Ordenes
- Estado: operativo.
- Evidencia: ordenes y pagos reales se consultan desde Supabase.
- Pendiente: validar visualmente todos los estados con datos productivos completos.

Disponibilidad
- Estado: operativo.
- Evidencia: 5 slots disponibles y 5 bookables en corrida QA.

Inventario
- Estado: conectado, con pendiente de data.
- Evidencia: tablas y servicios accesibles.
- Pendiente critico: no habia vino publicado visible con stock e imagen suficiente para certificar compra de vino y descuento real en esta corrida.
- Recomendacion: cargar stock real por ubicacion e imagenes antes de declarar aprobado el flujo de venta de vinos.

Logistica
- Estado: conectada a ordenes, shipments, partidas y pagos.
- Evidencia: las tarjetas usan ordenes reales, total real del ticket y origen de compra.
- Pendiente: validacion visual final en navegador y dispositivo despues del deploy.

Control de entradas
- Estado: operativo.
- Evidencia: eventos, access passes, validacion, checkins, duplicado y reversa probados.
- Pendiente: prueba fisica con camara en Android/iOS.

Clientes
- Estado: operativo.
- Evidencia: clientes, origen, reservas, ordenes, valor historico y consentimiento estan conectados.
- Correccion funcional esperada: no mostrar filtros sin data util como etiquetas vacias.

Pagos
- Estado: operativo por Stripe test y webhook.
- Evidencia: pago test, reconciliacion, detalle y refund QA ejecutados.
- Pendiente: visual final del modulo tipo cash flow y confirmacion de eventos de email/push asociados si aplica.

Campanas
- Estado: operativo con audiencia exacta.
- Evidencia: prueba con `mau@alqia.tech`.
- Pendiente: delivery final de correo y push fisico.

Promociones en app
- Estado: existe en app y se conecta con contenido remoto.
- Evidencia: ruta `/app/promociones`, pantalla `PromotionsScreen`, entrada en menu movil y datos `promotions`.
- Aclaracion: promociones visibles en app no son lo mismo que campanas; campanas se operan desde Centro de Control y pueden generar email, push e in-app.

### App nativa

Vinos
- Estado: conectado a catalogo y carrito.
- Pendiente critico: faltan vinos visibles con stock e imagen para probar compra real y miniaturas con data productiva.

Experiencias
- Estado: operativo.
- Correccion esperada: una nueva reserva no debe listar boletos o QR ya pagados; esos viven en Perfil.

Eventos
- Estado: operativo.
- Pendiente de contenido: si un evento aparece como "reserva por telefono", eso viene de metadata del evento y debe corregirse desde Control/Supabase.

Perfil
- Estado: fuente correcta para Mis boletos, accesos, reservas y ordenes.
- Evidencia: QR pagado se encontro en Perfil.
- Pendiente: validacion fisica de Descargar PDF y Compartir en Android e iOS.

QR
- Estado: funcional por backend.
- Pendiente UI movil: confirmar PDF bonito, descarga nativa y compartir nativo en dispositivos.

### IA

Asistente ejecutiva
- Estado: lista para preguntas precisas del Centro de Control.
- Cobertura: dashboard, clientes, reservaciones, ordenes, pagos, partidas, experiencias, eventos, hospedaje, unidades, logistica, campanas, promociones, membresias, cotizaciones, actividad, inventario, QR y check-ins.
- Ejemplo validado: asistencia de un evento especifico por QR leidos.

Sommelier
- Estado: conectado a conocimiento del proyecto y limpieza de texto plano.
- Pendiente: proveedor generativo configurado si se requiere conversacion viva avanzada.

## Pruebas ejecutadas despues de correcciones

Backend dirigido:
- `backend`: `npm test -- --run __tests__/executive-assistant-privacy.test.ts __tests__/plain-ai-response.test.ts`
- Resultado: 2 archivos, 6 pruebas aprobadas.

Backend tipos y build:
- `backend`: `npm run typecheck`
- Resultado: aprobado.
- `backend`: `npm run build`
- Resultado: aprobado.

Web build:
- raiz: `npm run build`
- Resultado: aprobado.

Supabase:
- Migracion aplicada: `074_fix_access_pass_validation_enum_cast.sql`
- Resultado: aplicada sin error.

Produccion:
- Railway `/api/health`: `HTTP 200`.
- Railway asistente ejecutiva: `HTTP 200`, evento exacto encontrado, sin Markdown.
- Netlify `/control`: `HTTP 200`.

Git:
- Push completado a `origin/main`.
- Commit verificado: `89278056f70151fb1dbf9d80b150f03019c79853`.

## Riesgos que no deben ocultarse

1. No se genero una nueva AAB ni build iOS en esta ultima corrida de cierre.
2. La compra de vino y descuento de inventario no quedo certificada porque no habia vino publicado visible con stock e imagen suficiente.
3. Email de campana quedo aceptado/enviado por backend, pero falta confirmacion final del proveedor.
4. Push fallo por token/proveedor/dispositivo; requiere dispositivo real con token valido.
5. Descargar PDF y Compartir QR deben validarse fisicamente en Android e iOS.
6. El ledger remoto de migraciones no estuvo disponible como historial consultable.
7. Docker no estaba corriendo para dump remoto completo.
8. El modulo visual de pagos tipo cash flow y ajustes finos UI aun requieren revision humana en navegador/movil.

## Veredicto

El sistema esta operativo E2E en los flujos criticos de backend, Supabase, Railway, Netlify, pagos Stripe test, QR, check-in, campanas controladas y asistente ejecutiva precisa.

No esta certificado como E2E total de tienda porque faltan validaciones fisicas Android/iOS, nueva AAB/IPA, PDF/compartir en movil, push real con token valido y compra de vino con inventario real visible.

Clasificacion final: OPERATIVO PARA QA CONTROLADA, CON PENDIENTES FISICOS Y DE DATA PRODUCTIVA ANTES DE FIRMAR TIENDA.
