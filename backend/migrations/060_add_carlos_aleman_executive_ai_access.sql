begin;

-- La migración 059 ya estaba aplicada con Carlos Salas y Patricia Garibay.
-- Agrega de forma idempotente el tercer perfil autorizado: Carlos Alemán.
insert into public.executive_ai_access (user_id, feature_code, active)
values (
  '630902da-1ade-4ce1-935d-9a534caaf5cd',
  'executive_ai_assistant',
  true
)
on conflict (user_id) do update
set feature_code = excluded.feature_code,
    active = true,
    updated_at = now();

commit;
