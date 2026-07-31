# Hacienda de Letras — Plataforma Digital
## Alcance Tecnico de la Version 1.0
### Documento para inclusion en contrato de adquisicion

---

**Producto:** Plataforma Digital Hacienda de Letras (Demo v1.0)  
**Fecha de emision:** 8 de julio de 2026  
**Clasificacion:** Confidencial — Uso interno y contractual

---

## 1. Descripcion General del Producto

La plataforma Hacienda de Letras v1.0 es un sistema digital de doble cara compuesto por:

- **Panel de Control Administrativo** (acceso del personal de la hacienda): interface web para la operacion y gestion del negocio, accesible desde computadoras de escritorio y laptops.
- **Aplicacion Movil del Huesped** (acceso del cliente final): aplicacion movil de la marca, visible dentro del panel de control como simulacion de uso real en dispositivo, que representa la experiencia del usuario en su telefono.

Ambas superficies estan construidas bajo una sola base de codigo y se distribuyen como una sola aplicacion web progresiva.

---

## 2. Modulos del Panel de Control Administrativo

El panel de control se accede desde la ruta `/control` y esta compuesto por los siguientes modulos funcionales de la Version 1.0:

---

### 2.1 Dashboard — Centro de Operaciones

**Ruta:** `/control/dashboard`

El dashboard es la pantalla principal del panel. Presenta en tiempo real el estado del negocio mediante los siguientes elementos:

**Indicadores clave de desempeno (KPIs):**
- Ventas generadas desde la aplicacion movil
- Reservaciones activas en el sistema
- Visitantes en sitio (en tiempo real)
- Ocupacion promedio de experiencias
- Tasa de conversion digital

**Otras secciones:**
- Rendimiento de experiencias: tabla con ingresos y porcentaje de ocupacion por experiencia
- Zonas de actividad en tiempo real dentro de la hacienda
- Agenda de proximos eventos
- Mapa interactivo de la hacienda con marcadores de puntos de interes

---

### 2.2 Reservaciones

**Ruta:** `/control/reservaciones`

Modulo de gestion completa del flujo de reservaciones.

**Funciones incluidas:**
- Visualizacion en tabla de todas las reservaciones con ordenamiento y busqueda
- Datos por reservacion: nombre del huesped, experiencia seleccionada, fecha y hora, numero de personas, monto total, canal de origen, lugar de procedencia, metodo de pago, referencia de pago, si el pago fue via app, telefono, correo electronico
- Creacion de nuevas reservaciones desde el panel
- Descarga de reporte en formato CSV
- Gestion de estados: Confirmada, Pendiente, Completada, Cancelada

---

### 2.3 Experiencias

**Ruta:** `/control/experiencias`

Modulo de administracion del catalogo de experiencias de la hacienda.

**Experiencias incluidas en el catalogo inicial:**
1. Catas de vino — 60 min — $1,250 por persona — capacidad 28 personas
2. Recorrido por vinedos — 90 min — $980 por persona — capacidad 32 personas
3. Cena romantica — 120 min — $2,800 por persona — capacidad 18 personas
4. Picnic entre vinedos — 150 min — $1,480 por persona — capacidad 22 personas
5. Restaurante — libre — $640 por persona — capacidad 120 personas
6. Evento privado — variable — $12,500 — capacidad 1 grupo

**Funciones del modulo:**
- Listado de experiencias con metricas de ingresos totales, porcentaje de ocupacion y numero de reservaciones acumuladas
- Filtrado y busqueda por nombre o categoria
- Gestion de estados: Activa, Alta demanda, Limitada

---

### 2.4 Disponibilidad

**Ruta:** `/control/disponibilidad`

Modulo de gestion de la disponibilidad de slots por experiencia y por fecha.

**Funciones incluidas:**
- Visualizacion de slots de disponibilidad por experiencia seleccionada
- Datos por slot: capacidad total, lugares reservados, estado
- Gestion de estados por slot: Disponible, Alta demanda, Bloqueado, Cerrado
- Bloqueo manual de slots con campo de notas justificativas
- Vista por dia y por mes

---

### 2.5 Eventos

**Ruta:** `/control/eventos`

Modulo de gestion del calendario de eventos especiales de la hacienda.

**Eventos en el catalogo inicial:**
1. Festival 1000 Copas — 18 jul — 280 lugares — $421,600 ingresos proyectados
2. Vendimia Hacienda de Letras — 1 ago — 360 lugares
3. Espuma y Vino — 15 ago — 140 lugares
4. Cena de Maridaje — 29 ago — 64 lugares
5. Evento corporativo privado — 10 oct — 90 lugares

**Funciones del modulo:**
- Listado de eventos con porcentaje de ocupacion e ingresos
- Identidades visuales diferenciadas por tipo de evento
- Gestion de estados: Publicado, Borrador, Privado

---

### 2.6 Clientes (CRM)

**Ruta:** `/control/clientes`

Modulo de gestion de relaciones con clientes con segmentacion por valor.

**Segmentos de clientes:**
- VIP — alto ticket, membresia Wine Club activa
- Alto valor — gasto significativo, recurrente
- Recurrente — visitas frecuentes, ticket medio
- En desarrollo — potencial de crecimiento
- En riesgo — sin actividad reciente

**Datos por cliente:**
- Nombre y perfil
- Total gastado historico
- Frecuencia de visitas
- Canal de adquisicion
- Estado de membresia Wine Club
- Oportunidades de reactivacion y venta adicional

---

### 2.7 Promociones

**Ruta:** `/control/promociones`

Modulo de creacion y seguimiento de campanas promocionales.

**Tipos de promocion disponibles:**
- Descuento en experiencias
- Descuento en eventos
- Descuento en vino
- Oferta Wine Club
- Promocion personalizada

**Funciones del modulo:**
- Creacion de promociones con titulo, descripcion, tipo y audiencia objetivo
- Segmentacion de audiencia
- Configuracion multicanal: Email, notificacion push, in-app, banner
- Seguimiento de: presupuesto asignado, tasa de conversion, asistencia esperada vs. real

---

### 2.8 Configuracion

**Ruta:** `/control/configuracion`

Modulo de ajustes del perfil administrativo y preferencias del sistema.

**Ajustes disponibles:**
- Nombre del administrador
- Rol del administrador
- Correo electronico de contacto
- Idioma de la interfaz (Espanol / Ingles)
- Los cambios de idioma se reflejan en toda la plataforma incluyendo la interface de IA

---

### 2.9 Vista Previa de la App Movil

**Ruta:** `/control/app`

Modulo especial que permite al personal de la hacienda visualizar en tiempo real como ve el cliente la aplicacion movil, directamente desde el panel de control.

- En escritorio: se muestra un marco de telefono (estilo iPhone) con la aplicacion completa en su interior
- En dispositivo movil: se muestra la aplicacion directamente en pantalla completa
- Navegacion completa entre las 12 pantallas de la app del huesped

---

## 3. Modulos de la Aplicacion Movil del Huesped

La aplicacion movil representa la experiencia del cliente final. Contiene 12 pantallas organizadas con navegacion inferior de 5 tabs.

---

### 3.1 Pantalla de Inicio (Home)

**Tab:** Inicio

- Hero banner de bienvenida con imagen de la hacienda
- Acciones rapidas: Comprar vino, Reservar experiencia, Ver eventos, Wine Club
- Vitrina de vinos destacados (4 etiquetas en presentacion visual)
- Acceso directo al Sommelier con inteligencia artificial (ALQIA)

---

### 3.2 Tienda de Vinos

**Tab:** Tienda

- Catalogo de vinos con buscador integrado
- Filtros por: Tipo de vino, Uva, Precio, Cosecha, Maridaje sugerido
- Vista en cuadricula de 6 etiquetas con insignias especiales (Mas vendido, Edicion especial)
- Llamada a la accion para membresia Wine Club

**Etiquetas del catalogo inicial:**
1. 3 Mosqueteros — Cabernet Sauvignon 2021 — $300
2. Precioso Regalo — Tempranillo 2021 — $300
3. Ruby Amor Eterno — Ensamble 2022 — $300
4. El Greco — Syrah 2021 — $350
5. DArtagnan — Malbec 2022 — $380
6. Muscat — Muscat 2023 — $320

---

### 3.3 Detalle de Vino

Pantalla de detalle por etiqueta, accesible desde la tienda.

- Imagen del vino
- Nombre, tipo, uva, cosecha
- Precio con controles de cantidad (+ y -)
- Ficha tecnica: uva, cosecha, origen, temperatura de servicio recomendada
- Calificacion y resenas de otros clientes
- Boton "Agregar al carrito"

---

### 3.4 Experiencias

**Tab:** Experiencias

- Filtros de categoria: Todas, Catas, Recorridos, Gastronomia, Especiales
- Listado de 6 experiencias con tarjeta visual, duracion, precio y capacidad disponible
- Boton de reserva directa desde la tarjeta

---

### 3.5 Eventos

**Tab:** (accesible desde Home y menu)

- Filtros de categoria: Todos, Festivales, Vendimias, Gastronomia, Privados
- Listado de eventos proximos y estacionales
- Codigo QR de boletos integrado
- Informacion: lugar, fecha, horario

---

### 3.6 Detalle de Evento

Pantalla de detalle por evento, accesible desde la lista de eventos.

- Hero con imagen principal y titulo del evento
- Fecha, horario, lugar y tipo de entrada
- Lista de beneficios incluidos en la entrada
- Precio por boleto con selector de cantidad
- Boton "Comprar boletos"

---

### 3.7 Reservaciones

Flujo de reservacion de experiencias paso a paso.

**Pasos del flujo:**
1. Seleccion de experiencia
2. Seleccion de fecha en calendario interactivo
3. Seleccion de horario (4 opciones disponibles por dia)
4. Seleccion de numero de personas
5. Pantalla de confirmacion

---

### 3.8 Mapa Interactivo

**Tab:** (accesible desde el menu y desde Home)

- Mapa 3D interactivo renderizado con Mapbox
- Marcadores de puntos de interes: Terraza 1854, Restaurante, Cava, Punto de encuentro
- Buscador de lugares dentro de la hacienda
- Botones de accion: Centrar ubicacion, Trazar ruta
- Tarjeta informativa del lugar seleccionado

---

### 3.9 Wine Club

**Tab:** Club

- Informacion de la membresia actual del usuario (nivel: Oro Reserve)
- Puntos acumulados
- Listado de beneficios activos: Selecciones especiales mensuales, Acceso preferente a eventos, Experiencias privadas, Beneficios personalizados
- Proximo beneficio destacado con contador

---

### 3.10 Carrito de Compras

**Tab:** (accesible desde header y tienda)

- Listado de productos en carrito con imagen, nombre y precio
- Controles de cantidad por producto (+ y -)
- Eliminar producto individualmente
- Calculo automatico: subtotal, costo de envio, descuentos aplicados, total
- Boton "Confirmar pago"

---

### 3.11 Perfil del Usuario

**Tab:** Mi cuenta

- Avatar e informacion personal del usuario
- Informacion de membresia Wine Club (nivel, puntos)
- Estadisticas de actividad: reservaciones realizadas, compras, boletos, puntos acumulados
- Seccion "Mi actividad": historial de reservaciones, compras, boletos y beneficios
- Seccion "Mi cuenta": datos personales, metodos de pago, notificaciones, configuracion

---

### 3.12 Sommelier ALQIA (Inteligencia Artificial)

**Acceso:** Desde Home y menu principal

- Asistente de sommeleria con inteligencia artificial integrada bajo la marca ALQIA
- Sugerencias de inicio rapido: "Un vino para carnes rojas", "Quiero hacer un regalo", "Algo ligero para una cena"
- Interfaz de chat interactivo
- Motor de recomendaciones personalizadas de vino segun preferencias del usuario

---

## 4. Pagina Publica de Bienvenida

**Ruta:** `/`

Pagina de acceso inicial para clientes nuevos y recurrentes.

- Hero visual con tres experiencias destacadas de la hacienda: Catas, Eventos, Bodas
- Presentacion de beneficios del Wine Club
- Flujo de onboarding de 3 pasos: Descubre, Reserva, Disfruta
- Modal de inicio de sesion
- Modal de registro de cuenta nueva
- Navegacion principal de la marca

---

## 5. Modulos Planificados para Versiones Futuras

Los siguientes modulos estan incluidos en la plataforma como estructura preparada (mockups funcionales) pero no forman parte del alcance operativo de la Version 1.0. Se listan para referencia contractual de la hoja de ruta:

| Modulo | Descripcion |
|---|---|
| Inventario | Control de stock de vinos, botellas, SKUs activos y ordenes en transito |
| Logistica | Gestion de envios, rutas y estatus de entrega |
| Distribuidores | Mapa de red de distribuidores y cobertura regional |
| Campanas | Wizard de campanas de marketing multisegmento |
| Inteligencia | Oportunidades, pronosticos y acciones impulsadas por IA |
| Reportes | Reportes comerciales, de reservaciones, clientes y marketing |

---

## 6. Componentes Transversales del Sistema

Los siguientes componentes son parte de la infraestructura visual y funcional que sustenta todos los modulos anteriores:

### 6.1 Navegacion del Panel de Control
- Barra lateral con navegacion agrupada y logotipo de la marca
- Barra superior con perfil del administrador, fecha/hora, alertas de operacion, selector de idioma y buscador global

### 6.2 Sistema de Estado Global
- Contexto de preferencias del administrador persistido en almacenamiento local
- Campos: nombre, rol, correo, idioma
- Soporte bilingue Espanol/Ingles en toda la plataforma

### 6.3 Sistema de Diseno y Paleta Visual
- Paleta de marca: borgoña, dorado, neutrales oscuros
- Variables de color, tipografia, sombras y radios definidos como tokens de diseno
- Diseño responsivo: desde dispositivos moviles hasta monitores de escritorio

### 6.4 Mapa Interactivo Compartido
- Motor de mapas: Mapbox GL JS (version 3.25)
- Soporte de: marcadores con etiquetas, rutas, terreno 3D, niebla atmosferica, inclinacion y rotacion libre
- Usado en: Dashboard de control y pantalla de Mapa de la app movil

### 6.5 Insignias de Estado
- Componente unificado de estados con traduccion automatica ES/EN
- Estados cubiertos: Confirmada, Publicado, Activa, Pendiente, Cancelada, Bloqueada, Completada

---

## 7. Tecnologias que Componen la Plataforma

| Capa | Tecnologia | Version |
|---|---|---|
| Framework UI | React | 19.2 |
| Enrutamiento | React Router | 7.18 |
| Lenguaje | TypeScript | 5.x |
| Estilos | Tailwind CSS | 4.3 |
| Mapas | Mapbox GL JS | 3.25 |
| Iconografia | Lucide React | 1.22 |
| Herramienta de construccion | Vite | 6.x |
| Linting | Oxlint | — |

---

## 8. Resumen del Alcance por Superficie

| Superficie | Modulos Operativos en v1.0 | Pantallas / Paginas |
|---|---|---|
| Panel de Control | 9 modulos | 10 paginas de control |
| App Movil del Huesped | 12 pantallas | 12 pantallas navegables |
| Pagina Publica | 1 pagina | 1 pagina con modales |
| **Total Version 1.0** | **22 modulos / pantallas operativas** | **23 vistas** |

Los 6 modulos de la hoja de ruta futura estan presentes como estructura preparada y no cuentan como alcance entregado en esta version.

---

*Documento generado el 8 de julio de 2026 para fines contractuales de la Version 1.0 de la Plataforma Digital Hacienda de Letras.*
