select jsonb_build_object(
  'policies', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', tablename,
      'policy', policyname,
      'cmd', cmd
    ) order by tablename, policyname)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'roles', 'user_roles', 'user_preferences', 'customers')
  ), '[]'::jsonb),
  'triggers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', event_object_table,
      'trigger', trigger_name
    ) order by event_object_table, trigger_name)
    from information_schema.triggers
    where trigger_schema in ('public', 'auth')
      and event_object_table in ('users', 'profiles', 'user_roles', 'customers')
  ), '[]'::jsonb),
  'functions', coalesce((
    select jsonb_agg(proname order by proname)
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'handle_new_user_profile',
        'has_role',
        'has_any_role',
        'is_admin',
        'current_customer_id'
      )
  ), '[]'::jsonb),
  'roles_seed', coalesce((
    select jsonb_agg(code::text order by code::text)
    from public.roles
  ), '[]'::jsonb)
) as audit;
