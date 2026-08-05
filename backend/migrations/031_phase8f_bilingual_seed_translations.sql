begin;

with translations(slug, translated_slug, title, subtitle, short_description, description) as (
  values
    ('tres-mosqueteros-seed', 'three-musketeers-seed', 'Three Musketeers Seed', 'Test wine', null, 'Initial catalog seed/test data'),
    ('muscat-seed', 'muscat-seed-en', 'Muscat Seed', 'Test wine', null, 'Initial catalog seed/test data'),
    ('ruby-seed', 'ruby-seed-en', 'Ruby Seed', 'Test wine', null, 'Initial catalog seed/test data')
)
insert into public.content_translations (
  entity_type, entity_id, locale, slug, title, subtitle, short_description, description,
  publication_status, translation_status, visible_in_app, published_at, metadata
)
select
  'wine',
  wines.id,
  'en-US',
  translations.translated_slug,
  translations.title,
  translations.subtitle,
  translations.short_description,
  translations.description,
  'published',
  'published_bilingual',
  true,
  now(),
  jsonb_build_object('phase', '8F', 'source', '031_phase8f_bilingual_seed_translations')
from translations
join public.wines on wines.slug = translations.slug
on conflict (entity_type, entity_id, locale) do update
set slug = excluded.slug,
    title = excluded.title,
    subtitle = excluded.subtitle,
    short_description = excluded.short_description,
    description = excluded.description,
    publication_status = excluded.publication_status,
    translation_status = excluded.translation_status,
    visible_in_app = excluded.visible_in_app,
    published_at = coalesce(public.content_translations.published_at, excluded.published_at),
    metadata = public.content_translations.metadata || excluded.metadata,
    updated_at = now();

with translations(slug, translated_slug, title, subtitle, short_description, description) as (
  values
    ('cata-hacienda-seed', 'estate-tasting-seed', 'Estate Tasting Seed', 'Test experience', 'Guided tasting seed/test', 'Experience seed/test data'),
    ('picnic-vinedo-seed', 'vineyard-picnic-seed', 'Vineyard Picnic Seed', 'Test experience', 'Picnic seed/test', 'Experience seed/test data')
)
insert into public.content_translations (
  entity_type, entity_id, locale, slug, title, subtitle, short_description, description,
  publication_status, translation_status, visible_in_app, published_at, metadata
)
select
  'experience',
  experiences.id,
  'en-US',
  translations.translated_slug,
  translations.title,
  translations.subtitle,
  translations.short_description,
  translations.description,
  'published',
  'published_bilingual',
  true,
  now(),
  jsonb_build_object('phase', '8F', 'source', '031_phase8f_bilingual_seed_translations')
from translations
join public.experiences on experiences.slug = translations.slug
on conflict (entity_type, entity_id, locale) do update
set slug = excluded.slug,
    title = excluded.title,
    subtitle = excluded.subtitle,
    short_description = excluded.short_description,
    description = excluded.description,
    publication_status = excluded.publication_status,
    translation_status = excluded.translation_status,
    visible_in_app = excluded.visible_in_app,
    published_at = coalesce(public.content_translations.published_at, excluded.published_at),
    metadata = public.content_translations.metadata || excluded.metadata,
    updated_at = now();

with translations(slug, translated_slug, title, subtitle, short_description, description) as (
  values
    ('vendimia-seed', 'harvest-festival-seed', 'Harvest Festival Seed', 'Test event', 'Harvest seed/test', 'Event seed/test data'),
    ('leyendas-seed', 'legends-afternoon-seed', 'Legends Afternoon Seed', 'Test event', 'Legends seed/test', 'Event seed/test data')
)
insert into public.content_translations (
  entity_type, entity_id, locale, slug, title, subtitle, short_description, description,
  publication_status, translation_status, visible_in_app, published_at, metadata
)
select
  'event',
  events.id,
  'en-US',
  translations.translated_slug,
  translations.title,
  translations.subtitle,
  translations.short_description,
  translations.description,
  'published',
  'published_bilingual',
  true,
  now(),
  jsonb_build_object('phase', '8F', 'source', '031_phase8f_bilingual_seed_translations')
from translations
join public.events on events.slug = translations.slug
on conflict (entity_type, entity_id, locale) do update
set slug = excluded.slug,
    title = excluded.title,
    subtitle = excluded.subtitle,
    short_description = excluded.short_description,
    description = excluded.description,
    publication_status = excluded.publication_status,
    translation_status = excluded.translation_status,
    visible_in_app = excluded.visible_in_app,
    published_at = coalesce(public.content_translations.published_at, excluded.published_at),
    metadata = public.content_translations.metadata || excluded.metadata,
    updated_at = now();

with translations(code, title, description) as (
  values
    ('SEED10', 'Seed 10', 'Seed/test promotion'),
    ('CLUBSEED', 'Club Seed', 'Seed/test promotion')
)
insert into public.content_translations (
  entity_type, entity_id, locale, title, description,
  publication_status, translation_status, visible_in_app, published_at, metadata
)
select
  'promotion',
  promotions.id,
  'en-US',
  translations.title,
  translations.description,
  'published',
  'published_bilingual',
  true,
  now(),
  jsonb_build_object('phase', '8F', 'source', '031_phase8f_bilingual_seed_translations')
from translations
join public.promotions on promotions.code = translations.code
on conflict (entity_type, entity_id, locale) do update
set title = excluded.title,
    description = excluded.description,
    publication_status = excluded.publication_status,
    translation_status = excluded.translation_status,
    visible_in_app = excluded.visible_in_app,
    published_at = coalesce(public.content_translations.published_at, excluded.published_at),
    metadata = public.content_translations.metadata || excluded.metadata,
    updated_at = now();

with translations(code, title, description, benefits) as (
  values
    ('SEED-CLUB-BASE', 'Base Club Seed', 'Seed/test plan', '{"benefits":["discounts","sommelier"]}'::jsonb),
    ('SEED-CLUB-PREMIUM', 'Premium Club Seed', 'Seed/test plan', '{"benefits":["discounts","events","sommelier"]}'::jsonb)
)
insert into public.content_translations (
  entity_type, entity_id, locale, title, description, benefits,
  publication_status, translation_status, visible_in_app, published_at, metadata
)
select
  'membership_plan',
  membership_plans.id,
  'en-US',
  translations.title,
  translations.description,
  translations.benefits,
  'published',
  'published_bilingual',
  true,
  now(),
  jsonb_build_object('phase', '8F', 'source', '031_phase8f_bilingual_seed_translations')
from translations
join public.membership_plans on membership_plans.code = translations.code
on conflict (entity_type, entity_id, locale) do update
set title = excluded.title,
    description = excluded.description,
    benefits = excluded.benefits,
    publication_status = excluded.publication_status,
    translation_status = excluded.translation_status,
    visible_in_app = excluded.visible_in_app,
    published_at = coalesce(public.content_translations.published_at, excluded.published_at),
    metadata = public.content_translations.metadata || excluded.metadata,
    updated_at = now();

commit;
