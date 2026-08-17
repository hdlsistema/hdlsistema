# Anexo comparativo funcional

## Propuesta autorizada vs. proyecto real Hacienda de Letras

**Documento de referencia:** Cotización Hacienda de Letras Plataforma Digital V1
**Proyecto verificado:** Centro de Control y aplicación móvil Hacienda de Letras
**Fecha del análisis:** 16 de agosto de 2026
**Periodo de validación:** 17 al 30 de agosto de 2026
**Fecha límite de publicación en tiendas:** 3 de septiembre de 2026
**Objeto del anexo:** comparar exclusivamente servicios, módulos y funciones. Este documento no analiza importes ni condiciones comerciales.

## 1. Resultado ejecutivo

El proyecto real conserva el alcance central ofrecido para la Versión 1.0 y lo amplía de forma importante.

- La propuesta contempló **10 módulos administrativos**; el Centro de Control real presenta **25 accesos funcionales organizados en Operación, Comercial, Contenido y Administración**.
- La propuesta contempló **12 pantallas para clientes**; la app real incorpora **más de 20 vistas y recorridos**, sin contar variantes de inicio de sesión, recuperación de cuenta o estados de pago.
- Inventario, Logística y Distribuidores fueron descritos como módulos futuros no incluidos. Actualmente existen como módulos conectados dentro del proyecto real.
- También se agregaron procesos que no estaban descritos como módulos independientes: órdenes, pagos, carritos, cotizaciones, servicios y sedes, hospedaje, Check-in, actividad de la app y eliminación de cuentas.
- La ampliación no es únicamente visual. Los módulos adicionales cuentan con pantallas, servicios de información y operaciones propias dentro del proyecto.

La conclusión correcta para presentar al cliente es:

> Hacienda de Letras recibió el núcleo funcional comprometido y una plataforma considerablemente más amplia, con herramientas adicionales para operar ventas, entregas, hospedaje, restaurantes, eventos, accesos, privacidad y seguimiento comercial desde un mismo entorno.

## 2. Significado de los estados utilizados

| Estado | Significado |
|---|---|
| **Entregado** | La función existe en el proyecto real y tiene un recorrido identificable. |
| **Entregado y ampliado** | Existe lo ofrecido y se agregaron capacidades relacionadas. |
| **Condicionado** | La función está desarrollada, pero necesita datos, una cuenta externa o una publicación central antes de probarla de punta a punta. |
| **Diferencia por cerrar** | Una parte específica de lo descrito en la propuesta no se observa completa en el recorrido actual y debe cerrarse o aclararse antes de la aceptación final. |

## 3. Centro de Control: propuesta vs. proyecto real

| Módulo ofrecido | Qué se ofreció | Qué existe en el proyecto real | Resultado |
|---|---|---|---|
| **Dashboard** | Indicadores de ventas, reservaciones, visitantes, ocupación, conversión, agenda y mapa. | Indicadores de clientes, reservaciones, cobros, órdenes pendientes, carritos, inicios de pago, sesiones de la app, ocupación, conversión, puntos publicados, próximos horarios, órdenes y reservaciones recientes. | **Entregado y ampliado.** El proyecto concentra más indicadores operativos de los descritos originalmente. |
| **Reservaciones** | Consulta, búsqueda, alta manual, descarga y gestión de estados. | Búsqueda, filtros, alta manual, descarga, confirmación, cancelación, cambio de fecha, cambio de personas, notas e historial. Atiende experiencias, restaurantes y cabañas. | **Entregado y ampliado.** Se agregaron distintos tipos de reservación y seguimiento detallado. |
| **Experiencias** | Catálogo, métricas, filtros y estados. | Catálogo editorial, publicación, visibilidad, imágenes, precios, duración, capacidad, estados, fechas de publicación, vista previa e historial de versiones. La ocupación se refleja en Disponibilidad y Dashboard. | **Entregado y ampliado.** |
| **Disponibilidad** | Horarios, cupos, bloqueos y cierre de espacios. | Creación y edición de horarios, cupo, precio, bloqueo, desbloqueo, cierres, duplicación de horarios, calendario y ocupación. También integra disponibilidad de hospedaje. | **Entregado y ampliado.** |
| **Eventos** | Calendario, ocupación, ingresos y publicación. | Catálogo, fechas, sedes, capacidad, publicación, visibilidad, imágenes y administración de tipos de boleto con precio, cupo y periodo de venta. | **Entregado y ampliado, condicionado por datos de prueba.** La conexión central de venta y QR está publicada; falta cargar un evento real para recorrerla. |
| **Clientes / CRM** | Perfiles, gasto, frecuencia, canal, Wine Club y segmentación. | Perfiles, búsqueda, historial, compras, reservaciones, membresías, gasto, notas, etiquetas, archivo, restauración y descarga. | **Entregado y ampliado.** |
| **Promociones** | Creación, audiencia, canales y seguimiento básico. | Creación, tipo de descuento, vigencia, límites, segmento, visibilidad y publicación en la app. La actividad comercial puede observarse en órdenes, carritos y Dashboard. | **Entregado.** El seguimiento especializado por promoción debe validarse como reporte antes del cierre final. |
| **Campañas** | Segmentos, Email, Push e In-App, sugerencias de ALQIA, historial y métricas. | Creación de campaña, audiencia por perfil y comportamiento, consentimiento, previsualización de destinatarios, contenido, programación y envío por correo con resultado de aceptados, pendientes y fallidos. | **Diferencia por cerrar.** Email y segmentación están desarrollados; el envío de campañas por Push e In-App, las sugerencias automáticas y las métricas completas de apertura, conversión e ingreso no se observan terminados en la misma pantalla. |
| **Configuración** | Administrador, español/inglés y preferencias. | Configuración administrativa, control de acceso inicial, preferencias y operación bilingüe español/inglés. | **Entregado.** |
| **Vista de la App** | Simulación navegable desde el Centro de Control. | Vista directa de la experiencia móvil y accesos hacia sus recorridos. | **Entregado.** |

## 4. Aplicación móvil: propuesta vs. proyecto real

| Pantalla ofrecida | Qué se ofreció | Qué existe en el proyecto real | Resultado |
|---|---|---|---|
| **Inicio** | Banner, accesos rápidos, vinos destacados y Sommelier. | Inicio editorial con accesos a vinos, experiencias, eventos, servicios, Wine Club, mapa y Sommelier. | **Entregado y ampliado.** |
| **Tienda de vinos** | Catálogo, búsqueda, filtros y detalle. | Catálogo público, búsqueda, filtros, precios, imágenes y acceso al detalle. | **Entregado.** |
| **Detalle de vino** | Ficha, precio, cantidad, temperatura, calificación y carrito. | Ficha editorial, fotografías, precio, información del vino, cantidad y agregado al carrito. | **Entregado.** |
| **Experiencias** | Categorías, duración, precio, capacidad y reserva. | Catálogo y pantalla adicional de detalle con galería, descripción, duración, precio, lugar, capacidad y horarios reales disponibles. | **Entregado y ampliado.** Se agregó una vista de detalle que no se contabilizaba por separado. |
| **Eventos** | Listado, categorías, información, boletos y QR. | Listado, detalle, fechas, sede, capacidad, tipos de boleto, carrito y sección de accesos QR. | **Entregado y conectado.** La prueba completa requiere cargar un evento futuro y sus boletos. |
| **Detalle de evento** | Fecha, horario, lugar, beneficios, precio y compra de boletos. | Detalle editorial, galería, fecha, hora, sede, precio, disponibilidad por tipo de boleto, cantidades y envío al carrito. | **Entregado y ampliado.** |
| **Reservaciones** | Experiencia, fecha, hora, personas y confirmación. | Horarios reales, personas, notas, confirmación, consulta, cambio y cancelación. Una experiencia con costo genera orden, abre el checkout y permite completar un pago pendiente. | **Entregado y ampliado.** |
| **Mapa interactivo** | Mapa 3D, puntos, búsqueda, ubicación y ruta. | Mapa satelital con terreno y edificios 3D, ubicación, buscador, puntos de interés y trazado de ruta. | **Entregado.** |
| **Wine Club** | Nivel, puntos, beneficios y próximo beneficio. | Consulta de membresía, nivel o plan, puntos, beneficios, historial y planes publicados. | **Entregado y ampliado.** La afiliación automática no se presenta como activa si Hacienda no la habilita comercialmente. |
| **Carrito / Pago** | Productos, descuentos, envío, total, pasarela y estado para vinos, reservaciones y boletos. | Carrito persistente, cantidades, promociones, domicilio completo, envío, creación de orden, pago seguro, reintento y estados de pago. Admite vinos, boletos y reservaciones de experiencia con costo. | **Entregado y ampliado.** El paso a cobros reales depende de la activación formal del ambiente productivo de pagos. |
| **Perfil** | Datos, membresía, actividad, historial, métodos de pago y preferencias. | Datos personales, fotografía, idioma, preferencias de comunicación, domicilios, notificaciones, membresía, reservaciones, órdenes, pagos pendientes, historial, privacidad y consulta segura de métodos vinculados. | **Entregado y ampliado.** La app no almacena ni muestra números completos de tarjeta. |
| **Sommelier ALQIA** | Chat con recomendaciones basadas en información autorizada. | Pantalla de conversación, sesiones, límites y servicio preparado para responder con la base autorizada. | **Condicionado.** El servicio de inteligencia artificial no está configurado en el ambiente revisado, por lo que no debe presentarse como operativo hasta habilitarlo y probarlo. |

## 5. Página pública e integraciones base

| Servicio ofrecido | Situación en el proyecto real | Resultado |
|---|---|---|
| **Página pública, acceso y registro** | El sitio institucional es **www.haciendadeletras.com**. La plataforma incorpora de forma separada acceso y registro de la app, recuperación, páginas legales y eliminación de cuenta. | **Entregado y ampliado.** |
| **Autenticación de clientes y administradores** | Existen cuentas protegidas, perfiles, recuperación de acceso y permisos por función administrativa. | **Entregado y ampliado.** |
| **Base de datos real** | El Centro de Control y la app consumen servicios conectados para contenido, clientes, reservaciones, compras, pagos y operación. | **Entregado.** |
| **Mapbox** | El mapa 3D, puntos, ubicación y rutas están implementados; la credencial local revisada está configurada. | **Entregado.** |
| **QR para boletos y validación** | Existen emisión de accesos, visualización del QR y módulo de Check-in para validar, rechazar duplicados, cancelar y revertir registros. | **Entregado y conectado.** La demostración completa requiere datos de un evento real. |
| **Sommelier con IA** | La pantalla y el servicio existen. | **Condicionado.** Falta habilitar el proveedor de inteligencia artificial en el ambiente revisado. |
| **Resend y correos** | Existe preparación, envío, reintento, plantillas e historial técnico. Se validaron en producción los correos de bienvenida y recuperación, con lenguaje neutral, identidad visual y enlaces al sitio institucional. | **Entregado y validado para correo.** |
| **Notificaciones** | Existe bandeja dentro de la app, preferencias y servicio para notificaciones al teléfono. | **Entregado parcialmente.** La bandeja interna funciona; el proveedor para avisos Push no está configurado en el ambiente revisado. |
| **App Store y Google Play** | Existen compilaciones de distribución para ambas plataformas y se inició el proceso de tiendas. | **En proceso de validación.** Periodo del 17 al 30 de agosto y fecha límite de publicación: 3 de septiembre de 2026. |

## 6. Módulos adicionales entregados en el Centro de Control

Los siguientes módulos no figuraban como módulos administrativos independientes dentro de los 10 comprometidos:

| Módulo adicional | Valor que recibe Hacienda |
|---|---|
| **Cotizaciones** | Recibe solicitudes para bodas y eventos, genera folio, permite seguimiento, notas, estados y envío de propuesta por correo. |
| **Órdenes** | Administra compras, productos, pagos, historial, preparación, cancelación y cumplimiento. |
| **Pagos** | Reúne cobros, comprobantes, incidencias, pagos manuales autorizados y devoluciones. |
| **Vinos** | Permite administrar directamente el catálogo que consume la tienda móvil. |
| **Servicios y sedes** | Administra cabañas, restaurantes y espacios para eventos desde el Centro de Control. |
| **Hospedaje** | Agrega unidades físicas, calendario, bloqueos, estancias, cambios, entrada y salida. |
| **Carritos** | Permite consultar carritos activos o abandonados, artículos, valor y última actividad. |
| **Wine Club administrativo** | Administra miembros, estado, beneficios, puntos e historial. |
| **Check-in** | Valida accesos QR, evita usos repetidos y conserva historial de entradas. |
| **Actividad App** | Registra acciones y sesiones para entender cómo se utiliza la aplicación. |
| **Eliminación de cuentas** | Permite atender formalmente solicitudes de privacidad y conservar seguimiento administrativo. |

## 7. Módulos originalmente futuros que ahora existen

La propuesta señaló estos módulos como parte de una hoja de ruta no incluida. El proyecto real ya incorpora:

| Módulo futuro en la propuesta | Capacidad encontrada en el proyecto real | Valor adicional |
|---|---|---|
| **Inventario** | Existencias, ubicaciones, lotes, reservas, mínimos, alertas y movimientos de entrada, ajuste o transferencia. | Permite controlar disponibilidad física y detectar stock bajo. |
| **Logística** | Seguimiento de envíos, estados, incidencias y entrega. | Conecta la venta de productos con su preparación y entrega. |
| **Distribuidores** | Registro de distribuidores y pedidos comerciales. | Abre una operación adicional para ventas fuera del canal directo al consumidor. |
| **Reportes** | Reportes operativos básicos dentro del Centro de Control. | Agrega consulta gerencial inicial. No debe presentarse todavía como inteligencia ejecutiva o reporte avanzado especializado. |

No se identificó como entregada la **inteligencia ejecutiva avanzada** ni las **automatizaciones avanzadas** mencionadas en la hoja de ruta. Por precisión, no deben sumarse a la lista de extras.

## 8. Funciones adicionales dentro de la app

Además de las 12 pantallas pactadas, el proyecto real incorpora:

- **Cabañas:** paquetes, fechas, huéspedes, notas y solicitud de estancia.
- **Restaurantes:** sedes, horarios generales, personas y solicitud de mesa sujeta a confirmación. No incluye mapa de mesas ni cupos distintos por fecha.
- **Celebra:** solicitudes de cotización para bodas, celebraciones y eventos empresariales.
- **Detalle completo de experiencias:** galería, información y horarios reales.
- **Mis boletos y accesos:** consulta de folios y QR desde el teléfono.
- **Estados de pago:** procesamiento, pago aprobado, pago fallido y reintento.
- **Domicilios de entrega:** alta, edición, eliminación y domicilio principal.
- **Notificaciones dentro de la app:** avisos y acceso directo a la operación relacionada.
- **Privacidad y eliminación de cuenta:** recorrido visible para cumplir solicitudes del usuario.
- **Pantallas legales:** política de privacidad y términos dentro de la aplicación.

## 9. Diferencias que deben explicarse o cerrarse

El valor adicional no elimina la obligación de identificar los puntos que todavía no equivalen por completo a la descripción de la propuesta:

1. **Campañas:** el flujo real está centrado en correo. Push, In-App, sugerencias automáticas y métricas completas todavía no equivalen al alcance descrito.
2. **Sommelier ALQIA:** la pantalla y el servicio existen, pero falta habilitar el proveedor de IA en el ambiente revisado.
3. **Notificaciones Push:** la bandeja interna existe; los avisos automáticos al teléfono requieren configurar su proveedor.
4. **Cobros reales:** los recorridos están conectados; la pasarela debe pasar formalmente del ambiente autorizado para pruebas al ambiente productivo antes de cobrar dinero real.
5. **Eventos, boletos y QR:** la conexión central ya está publicada; requiere datos reales y una prueba completa durante la validación.
6. **Métricas especializadas:** Dashboard ofrece indicadores generales, pero algunas métricas específicas descritas para promociones, campañas y eventos requieren comprobarse o completarse como reportes dedicados.

## 10. Datos operativos que no son faltantes de desarrollo

Al momento de este análisis, la situación de los datos operativos para prueba es la siguiente:

- Experiencias: se cargaron 15 horarios mock reservables, tres por cada experiencia publicada, para el 17, 23 y 29 de agosto de 2026.
- Eventos futuros publicados y tipos de boleto a la venta.
- Restaurantes: se cargaron horarios mock de 11:00 a 17:30 cada 30 minutos en las dos sedes publicadas.
- Unidades físicas activas de cabaña.

Los horarios mock permiten ejecutar la validación de experiencias y restaurantes, pero Hacienda debe confirmarlos o sustituirlos por información real antes de la operación comercial. Los eventos y cabañas continúan sujetos a **carga y configuración operativa**; mientras no se capturen, la app mostrará correctamente que no existe disponibilidad. Esto no debe confundirse con una pantalla desconectada.

## 11. Balance final para la entrega

### Lo comprometido y cubierto

- Centro de Control, app iOS/Android y conexión con el sitio institucional público.
- Contenido, experiencias, disponibilidad, eventos, reservaciones, clientes, promociones, campañas, configuración y vista de app.
- Tienda, carrito, pago de productos, perfil, mapa 3D, Wine Club y recorridos principales del cliente.
- Base central, autenticación, correo y preparación para tiendas.

### Valor adicional entregado

- 25 módulos o accesos funcionales en el Centro de Control frente a los 10 contemplados inicialmente.
- Inventario, Logística, Distribuidores y reportes operativos básicos, aun cuando fueron planteados como crecimiento futuro.
- Órdenes, Pagos, Carritos, Cotizaciones, Servicios y sedes, Hospedaje, Wine Club administrativo, Check-in, Actividad App y Eliminación de cuentas.
- Cabañas, Restaurantes, Celebra, domicilios, notificaciones, estados de pago, privacidad y accesos QR dentro de la experiencia móvil.

### Forma recomendada de comunicarlo

> El proyecto no se limitó a reproducir las 24 vistas originalmente descritas. Se convirtió en una plataforma operativa más amplia, con 25 áreas en el Centro de Control y más de 20 recorridos móviles. Además de cubrir el núcleo comprometido, ALQIA incorporó herramientas para órdenes, pagos, cotizaciones, hospedaje, restaurantes, inventario, logística, distribuidores, Check-in, privacidad y seguimiento de uso. Las funciones que dependen de proveedores externos o de datos operativos se encuentran claramente identificadas para su activación y validación final.

## 12. Conformidad del cruce funcional

**Revisado por Hacienda de Letras:** _____________________________________
**Revisado por ALQIA:** _________________________________________________
**Fecha:** ______________________________________________________________

**Resultado:** ☐ Conforme  ☐ Conforme con observaciones  ☐ Requiere aclaración

**Observaciones:**

__________________________________________________________________________

__________________________________________________________________________
