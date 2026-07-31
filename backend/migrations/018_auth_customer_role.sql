begin;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_role_id uuid;
  generated_customer_number text;
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    display_name,
    phone,
    preferred_language
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      trim(concat_ws(' ', nullif(new.raw_user_meta_data ->> 'first_name', ''), nullif(new.raw_user_meta_data ->> 'last_name', ''))),
      new.email
    ),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'preferred_language', ''), 'es')
  )
  on conflict (id) do update
  set first_name = coalesce(public.profiles.first_name, excluded.first_name),
      last_name = coalesce(public.profiles.last_name, excluded.last_name),
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      phone = coalesce(public.profiles.phone, excluded.phone),
      updated_at = now();

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  select id into customer_role_id
  from public.roles
  where code = 'customer';

  if customer_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, customer_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;

  if new.email is not null then
    generated_customer_number := 'HDL-' || upper(substr(replace(new.id::text, '-', ''), 1, 10));

    insert into public.customers (
      user_id,
      customer_number,
      first_name,
      last_name,
      email,
      phone,
      source,
      segment,
      status
    )
    values (
      new.id,
      generated_customer_number,
      coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), 'Cliente'),
      coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), 'Hacienda'),
      new.email,
      nullif(new.raw_user_meta_data ->> 'phone', ''),
      'public_signup',
      'customer',
      'published'
    )
    on conflict (user_id) do update
    set first_name = coalesce(public.customers.first_name, excluded.first_name),
        last_name = coalesce(public.customers.last_name, excluded.last_name),
        email = coalesce(public.customers.email, excluded.email),
        phone = coalesce(public.customers.phone, excluded.phone),
        updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

commit;
