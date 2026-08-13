begin;

-- Reemplaza traducciones seed y completa el contenido editorial que la app
-- sirve en inglés. Los registros base en español permanecen intactos.
with translations(entity_type, base_slug, en_slug, title, subtitle, short_description, description, overrides) as (
  values
    ('wine', 'ruby-amor-eterno', 'ruby-amor-eterno-en', 'Ruby Amor Eterno', 'Sweet red table wine', null,
      'A fruit-forward sweet red wine with a deep garnet color and expressive notes of plum and red berries.',
      jsonb_build_object(
        'grape_variety', 'Ruby Cabernet',
        'origin', 'Aguascalientes',
        'tasting_notes', 'Appearance: intense garnet red with ruby highlights, clear and medium-bodied. Nose: an intensely fruity profile led by plum. Palate: sweet and expressive, with red-berry notes and a smooth finish.',
        'pairing_notes', 'Mexican cuisine, chocolate desserts, forest berries and nuts.'
      )),
    ('wine', 'precioso-regalo', 'precioso-regalo-en', 'Precioso Regalo', 'Sweet red table wine', null,
      'A bright scarlet sweet wine with floral aromas and a fresh expression of red berries.',
      jsonb_build_object(
        'grape_variety', 'Ruby Cabernet / Syrah',
        'origin', 'Aguascalientes',
        'tasting_notes', 'Appearance: intense, brilliant scarlet red, clear and medium-bodied. Nose: floral aromas accompanied by a sweet, fruity character. Palate: red berries led by cherry, redcurrant and blueberry.',
        'pairing_notes', 'Dark or milk chocolate desserts and dishes prepared with red berries.'
      )),
    ('wine', 'tres-mosqueteros', 'tres-mosqueteros-en', '3 Mosqueteros', 'Dry red table wine', null,
      'A structured dry red blend with ripe red fruit, oak and deep aging notes.',
      jsonb_build_object(
        'grape_variety', 'Reserve Malbec / Syrah / Merlot',
        'origin', 'Aguascalientes',
        'tasting_notes', 'Appearance: mahogany hues and a full body. Nose: ripe red fruit, oak and cocoa notes. Palate: dry, structured and firm, with defined tannins and ripe-fruit presence.',
        'pairing_notes', 'Cuts of red meat, spiced dishes, aged cheeses and cured meats.'
      )),
    ('wine', 'el-greco', 'el-greco-en', 'El Greco', 'Dry red table wine', null,
      'An elegant, balanced Gran Reserva Malbec with notes of plum, dark berries and a fresh palate.',
      jsonb_build_object(
        'grape_variety', 'Gran Reserva Malbec',
        'origin', 'Aguascalientes',
        'tasting_notes', 'Appearance: purple with violet edges, clear and medium-bodied. Nose: a mature, medium-intensity profile. Palate: silky texture with black plum and forest-berry notes; fresh and balanced.',
        'pairing_notes', 'Lean meats, grilled vegetables and mature or spiced cheeses.'
      )),
    ('wine', 'muscat', 'muscat-en', 'Muscat', 'Sweet white table wine', null,
      'A fresh and aromatic sweet white wine with green apple, pear and delicate fruit notes.',
      jsonb_build_object(
        'grape_variety', 'Muscat Blanc',
        'origin', 'Aguascalientes',
        'tasting_notes', 'Appearance: straw yellow with subtle green highlights, brilliant and clear. Nose: sweet and fresh with green apple and pear. Palate: fruit-forward, recalling green apple, pear and quince.',
        'pairing_notes', 'Lightly seasoned chicken, creamy dishes, salads, cheese and fruit desserts, or ice cream. It may also be enjoyed as a digestif.'
      )),
    ('wine', 'dartagnan', 'dartagnan-en', 'D’Artagnan', 'Dry red table wine', null,
      'A firm, aromatic red reserve with red fruit, plum and a spiced finish.',
      jsonb_build_object(
        'grape_variety', 'Reserve Tempranillo / Merlot',
        'origin', 'Aguascalientes',
        'tasting_notes', 'Appearance: violet and redcurrant hues, clear and medium-bodied. Nose: red fruit, blackberry and plum. Palate: structured, with cinnamon and tobacco notes and balanced tannins.',
        'pairing_notes', 'Grilled or sauced red meats, veal and medium- to full-flavored cheeses.'
      )),
    ('wine', 'phortos', 'phortos-en', 'Phortos', 'Late-harvest wine / sweet red wine', null,
      'A deep, sweet late-harvest red wine with a warm character, created to accompany an unhurried after-dinner moment.',
      jsonb_build_object(
        'grape_variety', 'Malbec / Salvador',
        'origin', 'Aguascalientes',
        'tasting_notes', 'Appearance: deep, dark color with garnet hues. Nose: intense, elegant aromas developed through its winemaking. Palate: generous sweetness with a warm, lingering mouthfeel.',
        'pairing_notes', 'Fruit tarts, selected desserts and after-dinner service.'
      )),
    ('wine', 'athos', 'athos-en', 'Athos', 'Semi-dry red table wine', null,
      'A semi-dry Sangiovese-Nebbiolo red blend made in Aguascalientes.',
      jsonb_build_object(
        'grape_variety', 'Sangiovese / Nebbiolo',
        'origin', 'Aguascalientes',
        'pairing_notes', 'Meat and pepper skewers, pasta with seasoned sauces, and enchiladas.'
      )),
    ('wine', 'dulce-apapacho', 'dulce-apapacho-en', 'Dulce Apapacho', 'Sweet blue table wine', null,
      'A distinctive sweet blue wine with a fresh, aromatic fruit profile, made from Muscat and Chardonnay.',
      jsonb_build_object(
        'grape_variety', 'Muscat / Chardonnay',
        'origin', 'Aguascalientes',
        'tasting_notes', 'Appearance: brilliant indigo blue with highlights and a medium body. Nose: fruity aromas of peach, pear and apple. Palate: smooth and fruit-forward, with blueberry, blackberry and peach notes.',
        'pairing_notes', 'Apple, pear, peach or lemon desserts. It may also be enjoyed as a digestif.'
      )),
    ('experience', 'cata-de-vinos', 'wine-tasting', 'Wine tasting', 'Guided tasting at Hacienda de Letras',
      'A guided tasting of Hacienda de Letras wines.',
      'A guided wine-tasting experience created to discover the character of Hacienda de Letras. Schedule and availability require operational confirmation.',
      jsonb_build_object('category', 'Tastings', 'location', 'Hacienda de Letras')),
    ('experience', 'recorrido-por-los-vinedos', 'vineyard-tour', 'Vineyard tour', 'Tour with one glass of wine included',
      'A vineyard tour with one glass of wine included.',
      'A tour through the Hacienda de Letras vineyards. Includes one glass of wine. Published schedules are subject to operational confirmation.',
      jsonb_build_object('category', 'Tours', 'location', 'Hacienda de Letras vineyards')),
    ('experience', 'degustacion-de-5-vinos', 'five-wine-tasting', 'Five-wine tasting', 'A tasting of five labels',
      'A tasting of five wines, one ounce per wine.',
      'A tasting of five Hacienda de Letras wines, served as one ounce per wine. Labels are confirmed according to availability.',
      jsonb_build_object('category', 'Tastings', 'location', 'Hacienda de Letras')),
    ('experience', 'picnic-entre-vinedos', 'vineyard-picnic', 'Vineyard picnic', 'A picnic for two',
      'A picnic for two among the vineyards.',
      'A vineyard picnic for two. Includes the reserved setting, décor, food and wine. Operational confirmation is required.',
      jsonb_build_object('category', 'Gastronomy', 'location', 'Hacienda de Letras vineyards')),
    ('experience', 'cena-romantica-cava', 'romantic-cellar-dinner', 'Romantic dinner in the cellar', 'A cellar dinner for two',
      'A romantic dinner for two in the wine cellar.',
      'A romantic cellar dinner for two. Includes the private cellar setting, candles, petals, roses, a three-course dinner and a bottle of house wine. Lodging is not included.',
      jsonb_build_object('category', 'Gastronomy', 'location', 'Hacienda de Letras wine cellar'))
), source_rows as (
  select t.*, w.id as entity_id
  from translations t
  join public.wines w on t.entity_type = 'wine' and w.slug = t.base_slug
  union all
  select t.*, e.id as entity_id
  from translations t
  join public.experiences e on t.entity_type = 'experience' and e.slug = t.base_slug
)
insert into public.content_translations (
  entity_type, entity_id, locale, slug, title, subtitle, short_description,
  description, translation_status, publication_status, visible_in_app,
  published_at, metadata
)
select
  entity_type, entity_id, 'en-US', en_slug, title, subtitle, short_description,
  description, 'published_bilingual', 'published', true, now(),
  jsonb_build_object('source', 'production_bilingual_editorial_2026_08_13', 'overrides', overrides)
from source_rows
on conflict (entity_type, entity_id, locale) do update set
  slug = excluded.slug,
  title = excluded.title,
  subtitle = excluded.subtitle,
  short_description = excluded.short_description,
  description = excluded.description,
  translation_status = excluded.translation_status,
  publication_status = excluded.publication_status,
  visible_in_app = excluded.visible_in_app,
  publish_at = null,
  unpublish_at = null,
  archived_at = null,
  deleted_at = null,
  published_at = coalesce(public.content_translations.published_at, excluded.published_at),
  metadata = public.content_translations.metadata || excluded.metadata;

-- La API comercial usa traducciones dentro de metadata para cabañas,
-- restaurante, espacios y la vista agregada de experiencias.
with copy(table_name, slug, payload) as (
  values
    ('experiences', 'cata-de-vinos', jsonb_build_object('name','Wine tasting','title','Wine tasting','subtitle','Guided tasting at Hacienda de Letras','shortDescription','A guided tasting of Hacienda de Letras wines.','description','A guided wine-tasting experience created to discover the character of Hacienda de Letras. Schedule and availability require operational confirmation.','category','Tastings','location','Hacienda de Letras')),
    ('experiences', 'recorrido-por-los-vinedos', jsonb_build_object('name','Vineyard tour','title','Vineyard tour','subtitle','Tour with one glass of wine included','shortDescription','A vineyard tour with one glass of wine included.','description','A tour through the Hacienda de Letras vineyards. Includes one glass of wine. Published schedules are subject to operational confirmation.','category','Tours','location','Hacienda de Letras vineyards')),
    ('experiences', 'degustacion-de-5-vinos', jsonb_build_object('name','Five-wine tasting','title','Five-wine tasting','subtitle','A tasting of five labels','shortDescription','A tasting of five wines, one ounce per wine.','description','A tasting of five Hacienda de Letras wines, served as one ounce per wine. Labels are confirmed according to availability.','category','Tastings','location','Hacienda de Letras')),
    ('experiences', 'picnic-entre-vinedos', jsonb_build_object('name','Vineyard picnic','title','Vineyard picnic','subtitle','A picnic for two','shortDescription','A picnic for two among the vineyards.','description','A vineyard picnic for two. Includes the reserved setting, décor, food and wine. Operational confirmation is required.','category','Gastronomy','location','Hacienda de Letras vineyards')),
    ('experiences', 'cena-romantica-cava', jsonb_build_object('name','Romantic dinner in the cellar','title','Romantic dinner in the cellar','subtitle','A cellar dinner for two','shortDescription','A romantic dinner for two in the wine cellar.','description','A romantic cellar dinner for two. Includes the private cellar setting, candles, petals, roses, a three-course dinner and a bottle of house wine. Lodging is not included.','category','Gastronomy','location','Hacienda de Letras wine cellar')),
    ('cabin_packages', 'paquete-cabana', jsonb_build_object('name','Cabin Package','title','Cabin Package','subtitle','One night for two guests','description','A vineyard stay for two with breakfast and a welcome kit prepared by Hacienda de Letras.','priceUnit','couple','inclusions',jsonb_build_array('One-night stay','Breakfast included','Welcome kit','Bottle of wine','Wine glasses','Coffee','Bottled water'))),
    ('cabin_packages', 'paquete-vino', jsonb_build_object('name','Wine Package','title','Wine Package','subtitle','Lodging, vineyard tour and tasting for two','description','One night for two with breakfast, a welcome kit, a vineyard tour and a Hacienda de Letras wine tasting.','priceUnit','couple','inclusions',jsonb_build_array('One-night stay','Breakfast included','Welcome kit','Bottle of wine','Wine glasses','Coffee','Bottled water','Vineyard tour','Wine tasting'))),
    ('cabin_packages', 'paquete-romantico', jsonb_build_object('name','Romantic Package','title','Romantic Package','subtitle','Lodging and romantic dinner for two','description','One night for two with breakfast, a romantic three-course dinner and a Hacienda de Letras welcome kit.','priceUnit','couple','inclusions',jsonb_build_array('One-night stay','Breakfast included','Romantic three-course dinner','Welcome kit','Bottle of wine','Wine glasses','Coffee','Bottled water'))),
    ('restaurant_locations', 'restaurante-hacienda-de-letras', jsonb_build_object('name','Hacienda de Letras Restaurant','title','Hacienda de Letras Restaurant','description','The restaurant at Hacienda de Letras, with reservations available through the app.','address','Teodoro Olivares S/N, 20668 San Luis de Letras, Aguascalientes','location','Teodoro Olivares S/N, 20668 San Luis de Letras, Aguascalientes','city','Pabellón de Arteaga','state','Aguascalientes')),
    ('venue_spaces', 'jardin-lateral-bugambilias', jsonb_build_object('name','Bugambilias Side Garden','title','Bugambilias Side Garden','description','A side garden for social and corporate events, with an approximate capacity of 450 guests.')),
    ('venue_spaces', 'jardin-central-entre-vinedos', jsonb_build_object('name','Among the Vineyards Central Garden','title','Among the Vineyards Central Garden','description','A central vineyard setting for events, with an approximate capacity of 400 guests.')),
    ('venue_spaces', 'jardin-nogales', jsonb_build_object('name','Nogales Garden','title','Nogales Garden','description','A spacious garden for celebrations and large-format events, with an approximate capacity of 900 guests.')),
    ('venue_spaces', 'cava', jsonb_build_object('name','Wine Cellar','title','Wine Cellar','description','A wine cellar for private gatherings and experiences, with an approximate capacity of 80 guests.')),
    ('venue_spaces', 'jardin-principal-entrada', jsonb_build_object('name','Main Entrance Garden','title','Main Entrance Garden','description','The main entrance garden for large events, with an approximate capacity of up to 1,200 guests.'))
)
update public.experiences target
set metadata = coalesce(target.metadata, '{}'::jsonb) || jsonb_build_object(
  'translations', coalesce(target.metadata->'translations', '{}'::jsonb) || jsonb_build_object('en-US', copy.payload, 'en', copy.payload)
)
from copy
where copy.table_name = 'experiences' and target.slug = copy.slug;

with copy(slug, payload) as (
  values
    ('paquete-cabana', jsonb_build_object('name','Cabin Package','title','Cabin Package','subtitle','One night for two guests','description','A vineyard stay for two with breakfast and a welcome kit prepared by Hacienda de Letras.','priceUnit','couple','inclusions',jsonb_build_array('One-night stay','Breakfast included','Welcome kit','Bottle of wine','Wine glasses','Coffee','Bottled water'))),
    ('paquete-vino', jsonb_build_object('name','Wine Package','title','Wine Package','subtitle','Lodging, vineyard tour and tasting for two','description','One night for two with breakfast, a welcome kit, a vineyard tour and a Hacienda de Letras wine tasting.','priceUnit','couple','inclusions',jsonb_build_array('One-night stay','Breakfast included','Welcome kit','Bottle of wine','Wine glasses','Coffee','Bottled water','Vineyard tour','Wine tasting'))),
    ('paquete-romantico', jsonb_build_object('name','Romantic Package','title','Romantic Package','subtitle','Lodging and romantic dinner for two','description','One night for two with breakfast, a romantic three-course dinner and a Hacienda de Letras welcome kit.','priceUnit','couple','inclusions',jsonb_build_array('One-night stay','Breakfast included','Romantic three-course dinner','Welcome kit','Bottle of wine','Wine glasses','Coffee','Bottled water')))
)
update public.cabin_packages target
set metadata = coalesce(target.metadata, '{}'::jsonb) || jsonb_build_object(
  'translations', coalesce(target.metadata->'translations', '{}'::jsonb) || jsonb_build_object('en-US', copy.payload, 'en', copy.payload)
)
from copy where target.slug = copy.slug;

update public.restaurant_locations target
set metadata = coalesce(target.metadata, '{}'::jsonb) || jsonb_build_object(
  'translations', coalesce(target.metadata->'translations', '{}'::jsonb) || jsonb_build_object(
    'en-US', jsonb_build_object('name','Hacienda de Letras Restaurant','title','Hacienda de Letras Restaurant','description','The restaurant at Hacienda de Letras, with reservations available through the app.','address','Teodoro Olivares S/N, 20668 San Luis de Letras, Aguascalientes','location','Teodoro Olivares S/N, 20668 San Luis de Letras, Aguascalientes','city','Pabellón de Arteaga','state','Aguascalientes'),
    'en', jsonb_build_object('name','Hacienda de Letras Restaurant','title','Hacienda de Letras Restaurant','description','The restaurant at Hacienda de Letras, with reservations available through the app.','address','Teodoro Olivares S/N, 20668 San Luis de Letras, Aguascalientes','location','Teodoro Olivares S/N, 20668 San Luis de Letras, Aguascalientes','city','Pabellón de Arteaga','state','Aguascalientes')
  )
)
where target.slug = 'restaurante-hacienda-de-letras';

with copy(slug, payload) as (
  values
    ('jardin-lateral-bugambilias', jsonb_build_object('name','Bugambilias Side Garden','title','Bugambilias Side Garden','description','A side garden for social and corporate events, with an approximate capacity of 450 guests.')),
    ('jardin-central-entre-vinedos', jsonb_build_object('name','Among the Vineyards Central Garden','title','Among the Vineyards Central Garden','description','A central vineyard setting for events, with an approximate capacity of 400 guests.')),
    ('jardin-nogales', jsonb_build_object('name','Nogales Garden','title','Nogales Garden','description','A spacious garden for celebrations and large-format events, with an approximate capacity of 900 guests.')),
    ('cava', jsonb_build_object('name','Wine Cellar','title','Wine Cellar','description','A wine cellar for private gatherings and experiences, with an approximate capacity of 80 guests.')),
    ('jardin-principal-entrada', jsonb_build_object('name','Main Entrance Garden','title','Main Entrance Garden','description','The main entrance garden for large events, with an approximate capacity of up to 1,200 guests.'))
)
update public.venue_spaces target
set metadata = coalesce(target.metadata, '{}'::jsonb) || jsonb_build_object(
  'translations', coalesce(target.metadata->'translations', '{}'::jsonb) || jsonb_build_object('en-US', copy.payload, 'en', copy.payload)
)
from copy where target.slug = copy.slug;

-- Los registros que se identifican explícitamente como seed/test dejan de
-- aparecer en la app. No se eliminan y conservan historial para auditoría.
update public.events
set visible_in_app = false,
    status = 'inactive',
    unpublish_at = coalesce(unpublish_at, now()),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('hidden_reason', 'legacy_seed_content')
where (slug ilike '%seed%' or title ilike '%seed%' or description ilike '%seed/test%')
  and deleted_at is null;

update public.promotions
set visible_in_app = false,
    status = 'inactive',
    unpublish_at = coalesce(unpublish_at, now()),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('hidden_reason', 'legacy_seed_content')
where (code ilike '%seed%' or name ilike '%seed%' or description ilike '%seed/test%')
  and deleted_at is null;

update public.membership_plans
set visible_in_app = false,
    status = 'inactive',
    unpublish_at = coalesce(unpublish_at, now()),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('hidden_reason', 'legacy_seed_content')
where (code ilike '%seed%' or name ilike '%seed%' or description ilike '%seed/test%')
  and deleted_at is null;

commit;
