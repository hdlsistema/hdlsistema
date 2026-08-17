# Acta de entrega técnica para inicio de validación — Hacienda de Letras

**Producto presentado para validación:** Centro de Control y aplicación móvil Hacienda de Letras
**Aplicación Android:** versión 1.0.9, compilación 16
**Aplicación iOS:** versión 1.0, compilación 13
**Fecha del documento:** 16 de agosto de 2026
**Periodo formal de validación:** del lunes 17 al domingo 30 de agosto de 2026
**Fecha límite objetivo de publicación en tiendas:** 3 de septiembre de 2026
**Etapa actual:** paquete Android listo para Google Play, build iOS cargado en App Store Connect y validación funcional por ALQIA
**Sitio institucional público:** [www.haciendadeletras.com](https://www.haciendadeletras.com/)

**Documentos complementarios:** [Cruce funcional de la propuesta contra el proyecto real](./ANEXO_COMPARATIVO_ALCANCE_FUNCIONAL_VS_PROYECTO_REAL.md) y [Plan de prueba cerrada de Google Play — 14 días](./PLAN_PRUEBA_CERRADA_GOOGLE_PLAY_14_DIAS.md).

## 1. Presentación de la entrega

Hacienda de Letras recibe una solución formada por dos partes que trabajan juntas:

1. **Centro de Control:** es la herramienta de trabajo del personal de Hacienda. Desde aquí se administra lo que se ofrece, los horarios, la disponibilidad, las reservaciones, las compras, los pagos, los clientes y los accesos.
2. **Aplicación móvil:** es la experiencia para el visitante. Desde su teléfono puede conocer Hacienda, consultar vinos, experiencias, eventos, cabañas y restaurantes, realizar compras o solicitudes, revisar sus movimientos y presentar sus códigos de acceso.

Ambas partes utilizan la misma información central. Esto evita capturar dos veces los mismos datos y permite que una operación iniciada por el cliente en la app llegue al equipo de Hacienda en el Centro de Control.

## 2. Cómo trabajan juntas

El flujo general es el siguiente:

**Hacienda prepara y publica información en el Centro de Control → la app muestra únicamente lo que está activo y disponible → el cliente compra, reserva o solicita → la operación regresa al Centro de Control → el equipo de Hacienda la atiende → el cliente consulta el resultado y, cuando corresponde, recibe su acceso con código QR.**

En lenguaje sencillo, la conexión funciona así:

1. El personal guarda información desde el Centro de Control.
2. El servicio central verifica permisos y reglas antes de aceptar el cambio.
3. La información se conserva en la base central de Supabase, no únicamente en la computadora o navegador de quien la capturó.
4. Las aplicaciones Android e iOS consultan esa misma información mediante el servicio central.
5. Cuando el cliente reserva, compra, paga o envía una solicitud, la app registra la operación en la misma base y genera la alerta correspondiente para el equipo.
6. Cuando Hacienda atiende la operación, el nuevo estado vuelve a la app y, cuando corresponde, genera un aviso para el cliente.

### Regla importante: guardar no siempre significa publicar

El Centro de Control permite preparar información antes de hacerla visible. Un vino, experiencia, evento o servicio puede estar guardado, pero no aparecerá en la app hasta que esté **publicado, activo y dentro de sus fechas de publicación**.

Además:

- Una **experiencia** necesita horarios futuros y cupo disponible.
- Un **evento** necesita fecha, publicación, capacidad y tipos de boleto disponibles para venta.
- Un **restaurante** necesita horarios de reservación configurados.
- Una **cabaña** necesita paquetes publicados y unidades físicas activas en el calendario.

Si falta alguno de esos datos, la app mostrará correctamente que todavía no hay disponibilidad. No crea horarios ni cupos por sí sola.

## 3. Alcance solicitado y contratado

La propuesta autorizada definió una Versión 1.0 formada por **10 módulos administrativos**, **12 pantallas para clientes** y una página pública con las integraciones necesarias. A continuación se presenta ese alcance en el mismo orden y se explica qué hace cada elemento dentro del proyecto real.

### 3.1 Centro de Control contratado

| Módulo contratado | Para qué sirve | Funciones disponibles | Cómo se conecta con la app |
|---|---|---|---|
| **Dashboard** | Ofrece una lectura rápida del negocio y señala qué requiere atención. | Presenta clientes, reservaciones, cobros, órdenes pendientes, carritos, sesiones, ocupación y próximos horarios. | Resume la actividad real enviada por la app y abre directamente la reservación, orden o área que necesita seguimiento. |
| **Reservaciones** | Reúne y administra las reservaciones recibidas. | Permite buscar, filtrar, crear, confirmar, cancelar, reprogramar, cambiar personas, agregar notas y consultar historial. | Recibe solicitudes de experiencias, restaurantes y cabañas. Cuando el equipo cambia su estado, el cliente ve el resultado actualizado y recibe un aviso en la app. |
| **Experiencias** | Administra catas, recorridos y demás actividades ofrecidas por Hacienda. | Captura descripción, fotografías, duración, precio, capacidad, estado, visibilidad, publicación, vista previa e historial. | Lo publicado forma el catálogo de Experiencias; sus horarios se completan en Disponibilidad antes de que el cliente pueda reservar. |
| **Disponibilidad** | Define cuándo puede reservar un cliente y cuántos lugares existen. | Administra experiencias, restaurantes y cabañas desde una sola área: horarios, cupos, precios, bloqueos y ocupación. | La app consulta esta información al elegir fecha y hora. Cada reservación ocupa el cupo o unidad correspondiente y una cancelación lo libera. |
| **Eventos** | Administra la cartelera y controla cuándo se publica un evento. | Captura fecha, sede, imágenes, capacidad, estado, visibilidad y tipos de boleto con precio, cupo y periodo de venta. | Los eventos publicados aparecen en la app; una compra aprobada genera el boleto y QR que después valida Check-in. |
| **Clientes / CRM** | Conserva una visión completa de cada cliente y su relación con Hacienda. | Reúne perfil, contacto, compras, reservaciones, membresía, gasto, notas, etiquetas, historial y descarga de información. | Una cuenta creada en la app alimenta un único perfil central; compras, reservaciones y membresía se relacionan con ese mismo cliente. |
| **Promociones** | Crea beneficios u ofertas con reglas y vigencia definidas. | Configura descuento, fechas, límites, segmento, visibilidad y publicación. | Las promociones vigentes se muestran o aplican en la experiencia de compra según sus reglas, sin duplicar la captura en Android e iOS. |
| **Campañas** | Prepara comunicaciones para grupos específicos de clientes. | Forma audiencias, revisa consentimiento, redacta, programa y envía campañas por correo. | Utiliza los perfiles y preferencias registrados en la app. Los canales remotos adicionales se habilitan según la configuración indicada en este documento. |
| **Configuración** | Centraliza datos administrativos, idioma, accesos y preferencias generales. | Incluye operación en español/inglés, permisos por responsabilidad y preferencias administrativas. | Protege quién puede consultar o cambiar información que después consumen las dos aplicaciones móviles. |
| **Vista de la App** | Permite al equipo conocer la experiencia que verá el cliente. | Ofrece una referencia navegable de los recorridos principales. | Abre la experiencia de cliente sin mezclarla con la sesión administrativa y ayuda a comprobar lo que fue publicado. |

### 3.2 Aplicación móvil contratada

| Pantalla contratada | Para qué sirve | Funciones disponibles | De dónde se alimenta y qué devuelve |
|---|---|---|---|
| **Inicio** | Presenta la marca y dirige al visitante hacia los servicios principales. | Incluye contenido destacado y accesos a vinos, experiencias, eventos, servicios, Wine Club, mapa y Sommelier. | Lee contenido publicado por Hacienda y registra actividad de navegación para el tablero y Actividad App. |
| **Tienda de vinos** | Permite conocer y buscar el catálogo. | Ofrece catálogo, búsqueda, filtros, fotografías, precios y acceso a cada producto. | Lee Vinos e Inventario comercial; lo agregado se guarda en Carritos y posteriormente se convierte en una Orden. |
| **Detalle de vino** | Ayuda al cliente a decidir y comprar un vino. | Presenta ficha, imágenes, precio, información del vino, cantidad y agregado al carrito. | Usa la ficha publicada en Vinos y devuelve selección, cantidad e intención de compra al carrito central. |
| **Experiencias** | Muestra las actividades disponibles para reservar. | Presenta categorías, descripción, duración, precio, capacidad, galería y horarios reales. | Lee Experiencias y Disponibilidad; una solicitud crea una Reservación y alerta al Centro de Control. |
| **Eventos** | Comunica la cartelera y las opciones de acceso. | Presenta listado, información, fechas, disponibilidad, boletos y acceso al QR. | Lee Eventos y tipos de boleto; la compra crea Orden y Pago, y al aprobarse muestra el acceso en Mis boletos. |
| **Detalle de evento** | Reúne la información necesaria para comprar una entrada. | Muestra fecha, horario, sede, descripción, fotografías, precio, tipos de boleto, cupo y cantidades. | Consulta el cupo central antes de vender y devuelve la selección al carrito para evitar vender accesos inexistentes. |
| **Reservaciones** | Permite elegir servicio, horario y número de personas. | Crea la reservación, muestra su estado y permite consultar, cambiar o cancelar cuando las reglas lo permiten. | Lee Disponibilidad y escribe en Reservaciones. Los cambios hechos por Hacienda regresan a esta pantalla y generan aviso al cliente. |
| **Mapa interactivo** | Ayuda al visitante a ubicarse y encontrar servicios. | Incluye mapa satelital, terreno y edificios 3D, puntos de interés, búsqueda, ubicación y trazado de ruta. | Lee los puntos publicados en el Centro de Control; las consultas de mapa se registran como actividad, no como alerta operativa. |
| **Wine Club** | Permite al socio conocer su relación con el club. | Presenta plan, puntos, beneficios, historial y próximos beneficios. | Lee Membresías y Wine Club; los ajustes autorizados por Hacienda se reflejan en el perfil del socio. |
| **Carrito / Pago** | Reúne lo seleccionado y permite completar una compra. | Administra productos y boletos, cantidades, promociones, domicilio, total, pago seguro, reintento y estado. | Escribe en Carritos, Órdenes y Pagos. El Centro de Control recibe alertas de orden y pago y el cliente conserva su comprobación dentro de la app. |
| **Perfil** | Centraliza la información y actividad del cliente. | Incluye datos, fotografía, idioma, preferencias, domicilios, notificaciones, membresía, reservaciones, órdenes, historial y privacidad. | Lee y actualiza el perfil único de Clientes; los cambios se conservan en la base central y se comparten entre Android e iOS. |
| **Sommelier ALQIA** | Orienta al visitante con recomendaciones de vino. | Cuenta con conversación, sesiones, límites de uso y servicio preparado para información autorizada. | Usa el catálogo de vinos como contexto; la respuesta inteligente depende de la activación del proveedor externo indicada más adelante. |

### 3.3 Página pública e integraciones contratadas

| Servicio contratado | Para qué sirve | Situación en el proyecto real |
|---|---|---|
| **Página pública y acceso digital** | Presenta Hacienda y dirige al visitante hacia sus servicios digitales. | El sitio institucional público es **www.haciendadeletras.com**. La plataforma entregada incorpora, de forma separada, acceso y registro de la app, recuperación de cuenta, eliminación de cuenta y páginas legales; el Centro de Control no se presenta como sitio para clientes. |
| **Autenticación y permisos** | Protege las cuentas de clientes y separa las funciones administrativas. | Existen sesiones, recuperación de acceso, perfiles y permisos por responsabilidad. |
| **Base de información central** | Evita capturas duplicadas y conecta Centro de Control y app. | Contenido, clientes, reservaciones, compras, pagos y operación utilizan la misma información central. |
| **Mapbox** | Proporciona mapa, marcadores, ubicación y rutas. | Se encuentra integrado en la experiencia móvil con presentación 3D. |
| **Códigos QR** | Emite boletos y permite comprobarlos al ingresar. | Existen generación de accesos, visualización del QR y validación desde Check-in. Su prueba completa requiere la publicación central y datos descritos más adelante. |
| **Resend / correo** | Envía correos de operación y campañas. | Existen plantillas elegantes, preparación, envío, reintento y registro del resultado. Se validaron en producción el correo de bienvenida y la recuperación de acceso, con lenguaje neutral, logotipo oficial y enlaces hacia **www.haciendadeletras.com**. |
| **Notificaciones** | Informa al cliente y al equipo sobre movimientos relevantes. | La app cuenta con bandeja de avisos y acceso a la operación relacionada. El Centro de Control recibe alertas en su campana para reservaciones, órdenes, pagos, cotizaciones y solicitudes de privacidad, con acceso directo al registro. Los avisos remotos Android están configurados; iOS requiere completar la credencial APNs del servidor. |
| **Distribución en tiendas** | Prepara la aplicación para iOS y Android. | Android cuenta con AAB Release 1.0.9 (16) firmado para Google Play. iOS cuenta con Archive Release 1.0 (13) cargado mediante **App Store Connect**, no como “TestFlight Internal Only”. |

### 3.4 Notificaciones de cada evento operativo

La solución distingue dos tipos de aviso:

- **Campana del Centro de Control:** alerta al personal cuando una acción del cliente requiere atención. Al seleccionar el aviso abre directamente la reservación, orden, pago, cotización o solicitud correspondiente.
- **Notificaciones del cliente:** aparecen en la bandeja de la app y llevan al cliente a sus reservaciones, órdenes o avisos. Android también cuenta con envío remoto configurado. En iOS la aplicación ya incorpora la función, pero el envío remoto quedará activo cuando se configure la llave APNs del servidor.

| Evento | Aviso para el equipo de Hacienda | Aviso o resultado para el cliente | Destino directo |
|---|---|---|---|
| **Nueva reservación de experiencia** | “Nueva reservación desde la app”. | “Reservación recibida” con su folio y estado. | Equipo: Reservaciones. Cliente: Mis reservaciones. |
| **Nueva solicitud de restaurante** | “Nueva solicitud de restaurante”. | “Solicitud de reservación recibida”; queda sujeta a confirmación. | Equipo: reservación exacta. Cliente: Mis reservaciones. |
| **Nueva solicitud de cabaña** | “Nueva solicitud de cabaña”. | “Solicitud de reservación recibida”; muestra fechas y estado. | Equipo: reservación exacta. Cliente: Mis reservaciones. |
| **Reservación confirmada por Hacienda** | No duplica una alerta al mismo equipo que realizó la acción. | “Reservación confirmada”. | Cliente: Mis reservaciones. |
| **Reservación actualizada o reprogramada** | Si el cambio nace en la app, alerta “Reservación reprogramada”. | “Reservación actualizada” o “Reservación reprogramada”. | Reservación exacta en ambos lados. |
| **Reservación cancelada** | Si el cliente cancela, alerta “Reservación cancelada”. | La app muestra el estado cancelado y devuelve el cupo o unidad cuando corresponde. | Reservación exacta en ambos lados. |
| **Intento de reservación fallido** | “Incidencia al reservar”. | La app informa que no se completó y evita presentar una reservación inexistente. | Equipo: Actividad App filtrada por incidencia. |
| **Carrito convertido en orden** | “Nueva orden desde la app”. | La orden queda visible en Perfil con su estado. | Equipo: orden exacta. Cliente: Mis órdenes. |
| **Pago en procesamiento** | “Pago en procesamiento”. | La app mantiene el estado pendiente sin duplicar el cobro. | Equipo: pago exacto. Cliente: estado de pago. |
| **Pago confirmado** | “Pago confirmado”. | La app confirma la compra; si corresponde, habilita boleto y QR o prepara la entrega. | Equipo: pago exacto. Cliente: compra, orden o boleto. |
| **Pago fallido o cancelado** | “Pago no completado” o “Pago cancelado”. | La app permite revisar el resultado y reintentar cuando corresponde. | Equipo: pago exacto. Cliente: estado de pago. |
| **Pago reembolsado** | “Pago reembolsado”. | El nuevo estado queda relacionado con la orden del cliente. | Equipo: pago exacto. Cliente: orden relacionada. |
| **Pedido en preparación** | El cambio queda registrado en Órdenes y Logística. | “Pedido en preparación”. | Cliente: orden exacta. |
| **Guía asignada, pedido enviado o entregado** | El estado se sincroniza entre Órdenes y Logística. | “Guía asignada”, “Pedido enviado” o “Pedido entregado”. | Cliente: orden exacta y seguimiento. |
| **Solicitud de cotización desde Celebra** | “Nueva solicitud de cotización”. | La solicitud conserva su folio para seguimiento. | Equipo: cotización exacta. |
| **Solicitud de eliminación de cuenta** | “Nueva solicitud de eliminación de cuenta”. | La app confirma que la solicitud fue recibida. | Equipo: expediente exacto de privacidad. |

Las visitas a Inicio, vinos, mapas o fichas se registran en **Actividad App** para análisis, pero no saturan la campana. La campana se reserva para hechos que requieren seguimiento operativo. Los avisos usan identificadores únicos para evitar duplicarse si el teléfono reintenta una operación.

## 4. Servicios, módulos y funciones adicionales incorporados por ALQIA

El proyecto real supera el número de módulos y pantallas establecido en la propuesta. El Centro de Control pasó de **10 módulos contratados a 25 accesos funcionales**, y la experiencia móvil pasó de **12 pantallas contratadas a más de 20 vistas y recorridos**.

Estos elementos se presentan como **valor adicional**, sin confundirlos con funciones que todavía dependen de activación o datos operativos.

### 4.1 Módulos adicionales del Centro de Control

| Módulo adicional | Para qué le sirve a Hacienda | Funciones incorporadas | Conexión con la app |
|---|---|---|---|
| **Cotizaciones** | Evita perder solicitudes de bodas o eventos empresariales. | Recibe solicitudes desde Celebra, genera folio, permite seguimiento, notas, estados y envío de propuesta. | Cada formulario enviado por el cliente crea una cotización central y una alerta que abre exactamente ese folio. |
| **Órdenes** | Controla cada compra desde su recepción hasta su cierre. | Consulta productos, cliente, pago, domicilio e historial; permite preparar, cancelar, completar, enviar y entregar. | Recibe compras de vinos y boletos. Sus cambios se reflejan en Perfil y alimentan Pagos, Inventario y Logística. |
| **Pagos** | Centraliza cobros e incidencias. | Consulta pagos y comprobantes, registra pagos manuales autorizados y gestiona devoluciones. | Recibe el resultado del checkout; cada cambio relevante genera alerta al equipo y actualiza el estado que ve el cliente. |
| **Vinos** | Permite administrar directamente la tienda. | Publica fichas, precios, fotografías, existencias comerciales, visibilidad y fechas. | Es la fuente del catálogo móvil; las selecciones del cliente vuelven por Carritos y Órdenes. |
| **Servicios y sedes** | Reúne la oferta adicional de Hacienda. | Administra cabañas, restaurantes y espacios para celebraciones. | Alimenta Cabañas, Restaurantes y Celebra; las solicitudes regresan a Reservaciones o Cotizaciones. |
| **Membresías** | Define los planes que consulta el visitante. | Administra nombre, precio, periodicidad, beneficios, límites y publicación. | Los planes publicados aparecen en Wine Club y Perfil; la relación del socio vuelve al módulo administrativo. |
| **Carritos** | Permite conocer intención de compra y posibles abandonos. | Muestra cliente, productos, cantidad, valor, estado y última actividad. | Recibe en tiempo real la selección del cliente y se relaciona con la orden cuando inicia el checkout. |
| **Wine Club administrativo** | Facilita la atención de socios. | Administra miembros, planes, estado, beneficios, puntos, ajustes e historial. | Todo ajuste autorizado se refleja en la vista Wine Club del cliente. |
| **Check-in** | Agiliza la entrada y evita reutilizar boletos. | Valida QR, registra acceso, identifica códigos usados o cancelados y permite revertir un registro autorizado. | Lee el QR mostrado en Mis boletos; el primer uso queda registrado y el segundo se rechaza. |
| **Actividad App** | Ayuda a entender el uso de la aplicación. | Registra sesiones, vistas y acciones relevantes. | Recibe navegación y resultados operativos desde Android e iOS; permite abrir la entidad relacionada cuando existe. |
| **Eliminación de cuentas** | Permite atender formalmente solicitudes de privacidad. | Recibe solicitudes, conserva seguimiento y administra su resolución. | La petición nace en Perfil, genera alerta y abre el expediente correspondiente para el personal autorizado. |
| **Inventario** | Controla existencias físicas y faltantes. | Administra ubicaciones, lotes, disponible, reservado, mínimos y movimientos. | Se relaciona con los vinos y órdenes; una venta y su preparación conservan trazabilidad de existencia. |
| **Logística** | Conecta la compra con su entrega. | Administra envíos, guías, estados, incidencias, despacho y entrega. | Comparte estado con Órdenes y envía al cliente avisos de guía, envío y entrega. |
| **Distribuidores** | Abre un canal comercial adicional. | Registra distribuidores y pedidos comerciales. | Opera sobre el mismo catálogo e inventario, aunque no es una pantalla destinada al cliente final. |
| **Reportes operativos** | Ofrece una lectura gerencial inicial. | Presenta consultas y resultados básicos. | Consolida información producida por app y Centro de Control; no modifica operaciones del cliente. |

Inventario, Logística y Distribuidores estaban señalados como crecimiento futuro no incluido en la Versión 1.0 original. Su presencia funcional dentro del proyecto representa una ampliación directa del alcance recibido.

### 4.2 Funciones adicionales dentro de módulos contratados

| Función adicional | Para qué sirve |
|---|---|
| **Hospedaje físico y calendario** | Registra unidades reales de cabaña, estancias, bloqueos, cambios, entrada y salida para evitar dobles asignaciones. |
| **Tipos de boleto por evento** | Permite ofrecer diferentes accesos con nombre, precio, cupo y fechas de venta. |
| **Historial de cambios editoriales** | Conserva versiones, permite vista previa, programación, duplicación y recuperación de contenido. |
| **CRM ampliado** | Agrega notas, etiquetas, archivo, restauración y relaciones con compras, reservaciones y membresías. |
| **Seguimiento completo de entrega** | Registra domicilio, preparación, guía, envío y entrega de una orden física. |
| **Preferencias de comunicación** | Permite al cliente decidir qué comunicaciones acepta y en qué idioma. |

### 4.3 Vistas y recorridos adicionales en la aplicación

| Vista o recorrido adicional | Para qué le sirve al cliente | Funciones incorporadas | Conexión con el Centro de Control |
|---|---|---|---|
| **Detalle de experiencia** | Permite comprender una actividad antes de reservar. | Galería, descripción, duración, lugar, precio, capacidad y horarios reales. | Lee Experiencias y Disponibilidad; la selección crea una reservación. |
| **Cabañas** | Permite conocer paquetes y solicitar una estancia. | Fechas, huéspedes, paquete, observaciones y consulta posterior. | Lee Servicios y Disponibilidad; la solicitud llega a Reservaciones y al calendario de hospedaje. |
| **Restaurantes** | Permite solicitar una mesa con información real. | Sede, fecha, horario, personas y solicitud especial. | Lee Servicios y horarios de restaurante; la solicitud llega a Reservaciones y activa la campana. |
| **Celebra** | Facilita solicitar atención para bodas y eventos. | Tipo de evento, espacio, fecha, asistentes, contacto, notas y folio. | Crea una Cotización y alerta al equipo comercial con acceso al folio exacto. |
| **Mis boletos y accesos** | Permite presentar el acceso desde el teléfono. | Folio, estado, tipo de boleto y QR. | Lee accesos emitidos después del pago; Check-in valida el mismo registro central. |
| **Estados de pago** | Informa qué ocurrió con una transacción. | Procesamiento, aprobación, rechazo, consulta y reintento. | Lee Pagos y Órdenes; cada estado relevante activa una alerta operativa en el Centro de Control. |
| **Domicilios de entrega** | Evita volver a escribir la dirección. | Alta, edición, eliminación y domicilio principal con campos obligatorios. | Guarda en el perfil central y entrega una copia de la dirección a la Orden para conservar el destino de esa compra. |
| **Notificaciones dentro de la app** | Reúne avisos importantes. | Bandeja, leído/no leído y acceso a la operación relacionada. | Recibe cambios de Reservaciones, Órdenes, Logística y campañas autorizadas. |
| **Privacidad y cuenta** | Da control sobre los datos personales. | Preferencias, política y solicitud de eliminación. | Actualiza Clientes y crea un expediente en Eliminación de cuentas cuando el usuario lo solicita. |
| **Pantallas legales** | Mantiene términos y políticas disponibles. | Consulta de términos, condiciones y privacidad. | Lee los documentos públicos vigentes; no expone el Centro de Control. |

## 5. Flujos completos que deben demostrarse

### A. Compra de vino y entrega

1. Hacienda publica el vino y confirma precio y existencia.
2. El cliente lo encuentra en la app y lo agrega al carrito.
3. La app solicita un domicilio de entrega completo.
4. El cliente confirma y realiza el pago.
5. La orden aparece en el Centro de Control.
6. Hacienda prepara el pedido, asigna seguimiento y registra el envío o entrega.
7. El cliente puede consultar el resultado en su perfil.

### B. Reservación de experiencia

1. Hacienda publica la experiencia.
2. En Disponibilidad crea fecha, hora, duración y cupo.
3. La app muestra únicamente los horarios futuros con espacio disponible.
4. El cliente elige horario, personas y envía la reservación.
5. La reservación aparece en el Centro de Control.
6. Hacienda confirma, cambia o cancela según la operación.
7. El cliente ve el estado y su acceso cuando corresponda.

### C. Evento, pago, boleto y acceso QR

1. Hacienda publica el evento con fecha, sede y capacidad.
2. Crea uno o más tipos de boleto con nombre, precio, cupo y periodo de venta.
3. La app muestra sólo boletos vigentes y disponibles.
4. El cliente elige cantidad, agrega al carrito y paga.
5. El sistema registra la orden y descuenta la disponibilidad correspondiente.
6. El boleto aparece en “Mis boletos y accesos” con su QR.
7. En la entrada, Hacienda escanea el QR desde Check-in.
8. El sistema indica si es válido, ya fue usado, está cancelado o no corresponde.

### D. Cabaña

1. Hacienda publica el paquete de cabaña.
2. Registra las unidades físicas activas y su calendario.
3. El cliente selecciona fechas, número de huéspedes y envía la solicitud.
4. El Centro de Control recibe la reservación y asigna la unidad disponible.
5. Un cambio o cancelación actualiza nuevamente el calendario.

### E. Restaurante

1. Hacienda publica el restaurante y habilita la recepción de reservaciones.
2. Configura los horarios reales disponibles.
3. El cliente selecciona restaurante, fecha, hora y personas.
4. La solicitud llega a Reservaciones en el Centro de Control.
5. Hacienda da seguimiento y el cliente consulta el estado en la app.

### F. Celebraciones y cotizaciones

1. El cliente completa el formulario “Celebra”.
2. El Centro de Control crea una solicitud con folio.
3. El equipo comercial contacta al cliente, prepara la propuesta y actualiza el seguimiento.
4. El historial queda concentrado para evitar solicitudes perdidas.

### G. Qué debe cargar Hacienda para habilitar cada reservación

La aplicación muestra únicamente la disponibilidad guardada por Hacienda en el Centro de Control. No crea horarios ni cupos por su cuenta. Si aún no se ha hecho la carga operativa, el mensaje “no hay horarios disponibles” es el comportamiento correcto.

| Servicio | Dónde se prepara en el Centro de Control | Información mínima que debe capturarse | Resultado en la app |
|---|---|---|---|
| **Restaurante** | **Servicios y sedes → Restaurantes → Editar** | Restaurante publicado y visible, reservaciones habilitadas y “Horarios de solicitud” escritos uno por línea en formato `HH:mm`, por ejemplo `13:00`, `14:30` y `16:00`. | El cliente elige sede, fecha, uno de los horarios autorizados, personas y envía su solicitud para confirmación. |
| **Experiencia** | **Experiencias** y después **Disponibilidad → Experiencias → Nuevo horario** | Experiencia publicada; fecha y hora futuras, duración, cupo, precio y estado abierto/reservable. | La app ofrece solamente horarios futuros con lugares disponibles. |
| **Evento** | **Eventos → Crear o editar** y después **Tipos de boleto** | Evento publicado con fecha, sede y capacidad; por cada boleto: nombre, precio, cupo y periodo de venta. | La app ofrece los boletos vigentes; al pagarse se genera el acceso y su QR. |
| **Cabaña** | **Servicios y sedes → Cabañas** y después **Disponibilidad → Cabañas** | Paquete publicado y visible; cabañas físicas activas, capacidad, tarifa y calendario sin bloqueo para las fechas solicitadas. | El cliente consulta el paquete, elige fechas y huéspedes y envía la reservación sin duplicar una unidad ocupada. |

Todo lo anterior se guarda en la base central y alimenta las dos versiones de la app, Android e iOS. No depende de información local del navegador ni de cargar los mismos datos por separado en cada plataforma.

**Precisión operativa del restaurante:** funciona como solicitud sujeta a confirmación. Los horarios capturados son opciones generales para fechas futuras; esta versión no administra un mapa de mesas ni cupos de restaurante distintos por fecha. El equipo revisa y confirma cada solicitud desde Reservaciones. Experiencias, eventos y cabañas sí utilizan respectivamente cupos por horario, inventario de boletos y unidades físicas por noche.

## 6. Estado para iniciar la validación y condiciones por cerrar

Antes de preparar las compilaciones finales se cerraron y publicaron estas conexiones:

| Conexión cerrada | Resultado disponible |
|---|---|
| **Eventos, boletos y QR** | El tipo de boleto, su cupo, la compra, el pago, la emisión del acceso y la validación QR utilizan el mismo registro central. |
| **Pago de experiencias** | Una experiencia con costo genera su orden de pago, abre el checkout y conserva el acceso para completar el pago pendiente. |
| **Métodos de pago en Perfil** | El cliente puede consultar de forma segura las referencias de sus métodos vinculados; la app no almacena ni muestra números completos de tarjeta. |
| **Tipos de reservación** | Experiencias, restaurantes y cabañas llegan al Centro de Control con su tipo correcto y con sus reglas propias de seguimiento. |

El producto cuenta con los módulos y conexiones descritos. Para comprobar todos los recorridos con información real durante la prueba cerrada, Hacienda debe completar la carga operativa siguiente:

| Preparación requerida | Estado observado al elaborar esta entrega | Efecto mientras falte |
|---|---|---|
| Horarios futuros de experiencias | Cargados para prueba: 15 horarios, tres por cada experiencia publicada, para el 17, 23 y 29 de agosto de 2026 | Permiten recorrer reservación y cupo durante la prueba cerrada; Hacienda debe confirmar o reemplazar estos mocks antes de operación comercial. |
| Eventos futuros publicados y tipos de boleto | Pendiente de carga | No se puede recorrer compra y QR de un evento real. |
| Horarios de restaurantes | Cargados para prueba en los dos restaurantes: 11:00 a 17:30 cada 30 minutos | La selección ya está habilitada; Hacienda debe confirmar o reemplazar estos mocks por sus horarios operativos definitivos. |
| Unidades físicas activas de cabaña | Pendiente de carga | No puede validarse disponibilidad real ni protección contra doble reservación. |
| Asistencia avanzada de Sommelier | Falta confirmar la activación del proveedor externo en producción | Debe validarse después de confirmar la cuenta del proveedor. |
| Avisos automáticos al teléfono | Android/Firebase configurado. iOS/APNs pendiente de credencial del servidor | La bandeja interna funciona en ambas plataformas. Android puede validar push remoto; en iOS el build ya incluye la función, pero el aviso remoto requiere la llave APNs existente. |
| Campañas por avisos al teléfono, mensajes dentro de la app y sugerencias automáticas | El flujo actual está concentrado en segmentación y correo | Esos canales y sus métricas completas deben habilitarse o aclararse antes de declarar cubierto ese punto específico. |
| Cobros reales de producción | El recorrido se valida con el ambiente de pago autorizado para pruebas | Antes de cobrar dinero real debe confirmarse el cambio formal de la pasarela al ambiente productivo. |
| Métricas especializadas de promociones, campañas y eventos | Existen indicadores generales y seguimiento operativo | Los reportes especializados deben validarse o completarse si se requieren con el detalle descrito en la propuesta. |

Los horarios de experiencias y restaurantes fueron cargados exclusivamente como datos controlados de prueba y quedaron marcados internamente como QA. Los eventos y las unidades físicas de cabaña continúan sujetos a **carga y preparación operativa**; mientras no se capturen, la app mostrará correctamente que no existe disponibilidad. Los proveedores externos, los canales adicionales de campañas, la activación de cobros reales y los reportes especializados se validan de manera separada antes de su uso comercial.

## 7. Inventario de materiales presentados para validación

| Material | Identificación y estado |
|---|---|
| **Centro de Control** | Plataforma administrativa conectada a la información central, con 25 accesos funcionales organizados por Operación, Comercial, Contenido y Administración. |
| **Aplicación Android** | Versión 1.0.9, compilación 16; AAB Release firmado, verificado y preparado para distribución mediante Google Play. |
| **Aplicación iOS** | Versión 1.0, compilación 13; Archive Release generado y build cargado mediante App Store Connect para su procesamiento y posterior selección en tienda. |
| **Servicios centrales** | API, base de información, autenticación, correo transaccional y conexiones operativas utilizadas por el Centro de Control y la app. |
| **Documentación funcional** | Este documento de entrega técnica y el anexo comparativo de alcance contratado frente al proyecto real. |
| **Documentación de pruebas** | Plan diario de prueba cerrada de Android y validación interna paralela de iOS, con criterios, evidencias y formato de incidencias. |
| **Accesos y credenciales** | Se entregan o confirman mediante un canal seguro y separado. Este documento no contiene contraseñas, llaves, tokens ni información sensible. |
| **Código y control de versiones** | Código fuente resguardado en el repositorio autorizado del proyecto, con historial de cambios y versiones de distribución identificadas. |

La recepción de estos materiales autoriza el inicio de la etapa de validación. La aceptación funcional definitiva se documentará al terminar el periodo de pruebas y revisar sus evidencias.

### 7.1 Control de calidad y seguridad previo a la entrega

- **Aplicación y Centro de Control:** 154 pruebas aprobadas de 154.
- **Servicios centrales:** 146 pruebas aprobadas de 146.
- **Compilaciones:** Centro de Control, servicios centrales, Android Release e iOS Release completados correctamente.
- **Android:** APK y AAB firmados con la firma existente y verificados antes de su entrega.
- **iOS:** Archive validado para tienda y build 13 aceptado por App Store Connect mediante el método de distribución **App Store Connect**, no como build interno exclusivo.
- **Conexión central:** servicio productivo disponible y base de información conectada.
- **Protección de credenciales:** no se detectaron contraseñas, llaves privadas, tokens administrativos ni claves privilegiadas dentro del código, el historial o los paquetes entregables. Los identificadores públicos indispensables para el funcionamiento de mapas y acceso anónimo están limitados al cliente y no conceden permisos administrativos.

## 8. Criterios de aceptación de la entrega

La entrega se considera aceptada cuando, con datos de prueba controlados:

- La información publicada desde el Centro de Control aparece correctamente en la app.
- Una compra genera una sola orden y un solo cobro esperado.
- Una reservación ocupa el cupo correcto y aparece en ambos lados.
- Un cambio o cancelación actualiza la disponibilidad sin crear duplicados.
- Un boleto pagado genera un QR visible para el cliente.
- El Check-in acepta una sola vez un QR válido y rechaza uno usado o cancelado.
- Los domicilios de entrega quedan completos antes de permitir una compra física.
- No existen cierres inesperados, pantallas bloqueadas ni botones con texto fuera de su área.
- Las solicitudes de privacidad y eliminación de cuenta pueden enviarse y atenderse.
- Los pendientes menores quedan registrados con responsable y fecha de solución.

## 9. Validación interna de iOS a cargo de ALQIA

Durante los mismos 14 días de la prueba cerrada de Android, **el equipo interno de ALQIA realizará en paralelo el testeo de la versión iOS**. Esta validación no se deja como responsabilidad del personal de Hacienda ni de los testers invitados de Google Play.

ALQIA revisará la aplicación iOS en iPhone y, cuando sea útil, en simulador, siguiendo los mismos recorridos principales:

- Instalación, apertura, registro, inicio y recuperación de cuenta.
- Navegación, lectura, botones, imágenes y adaptación a distintos tamaños de pantalla.
- Perfil, domicilios, privacidad y eliminación de cuenta.
- Vinos, carrito, compra, pago y consulta de órdenes.
- Experiencias, restaurantes, cabañas, cambios y cancelaciones.
- Eventos, boletos, generación del QR y validación de acceso.
- Comportamiento al cerrar y volver a abrir, cambiar de red o interrumpir una operación.

Los resultados de iOS se registrarán en el mismo control de incidencias, identificando claramente la plataforma. Si una falla también puede afectar Android, ALQIA revisará ambas versiones antes de darla por cerrada.

La validación interna de ALQIA confirma la calidad del producto antes de tienda; no sustituye el proceso de revisión y aprobación realizado por Apple.

## 10. Responsabilidades durante los 14 días

### Equipo de Hacienda

- Cargar contenido, horarios, precios, cupos, unidades y reglas reales de prueba.
- Atender en el Centro de Control las operaciones enviadas por los testers.
- Evitar usar datos personales o pagos reales no autorizados.
- Confirmar diariamente qué casos fueron revisados.

### Personas testers

- Utilizar la app en teléfonos reales y con su cuenta invitada.
- Seguir la actividad asignada para cada día.
- Reportar claramente qué hicieron, qué esperaban y qué ocurrió.
- Adjuntar captura cuando exista una diferencia visible.
- No repetir pagos o reservaciones por error sin avisar al equipo.

### Equipo interno de ALQIA

- Ejecutar y documentar internamente el testeo completo de iOS durante el mismo periodo.
- Revisar los reportes de Android e iOS, separar dudas de uso de fallas reales y dar prioridad a los bloqueos.
- Mantener un registro de correcciones y volver a validar los casos afectados.
- Confirmar el cierre técnico de ambas plataformas antes de solicitar la salida de la prueba cerrada o continuar el proceso de publicación.

## 11. Constancia de recepción para iniciar validación

**Representante de Hacienda de Letras:** __________________________________
**Responsable de implementación:** _______________________________________
**Fecha de inicio de prueba:** 17 de agosto de 2026
**Fecha de cierre de prueba:** 30 de agosto de 2026
**Fecha límite objetivo de publicación en tiendas:** 3 de septiembre de 2026
**Validación interna iOS por ALQIA:** ☐ Programada  ☐ En curso  ☐ Completada  ☐ Con observaciones

**Resultado de esta recepción:** ☐ Recibido para iniciar validación  ☐ Recibido con observaciones  ☐ Requiere ajuste antes de iniciar

**Observaciones:**

__________________________________________________________________________

__________________________________________________________________________

**Firma de recepción:** __________________________________________________

La firma de esta sección confirma la recepción del sistema y el inicio de las pruebas; no sustituye el acta de cierre y aceptación definitiva que se completará al finalizar los 14 días.
