begin;

with public_knowledge(namespace, title, content, source_type, metadata) as (
  values
    (
      'hacienda.public.current',
      'Hacienda de Letras: identidad e historia pública actual',
      'La Hacienda de Letras está construida desde 1854 y se ubica en San Luis de Letras, Pabellón de Arteaga, Aguascalientes. La Hacienda declara más de 40 años de tradición como vinicultores, aproximadamente 120 hectáreas plantadas, más de 18 variedades y una producción aproximada de 500 toneladas de uva al año. La cava es parte central de la experiencia enoturística. La oferta pública incluye recorridos de viñedo, catas, maridajes, eventos sociales y corporativos, bodas, fotografía y experiencias relacionadas con vino. Estas cifras son referencia pública; no describen disponibilidad, cupos, precios ni horarios vigentes.',
      'official_website',
      '{"source_url":"https://www.haciendadeletras.com/","source_date":"2026-08-17","confidence":"high","requires_client_validation":false,"operational":false}'::jsonb
    ),
    (
      'hacienda.public.current.wines',
      'Vinos publicados en el sitio oficial',
      E'3 Mosqueteros: Reserva Malbec, Syrah y Merlot; vino de mesa seco tinto; cosecha mostrada 2020; 12.5% alcohol; Aguascalientes; tonos caoba, cuerpo untuoso, frutos rojos maduros, maderas y cacao; seco y de tanicidad estructurada; maridaje con cortes finos de carne roja, platillos especiados, quesos madurados y carnes frías curadas.\nPrecioso Regalo: Ruby Cabernet y Syrah; dulce tinto; cosecha mostrada 2020; 11.5%; escarlata intenso; floral, dulce y frutal; cereza, grosella y arándano; maridaje con chocolate y postres con frutos rojos.\nRuby Amor Eterno: Ruby Cabernet; dulce tinto; cosecha mostrada 2020; 12.5%; rojo granate o rubí; ciruela y frutos rojos; maridaje con gastronomía mexicana, chocolate, frutos del bosque y nueces.\nEl Greco: Gran Reserva Malbec; seco tinto; cosecha mostrada 2020; 12.5%; púrpura con ribete violáceo; ciruela negra y berries; maridaje con carnes magras, vegetales a la plancha y quesos curados.\nMuscat: Muscat Blanc; dulce blanco; cosecha mostrada 2020; 10.5%; amarillo pajizo con tonos verdosos; manzana verde, pera y membrillo; maridaje con pollo suave, cremas, ensaladas, postres de queso, frutas y helado; también como digestivo.\nD''Artagnan: Reserva Tempranillo y Merlot; seco tinto; cosecha mostrada 2020; 12.5%; tonos violáceos y grosella; zarzamora, ciruela, canela y tabaco; tanicidad equilibrada; maridaje con carne roja, ternera y quesos medios o fuertes.\nNo está documentado por Hacienda el origen oficial de los nombres Amor Eterno, Precioso Regalo, El Greco, D''Artagnan o 3 Mosqueteros. Nunca inventar ese origen.',
      'official_website',
      '{"source_url":"https://www.haciendadeletras.com/tienda/","source_date":"2026-08-17","confidence":"high","requires_client_validation":true,"operational":false,"note":"El catálogo y las cosechas visibles pueden cambiar; el catálogo publicado en backend tiene prioridad."}'::jsonb
    ),
    (
      'hacienda.history.verified',
      'Historia vitivinícola documentada',
      'Fuente histórica, no dato operativo actual: Luis Carlos Hernández Chacón era ingeniero agrónomo especializado en viticultura y enólogo con formación en Montpellier, Francia. Luis Carlos Hernández Chacón y el Ing. Carlos Salas Luján fundaron Bodega Dinastía en 1986. En 2000 Bodega Dinastía pasó a convertirse en Vinícola Hacienda de Letras. La vinícola se encuentra en la antigua Hacienda de Letras y la cava ocupa una antigua troje. La fuente sitúa los viñedos alrededor de 2,000 metros de altitud y reportaba, en el momento documentado, alrededor de 100 hectáreas y unas 25 variedades. No mezclar esas cifras históricas con las cifras actuales del sitio oficial.',
      'historical_research',
      '{"source_url":"https://www.researchgate.net/publication/381548027_Mexican_wine_heritage_history_culture_and_economic_space_El_Patrimonio_Vitivinicola_Mexicano_historia_cultura_y_espacio_economico","source_date":"2026-08-17","confidence":"medium_high","requires_client_validation":true,"operational":false}'::jsonb
    ),
    (
      'hacienda.history.2008',
      'Historia oral y etiquetas documentadas en 2008',
      E'Fuente histórica de 2008, no dato operativo actual: Carlos Salas Luján aparece como propietario de Hacienda Las Letras y Luis Carlos Hernández Chacón como director general. El reportaje narra que se conocieron cuando Carlos dirigía Compañía Vinícola Vergel y contrató a Luis Carlos como técnico viticultor-enólogo; después fueron socios en proyectos agrícolas y ganaderos. En 2008 la vinícola era descrita como pequeña o artesanal, con 2,000 a 2,500 cajas anuales, 110 hectáreas, aproximadamente un millón de kilos de uva y una selección de las mejores 50 toneladas para vino.\nEtiquetas históricas: 425 era Cabernet Sauvignon y aludía al 425 aniversario de la fundación de Zacatecas celebrado en 2002. Tempo era un ensamble Merlot, Cabernet Sauvignon y Malbec. Montgrand era un Malbec 2006; se documentó la visita de Priscilla Perales, Nuestra Belleza México 2005, y su participación en el pisado tradicional de uva. No afirmar que estas etiquetas sigan en producción.',
      'historical_source_2008',
      '{"source_url":"https://vinisfera.com/r/archivo/875","source_date":"2008-01-01","confidence":"medium_high","requires_client_validation":true,"operational":false}'::jsonb
    ),
    (
      'hacienda.public.spaces',
      'Espacios y capacidades publicados',
      'Referencia pública pendiente de confirmación de Hacienda: Jardín Lateral Bugambilias, hasta 450 invitados, 9 x 30 m, vista a viñedos y jacarandas. Jardín Central Entre viñedos, hasta 400 invitados, 9 x 55 m, vista a nogales y viñedos. Jardín Nogales, hasta 900 invitados, 20 x 60 m. Cava, hasta 80 invitados, 6 x 20 m. Jardín Principal Entrada, hasta 1,200 invitados, 25 x 60 m. Estas capacidades no deben usarse como cupo disponible ni como cotización actual; para operación manda el backend.',
      'official_website',
      '{"source_url":"https://www.haciendadeletras.com/espacios/","source_date":"2026-08-17","confidence":"high","requires_client_validation":true,"operational":false}'::jsonb
    ),
    (
      'hacienda.public.services',
      'Experiencias y servicios públicos de referencia',
      'Referencia pública pendiente de validación: cata mixta $300 MXN y aproximadamente 50 minutos; recorrido guiado por viñedos con una copa, $200 MXN, aproximadamente 30 minutos y publicado cada hora de 12:00 a 18:00; degustación de 5 vinos de una onza, $200 MXN; cena romántica en cava, $4,000 MXN por pareja e incluye espacio, velas y pétalos, ramo de rosas, cena de tres tiempos y botella de la casa; picnic con reservación previa, $2,000 MXN por pareja, comida para dos, botella y horario publicado 15:00 a 17:00; sesiones fotográficas individuales, pareja, familiares o grupos mediante cotización. Los precios, horarios, cupos y disponibilidad del backend siempre tienen prioridad y la información pública no autoriza una reserva.',
      'official_website',
      '{"source_url":"https://www.haciendadeletras.com/servicios/","source_date":"2026-08-17","confidence":"high","requires_client_validation":true,"operational":false}'::jsonb
    ),
    (
      'hacienda.public.visit',
      'Visita, restaurante, boutique y contacto público',
      'Boutique Hacienda: Teodoro Olivares S/N, San Luis de Letras; horario público lunes a domingo 11:00 a 19:00. Restaurante: misma ubicación; horario público lunes a viernes 11:00 a 18:00 y sábado-domingo 11:00 a 18:30. La web indica que no se exige reservación. Si la app tiene solicitudes de mesa habilitadas, explicar: Según la información pública actual no se exige reservación; si deseas asegurar una mesa y Hacienda tiene habilitada la solicitud en la app, puedes enviarla desde Restaurantes. Contactos públicos: cabañas/restaurante 449 285 13 76 y reservas@haciendadeletras.com; servicios/eventos 449 279 50 20 y servicios@haciendadeletras.com; contabilidad 449 224 58 59 y contabilidad@haciendadeletras.com; venta de vino 449 142 96 40 y ventas@haciendadeletras.com. La configuración del Centro de Control siempre tiene prioridad.',
      'official_website',
      '{"source_url":"https://www.haciendadeletras.com/servicios/","source_date":"2026-08-17","confidence":"high","requires_client_validation":true,"operational":false}'::jsonb
    ),
    (
      'hacienda.public.festivals',
      'Festivales y celebraciones públicamente identificados',
      'Festivales propios mencionados públicamente: Vendimia Hacienda de Letras, Festival Espuma y Vino, Festival El Vino en Colores y Festival 1,000 Copas de Vino. También se mencionan celebraciones o experiencias como Día de la Independencia, San Valentín, Halloween, Tardes de Leyenda, picnic, cenas románticas, Día de la Madre, Día del Padre, posadas y Año Nuevo. No asumir que un evento específico está vigente hoy; para fechas, boletos y disponibilidad usar exclusivamente los eventos publicados en backend.',
      'official_website',
      '{"source_url":"https://www.haciendadeletras.com/eventos/","source_date":"2026-08-17","confidence":"high","requires_client_validation":true,"operational":false}'::jsonb
    )
)
insert into public.sommelier_knowledge (namespace, title, content, source_type, metadata, active)
select namespace, title, content, source_type, metadata, true
from public_knowledge incoming
where not exists (
  select 1
  from public.sommelier_knowledge existing
  where existing.namespace = incoming.namespace
    and existing.title = incoming.title
);

commit;
