with expected_tables(name) as (
  values
    ('profiles'),('roles'),('user_roles'),('user_preferences'),('addresses'),
    ('customers'),('customer_tags'),('customer_tag_assignments'),('customer_notes'),
    ('wine_categories'),('wines'),('wine_images'),('wine_pairings'),('wine_service_notes'),
    ('experiences'),('experience_images'),('experience_slots'),('experience_blockouts'),
    ('events'),('event_images'),('event_ticket_types'),
    ('reservations'),('reservation_guests'),('reservation_status_history'),
    ('promotions'),('promotion_targets'),('promotion_redemptions'),
    ('carts'),('cart_items'),('orders'),('order_items'),('payments'),('payment_webhook_events'),
    ('access_passes'),('checkins'),
    ('membership_plans'),('memberships'),('loyalty_transactions'),('membership_benefits'),
    ('sommelier_knowledge'),('sommelier_sessions'),('sommelier_messages'),('sommelier_usage'),('sommelier_feedback'),
    ('campaigns'),('campaign_recipients'),('notifications'),('notification_devices'),
    ('inventory_locations'),('inventory_items'),('inventory_movements'),
    ('shipments'),('distributors'),('distributor_orders'),
    ('documents'),('audit_logs'),('system_settings'),('system_health')
),
expected_buckets(id, public) as (
  values
    ('brand', true),('wines', true),('events', true),('experiences', true),('promotions', true),
    ('avatars', false),('documents', false),('campaigns', false),('delivery-evidence', false)
),
public_tables as (
  select c.relname as name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
foreign_keys as (
  select conname
  from pg_constraint
  where contype = 'f' and connamespace = 'public'::regnamespace
),
indexes as (
  select indexname
  from pg_indexes
  where schemaname = 'public'
),
policies as (
  select tablename, policyname
  from pg_policies
  where schemaname = 'public'
),
bucket_rows as (
  select id, public from storage.buckets
),
seed_counts as (
  select jsonb_build_object(
    'roles', (select count(*) from public.roles),
    'wines', (
      select count(*)
      from public.wines
      where slug in (
        'ruby-amor-eterno',
        'precioso-regalo',
        'tres-mosqueteros',
        'el-greco',
        'muscat',
        'dartagnan',
        'phortos',
        'athos',
        'dulce-apapacho'
      )
    ),
    'experiences', (select count(*) from public.experiences where slug like '%-seed'),
    'events', (select count(*) from public.events where slug like '%-seed'),
    'promotions', (select count(*) from public.promotions where code in ('SEED10', 'CLUBSEED')),
    'membership_plans', (select count(*) from public.membership_plans where code like 'SEED-%'),
    'settings', (select count(*) from public.system_settings)
  ) as counts
)
select jsonb_build_object(
  'missing_tables', coalesce((select jsonb_agg(name order by name) from expected_tables et where not exists (select 1 from public_tables pt where pt.name = et.name)), '[]'::jsonb),
  'public_table_count', (select count(*) from public_tables),
  'rls_disabled', coalesce((select jsonb_agg(name order by name) from public_tables where not rls_enabled and name <> 'system_health'), '[]'::jsonb),
  'foreign_key_count', (select count(*) from foreign_keys),
  'index_count', (select count(*) from indexes),
  'policy_count', (select count(*) from policies),
  'missing_buckets', coalesce((select jsonb_agg(id order by id) from expected_buckets eb where not exists (select 1 from bucket_rows b where b.id = eb.id and b.public = eb.public)), '[]'::jsonb),
  'seed_counts', (select counts from seed_counts),
  'pgvector_exists', exists(select 1 from pg_extension where extname = 'vector'),
  'system_health_exists', exists(
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'system_health'
  ),
  'helper_functions', jsonb_build_object(
    'is_admin', exists(select 1 from pg_proc where proname = 'is_admin' and pronamespace = 'public'::regnamespace),
    'has_role', exists(select 1 from pg_proc where proname = 'has_role' and pronamespace = 'public'::regnamespace),
    'current_customer_id', exists(select 1 from pg_proc where proname = 'current_customer_id' and pronamespace = 'public'::regnamespace),
    'reserve_experience_slot', exists(select 1 from pg_proc where proname = 'reserve_experience_slot' and pronamespace = 'public'::regnamespace)
  ),
  'updated_at_trigger_count', (
    select count(*)
    from information_schema.triggers
    where trigger_schema = 'public' and trigger_name like 'set_%_updated_at'
  ),
  'audit_trigger_count', (
    select count(*)
    from information_schema.triggers
    where trigger_schema = 'public' and trigger_name like 'audit_%_changes'
  )
) as validation;
