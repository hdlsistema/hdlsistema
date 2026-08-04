begin;

alter table public.reservations add column if not exists idempotency_key text;
create unique index if not exists idx_reservations_user_id_idempotency_key
on public.reservations(user_id, idempotency_key)
where idempotency_key is not null;

create index if not exists idx_reservations_customer_status_created
on public.reservations(customer_id, status, created_at desc);

create index if not exists idx_memberships_customer_status
on public.memberships(customer_id, status);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'membership_benefits'
      and policyname = 'membership_benefits_customer_read'
  ) then
    create policy membership_benefits_customer_read on public.membership_benefits
    for select to authenticated using (
      exists (
        select 1
        from public.memberships m
        where m.id = membership_benefits.membership_id
          and m.customer_id = public.current_customer_id()
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'loyalty_transactions'
      and policyname = 'loyalty_transactions_customer_read'
  ) then
    create policy loyalty_transactions_customer_read on public.loyalty_transactions
    for select to authenticated using (
      exists (
        select 1
        from public.memberships m
        where m.id = loyalty_transactions.membership_id
          and m.customer_id = public.current_customer_id()
      )
    );
  end if;
end;
$$;

create or replace function public.get_customer_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer public.customers%rowtype;
  v_profile public.profiles%rowtype;
  v_preferences public.user_preferences%rowtype;
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select * into v_customer from public.customers where user_id = v_user_id;
  if v_customer.id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  select * into v_preferences from public.user_preferences where user_id = v_user_id;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'firstName', v_profile.first_name,
      'lastName', v_profile.last_name,
      'displayName', v_profile.display_name,
      'phone', v_profile.phone,
      'avatarUrl', v_profile.avatar_url,
      'preferredLanguage', coalesce(v_profile.preferred_language, 'es'),
      'birthDate', v_profile.birth_date
    ),
    'customer', jsonb_build_object(
      'id', v_customer.id,
      'customerNumber', v_customer.customer_number,
      'firstName', v_customer.first_name,
      'lastName', v_customer.last_name,
      'email', v_customer.email,
      'phone', v_customer.phone,
      'status', v_customer.status,
      'createdAt', v_customer.created_at
    ),
    'preferences', jsonb_build_object(
      'language', coalesce(v_preferences.language, 'es'),
      'timezone', coalesce(v_preferences.timezone, 'America/Mexico_City'),
      'marketingEmail', coalesce(v_preferences.marketing_email, false),
      'marketingPush', coalesce(v_preferences.marketing_push, false),
      'transactionalPush', coalesce(v_preferences.transactional_push, true)
    )
  );
end;
$$;

create or replace function public.update_customer_profile(
  p_first_name text default null,
  p_last_name text default null,
  p_display_name text default null,
  p_phone text default null,
  p_preferred_language text default null,
  p_marketing_email boolean default null,
  p_marketing_push boolean default null,
  p_transactional_push boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_language text := case when p_preferred_language = 'en' then 'en' else 'es' end;
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select id into v_customer_id from public.customers where user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  update public.profiles
  set first_name = coalesce(nullif(trim(p_first_name), ''), first_name),
      last_name = coalesce(nullif(trim(p_last_name), ''), last_name),
      display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
      phone = nullif(trim(coalesce(p_phone, phone)), ''),
      preferred_language = v_language,
      updated_at = now()
  where id = v_user_id;

  update public.customers
  set first_name = coalesce(nullif(trim(p_first_name), ''), first_name),
      last_name = coalesce(nullif(trim(p_last_name), ''), last_name),
      phone = nullif(trim(coalesce(p_phone, phone)), ''),
      updated_at = now()
  where id = v_customer_id;

  insert into public.user_preferences (
    user_id,
    language,
    marketing_email,
    marketing_push,
    transactional_push
  )
  values (
    v_user_id,
    v_language,
    coalesce(p_marketing_email, true),
    coalesce(p_marketing_push, true),
    coalesce(p_transactional_push, true)
  )
  on conflict (user_id) do update
  set language = excluded.language,
      marketing_email = coalesce(p_marketing_email, public.user_preferences.marketing_email),
      marketing_push = coalesce(p_marketing_push, public.user_preferences.marketing_push),
      transactional_push = coalesce(p_transactional_push, public.user_preferences.transactional_push),
      updated_at = now();

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'customer_profile_updated', 'customers', v_customer_id, jsonb_build_object('source', 'app'));

  return public.get_customer_profile();
end;
$$;

create or replace function public.get_bookable_experience_slots(
  p_experience_id uuid default null,
  p_from timestamptz default now(),
  p_to timestamptz default (now() + interval '45 days')
)
returns table (
  id uuid,
  experience_id uuid,
  experience_title text,
  experience_slug text,
  location text,
  duration_minutes integer,
  cover_image_url text,
  start_at timestamptz,
  end_at timestamptz,
  available integer,
  price numeric,
  is_bookable boolean
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.experience_id,
    e.title as experience_title,
    e.slug as experience_slug,
    e.location,
    e.duration_minutes,
    e.cover_image_url,
    s.start_at,
    s.end_at,
    greatest(s.capacity - coalesce(s.confirmed_count, s.reserved_count, 0), 0) as available,
    coalesce(s.price_override, e.base_price, 0) as price,
    (
      s.is_bookable
      and s.operational_status = 'open'
      and s.status = 'published'
      and s.start_at > now()
      and greatest(s.capacity - coalesce(s.confirmed_count, s.reserved_count, 0), 0) > 0
    ) as is_bookable
  from public.experience_slots s
  join public.experiences e on e.id = s.experience_id
  where (p_experience_id is null or s.experience_id = p_experience_id)
    and s.start_at >= greatest(coalesce(p_from, now()), now())
    and s.start_at <= coalesce(p_to, now() + interval '45 days')
    and s.is_bookable = true
    and s.operational_status = 'open'
    and s.status = 'published'
    and public.is_content_live(s.status::text, s.visible_in_app, s.publish_at, s.unpublish_at, s.archived_at, s.deleted_at)
    and public.is_content_live(e.status::text, e.visible_in_app, e.publish_at, e.unpublish_at, e.archived_at, e.deleted_at)
    and greatest(s.capacity - coalesce(s.confirmed_count, s.reserved_count, 0), 0) > 0
    and not exists (
      select 1
      from public.experience_blockouts b
      where (b.applies_to_all_experiences = true or b.experience_id = s.experience_id)
        and b.start_at < s.end_at
        and b.end_at > s.start_at
    )
  order by s.start_at asc;
$$;

create or replace function public.create_customer_reservation(
  p_experience_slot_id uuid,
  p_people_count integer,
  p_customer_notes text default null,
  p_language text default 'es',
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_existing_id uuid;
  v_slot public.experience_slots%rowtype;
  v_experience public.experiences%rowtype;
  v_reservation_id uuid;
  v_total numeric(12,2);
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_people_count < 1 then
    raise exception 'INVALID_PEOPLE_COUNT' using errcode = 'P0001';
  end if;

  select id into v_customer_id from public.customers where user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  if nullif(trim(coalesce(p_idempotency_key, '')), '') is not null then
    select id into v_existing_id
    from public.reservations
    where user_id = v_user_id
      and idempotency_key = nullif(trim(p_idempotency_key), '')
    limit 1;
    if v_existing_id is not null then
      return v_existing_id;
    end if;
  end if;

  select * into v_slot
  from public.experience_slots
  where id = p_experience_slot_id
  for update;

  if v_slot.id is null then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not v_slot.is_bookable or v_slot.operational_status <> 'open' or v_slot.status <> 'published' or v_slot.start_at <= now() then
    raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;
  if v_slot.confirmed_count + p_people_count > v_slot.capacity then
    raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
  end if;

  select * into v_experience
  from public.experiences
  where id = v_slot.experience_id;

  if v_experience.id is null or not public.is_content_live(v_experience.status::text, v_experience.visible_in_app, v_experience.publish_at, v_experience.unpublish_at, v_experience.archived_at, v_experience.deleted_at) then
    raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;

  v_total := coalesce(v_slot.price_override, v_experience.base_price, 0) * p_people_count;

  insert into public.reservations (
    reservation_number,
    customer_id,
    user_id,
    reservation_type,
    experience_id,
    experience_slot_id,
    people_count,
    subtotal,
    total,
    status,
    customer_notes,
    source,
    booking_channel,
    confirmed_at,
    operational_status,
    idempotency_key,
    metadata
  )
  values (
    'RES-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    v_customer_id,
    v_user_id,
    'experience',
    v_slot.experience_id,
    v_slot.id,
    p_people_count,
    v_total,
    v_total,
    'confirmed',
    nullif(trim(coalesce(p_customer_notes, '')), ''),
    'app',
    'web_app',
    now(),
    'active',
    nullif(trim(coalesce(p_idempotency_key, '')), ''),
    jsonb_build_object('language', case when p_language = 'en' then 'en' else 'es' end)
  )
  returning id into v_reservation_id;

  update public.experience_slots
  set reserved_count = reserved_count + p_people_count,
      confirmed_count = confirmed_count + p_people_count,
      updated_at = now()
  where id = v_slot.id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'customer_reservation_created', 'reservations', v_reservation_id, jsonb_build_object('source', 'app'));

  return v_reservation_id;
end;
$$;

create or replace function public.cancel_customer_reservation(
  p_reservation_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_reservation public.reservations%rowtype;
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select id into v_customer_id from public.customers where user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
    and customer_id = v_customer_id
    and user_id = v_user_id
  for update;

  if v_reservation.id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  if v_reservation.status = 'confirmed' and v_reservation.experience_slot_id is not null then
    update public.experience_slots
    set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
        confirmed_count = greatest(confirmed_count - v_reservation.people_count, 0),
        updated_at = now()
    where id = v_reservation.experience_slot_id;
  end if;

  update public.reservations
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = nullif(trim(coalesce(p_reason, '')), ''),
      cancelled_by = v_user_id,
      operational_status = 'cancelled',
      updated_at = now()
  where id = p_reservation_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'customer_reservation_cancelled', 'reservations', p_reservation_id, jsonb_build_object('source', 'app'));

  return p_reservation_id;
end;
$$;

create or replace function public.reschedule_customer_reservation(
  p_reservation_id uuid,
  p_new_slot_id uuid,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_reservation public.reservations%rowtype;
  v_old_slot public.experience_slots%rowtype;
  v_new_slot public.experience_slots%rowtype;
  v_experience public.experiences%rowtype;
  v_total numeric(12,2);
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select id into v_customer_id from public.customers where user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
    and customer_id = v_customer_id
    and user_id = v_user_id
  for update;

  if v_reservation.id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;
  if v_reservation.metadata ->> 'lastRescheduleIdempotencyKey' = nullif(trim(coalesce(p_idempotency_key, '')), '') then
    return p_reservation_id;
  end if;
  if v_reservation.experience_slot_id = p_new_slot_id then
    return p_reservation_id;
  end if;

  select * into v_new_slot from public.experience_slots where id = p_new_slot_id for update;
  if v_new_slot.id is null then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not v_new_slot.is_bookable or v_new_slot.operational_status <> 'open' or v_new_slot.status <> 'published' or v_new_slot.start_at <= now() then
    raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;
  if v_new_slot.confirmed_count + v_reservation.people_count > v_new_slot.capacity then
    raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
  end if;

  select * into v_experience from public.experiences where id = v_new_slot.experience_id;
  v_total := coalesce(v_new_slot.price_override, v_experience.base_price, 0) * v_reservation.people_count;

  if v_reservation.status = 'confirmed' and v_reservation.experience_slot_id is not null then
    select * into v_old_slot from public.experience_slots where id = v_reservation.experience_slot_id for update;
    update public.experience_slots
    set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
        confirmed_count = greatest(confirmed_count - v_reservation.people_count, 0),
        updated_at = now()
    where id = v_old_slot.id;

    update public.experience_slots
    set reserved_count = reserved_count + v_reservation.people_count,
        confirmed_count = confirmed_count + v_reservation.people_count,
        updated_at = now()
    where id = v_new_slot.id;
  end if;

  update public.reservations
  set experience_slot_id = p_new_slot_id,
      experience_id = v_new_slot.experience_id,
      subtotal = v_total,
      total = v_total,
      rescheduled_from_reservation_id = coalesce(rescheduled_from_reservation_id, id),
      rescheduled_at = now(),
      metadata = metadata || jsonb_build_object('lastRescheduleIdempotencyKey', nullif(trim(coalesce(p_idempotency_key, '')), '')),
      updated_at = now()
  where id = p_reservation_id;

  insert into public.reservation_status_history (reservation_id, previous_status, new_status, changed_by, notes)
  values (p_reservation_id, v_reservation.status, v_reservation.status, v_user_id, 'Reprogramación solicitada por cliente');

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'customer_reservation_rescheduled', 'reservations', p_reservation_id, jsonb_build_object('source', 'app'));

  return p_reservation_id;
end;
$$;

create or replace function public.get_customer_reservations()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'reservationNumber', r.reservation_number,
    'status', r.status,
    'peopleCount', r.people_count,
    'total', r.total,
    'currency', r.currency,
    'customerNotes', r.customer_notes,
    'experienceId', r.experience_id,
    'experienceTitle', e.title,
    'experienceSlug', e.slug,
    'slotId', s.id,
    'startAt', s.start_at,
    'endAt', s.end_at,
    'createdAt', r.created_at,
    'updatedAt', r.updated_at
  ) order by coalesce(s.start_at, r.created_at) desc), '[]'::jsonb)
  from public.reservations r
  left join public.experiences e on e.id = r.experience_id
  left join public.experience_slots s on s.id = r.experience_slot_id
  where r.user_id = auth.uid()
    and r.customer_id = public.current_customer_id();
$$;

create or replace function public.get_customer_membership()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_build_object(
      'id', m.id,
      'membershipNumber', m.membership_number,
      'status', m.status,
      'startsAt', m.starts_at,
      'renewalDate', m.renewal_date,
      'expiresAt', coalesce(m.expires_at, m.ends_at),
      'autoRenew', m.auto_renew,
      'pointsBalance', m.points_balance,
      'plan', jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'billingPeriod', p.billing_period,
        'price', p.price
      )
    )
    from public.memberships m
    join public.membership_plans p on p.id = m.plan_id
    where m.customer_id = public.current_customer_id()
      and m.status in ('pending', 'active', 'paused')
    order by m.created_at desc
    limit 1
  ), 'null'::jsonb);
$$;

create or replace function public.get_customer_loyalty_summary()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with current_membership as (
    select id, points_balance
    from public.memberships
    where customer_id = public.current_customer_id()
      and status in ('pending', 'active', 'paused')
    order by created_at desc
    limit 1
  )
  select coalesce((
    select jsonb_build_object(
      'pointsBalance', cm.points_balance,
      'transactions', coalesce(jsonb_agg(jsonb_build_object(
        'id', lt.id,
        'transactionType', lt.transaction_type,
        'points', lt.points,
        'description', lt.description,
        'createdAt', lt.created_at
      ) order by lt.created_at desc) filter (where lt.id is not null), '[]'::jsonb)
    )
    from current_membership cm
    left join public.loyalty_transactions lt on lt.membership_id = cm.id
    group by cm.id, cm.points_balance
  ), jsonb_build_object('pointsBalance', 0, 'transactions', '[]'::jsonb));
$$;

revoke all on function public.get_customer_profile() from public, anon;
revoke all on function public.update_customer_profile(text, text, text, text, text, boolean, boolean, boolean) from public, anon;
revoke all on function public.get_bookable_experience_slots(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.create_customer_reservation(uuid, integer, text, text, text) from public, anon;
revoke all on function public.cancel_customer_reservation(uuid, text) from public, anon;
revoke all on function public.reschedule_customer_reservation(uuid, uuid, text) from public, anon;
revoke all on function public.get_customer_reservations() from public, anon;
revoke all on function public.get_customer_membership() from public, anon;
revoke all on function public.get_customer_loyalty_summary() from public, anon;

grant execute on function public.get_customer_profile() to authenticated;
grant execute on function public.update_customer_profile(text, text, text, text, text, boolean, boolean, boolean) to authenticated;
grant execute on function public.get_bookable_experience_slots(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.create_customer_reservation(uuid, integer, text, text, text) to authenticated;
grant execute on function public.cancel_customer_reservation(uuid, text) to authenticated;
grant execute on function public.reschedule_customer_reservation(uuid, uuid, text) to authenticated;
grant execute on function public.get_customer_reservations() to authenticated;
grant execute on function public.get_customer_membership() to authenticated;
grant execute on function public.get_customer_loyalty_summary() to authenticated;

commit;
