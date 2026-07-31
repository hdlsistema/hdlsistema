with table_list as (
  select table_schema, table_name
  from information_schema.tables
  where table_schema in ('public', 'storage') and table_type = 'BASE TABLE'
),
extension_list as (
  select extname from pg_extension
),
function_list as (
  select n.nspname as schema_name, p.proname as function_name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'storage')
),
trigger_list as (
  select event_object_schema as table_schema, event_object_table as table_name, trigger_name
  from information_schema.triggers
  where trigger_schema in ('public', 'storage')
),
policy_list as (
  select schemaname, tablename, policyname, cmd
  from pg_policies
  where schemaname in ('public', 'storage')
),
rls_list as (
  select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'storage') and c.relkind = 'r'
),
bucket_list as (
  select id, public from storage.buckets
)
select jsonb_build_object(
  'tables', coalesce((select jsonb_agg(jsonb_build_object('schema', table_schema, 'name', table_name) order by table_schema, table_name) from table_list), '[]'::jsonb),
  'extensions', coalesce((select jsonb_agg(extname order by extname) from extension_list), '[]'::jsonb),
  'pgvector_exists', exists(select 1 from extension_list where extname = 'vector'),
  'system_health_exists', exists(select 1 from table_list where table_schema = 'public' and table_name = 'system_health'),
  'buckets', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'public', public) order by id) from bucket_list), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(jsonb_build_object('schema', schema_name, 'name', function_name) order by schema_name, function_name) from function_list), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(jsonb_build_object('schema', table_schema, 'table', table_name, 'name', trigger_name) order by table_schema, table_name, trigger_name) from trigger_list), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(jsonb_build_object('schema', schemaname, 'table', tablename, 'name', policyname, 'cmd', cmd) order by schemaname, tablename, policyname) from policy_list), '[]'::jsonb),
  'rls', coalesce((select jsonb_agg(jsonb_build_object('schema', schema_name, 'table', table_name, 'enabled', rls_enabled) order by schema_name, table_name) from rls_list), '[]'::jsonb)
) as audit;
