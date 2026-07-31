begin;

create or replace function public.has_role(role_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.code::text = role_code
  );
$$;

create or replace function public.has_any_role(role_codes text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.code::text = any(role_codes)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array[
    'super_admin',
    'admin',
    'operations',
    'marketing',
    'finance'
  ]);
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.customers c
  where c.user_id = auth.uid()
  limit 1;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','roles','user_roles','user_preferences','addresses',
    'customers','customer_tags','customer_tag_assignments','customer_notes',
    'wine_categories','wines','wine_images','wine_pairings','wine_service_notes',
    'experiences','experience_images','experience_slots','experience_blockouts',
    'events','event_images','event_ticket_types',
    'reservations','reservation_guests','reservation_status_history',
    'promotions','promotion_targets','promotion_redemptions',
    'carts','cart_items','orders','order_items','payments','payment_webhook_events',
    'access_passes','checkins',
    'membership_plans','memberships','loyalty_transactions','membership_benefits',
    'sommelier_knowledge','sommelier_sessions','sommelier_messages','sommelier_usage','sommelier_feedback',
    'campaigns','campaign_recipients','notifications','notification_devices',
    'inventory_locations','inventory_items','inventory_movements',
    'shipments','distributors','distributor_orders',
    'documents','audit_logs','system_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists admin_all on public.%I', table_name);
    execute format(
      'create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      table_name
    );
  end loop;
end $$;

drop policy if exists profiles_own_select on public.profiles;
create policy profiles_own_select on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists user_preferences_own on public.user_preferences;
create policy user_preferences_own on public.user_preferences
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists addresses_own on public.addresses;
create policy addresses_own on public.addresses
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists roles_authenticated_read on public.roles;
create policy roles_authenticated_read on public.roles
for select to authenticated using (true);

drop policy if exists user_roles_own_read on public.user_roles;
create policy user_roles_own_read on public.user_roles
for select to authenticated using (user_id = auth.uid());

drop policy if exists customers_own_read on public.customers;
create policy customers_own_read on public.customers
for select to authenticated using (user_id = auth.uid());

drop policy if exists customers_own_update on public.customers;
create policy customers_own_update on public.customers
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists customer_tags_authenticated_read on public.customer_tags;
create policy customer_tags_authenticated_read on public.customer_tags
for select to authenticated using (true);

drop policy if exists published_wine_categories_public_read on public.wine_categories;
create policy published_wine_categories_public_read on public.wine_categories
for select to anon, authenticated using (active = true);

drop policy if exists published_wines_public_read on public.wines;
create policy published_wines_public_read on public.wines
for select to anon, authenticated using (status = 'published');

drop policy if exists published_wine_images_public_read on public.wine_images;
create policy published_wine_images_public_read on public.wine_images
for select to anon, authenticated using (
  exists (select 1 from public.wines w where w.id = wine_id and w.status = 'published')
);

drop policy if exists published_wine_pairings_public_read on public.wine_pairings;
create policy published_wine_pairings_public_read on public.wine_pairings
for select to anon, authenticated using (
  exists (select 1 from public.wines w where w.id = wine_id and w.status = 'published')
);

drop policy if exists published_wine_service_notes_public_read on public.wine_service_notes;
create policy published_wine_service_notes_public_read on public.wine_service_notes
for select to anon, authenticated using (
  exists (select 1 from public.wines w where w.id = wine_id and w.status = 'published')
);

drop policy if exists published_experiences_public_read on public.experiences;
create policy published_experiences_public_read on public.experiences
for select to anon, authenticated using (status = 'published');

drop policy if exists published_experience_images_public_read on public.experience_images;
create policy published_experience_images_public_read on public.experience_images
for select to anon, authenticated using (
  exists (select 1 from public.experiences e where e.id = experience_id and e.status = 'published')
);

drop policy if exists published_experience_slots_public_read on public.experience_slots;
create policy published_experience_slots_public_read on public.experience_slots
for select to anon, authenticated using (status = 'published');

drop policy if exists published_events_public_read on public.events;
create policy published_events_public_read on public.events
for select to anon, authenticated using (status = 'published' and visible_in_app = true);

drop policy if exists published_event_images_public_read on public.event_images;
create policy published_event_images_public_read on public.event_images
for select to anon, authenticated using (
  exists (select 1 from public.events e where e.id = event_id and e.status = 'published' and e.visible_in_app = true)
);

drop policy if exists active_event_ticket_types_public_read on public.event_ticket_types;
create policy active_event_ticket_types_public_read on public.event_ticket_types
for select to anon, authenticated using (
  active = true and exists (
    select 1 from public.events e
    where e.id = event_id and e.status = 'published' and e.visible_in_app = true and e.sales_enabled = true
  )
);

drop policy if exists active_promotions_public_read on public.promotions;
create policy active_promotions_public_read on public.promotions
for select to anon, authenticated using (
  status = 'published'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists membership_plans_public_read on public.membership_plans;
create policy membership_plans_public_read on public.membership_plans
for select to anon, authenticated using (active = true);

drop policy if exists reservations_customer_read on public.reservations;
create policy reservations_customer_read on public.reservations
for select to authenticated using (
  user_id = auth.uid() or customer_id = public.current_customer_id()
);

drop policy if exists reservation_guests_customer_read on public.reservation_guests;
create policy reservation_guests_customer_read on public.reservation_guests
for select to authenticated using (
  exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and (r.user_id = auth.uid() or r.customer_id = public.current_customer_id())
  )
);

drop policy if exists orders_customer_read on public.orders;
create policy orders_customer_read on public.orders
for select to authenticated using (
  user_id = auth.uid() or customer_id = public.current_customer_id()
);

drop policy if exists order_items_customer_read on public.order_items;
create policy order_items_customer_read on public.order_items
for select to authenticated using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or o.customer_id = public.current_customer_id())
  )
);

drop policy if exists memberships_customer_read on public.memberships;
create policy memberships_customer_read on public.memberships
for select to authenticated using (customer_id = public.current_customer_id());

drop policy if exists notifications_own_read on public.notifications;
create policy notifications_own_read on public.notifications
for select to authenticated using (
  user_id = auth.uid() or customer_id = public.current_customer_id()
);

drop policy if exists notifications_own_update_read on public.notifications;
create policy notifications_own_update_read on public.notifications
for update to authenticated using (
  user_id = auth.uid() or customer_id = public.current_customer_id()
) with check (
  user_id = auth.uid() or customer_id = public.current_customer_id()
);

drop policy if exists notification_devices_own on public.notification_devices;
create policy notification_devices_own on public.notification_devices
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sommelier_sessions_own on public.sommelier_sessions;
create policy sommelier_sessions_own on public.sommelier_sessions
for all to authenticated using (
  user_id = auth.uid() or customer_id = public.current_customer_id()
) with check (
  user_id = auth.uid() or customer_id = public.current_customer_id()
);

drop policy if exists sommelier_messages_own_read on public.sommelier_messages;
create policy sommelier_messages_own_read on public.sommelier_messages
for select to authenticated using (
  exists (
    select 1 from public.sommelier_sessions s
    where s.id = session_id
      and (s.user_id = auth.uid() or s.customer_id = public.current_customer_id())
  )
);

commit;
