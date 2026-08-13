-- Production cleanup requested on 2026-08-12.
-- Scope: remove transactional/test activity while preserving auth users,
-- profiles, roles, preferences and every commercial/editorial catalog.

begin;

create temp table cleanup_users on commit drop as
select id, lower(email) as email
from auth.users
where lower(email) in (
  'cliente.prueba@alqia.tech',
  'direccion@haciendadeletras.com',
  'pcgaribayg@gmail.com',
  'pgaribay@alqia.tech',
  'playreview@admhaciendadeletras.com',
  'qa_comercial_1786472302158@example.invalid',
  'qa_comercial_fix_1786472510992@example.invalid',
  'ventas@haciendadeletras.com'
);

do $$
begin
  if (select count(*) from cleanup_users) <> 8 then
    raise exception 'Cleanup aborted: expected 8 preserved auth users';
  end if;
end $$;

create temp table cleanup_catalog_counts on commit drop as
select
  (select count(*) from public.wines) as wines,
  (select count(*) from public.experiences) as experiences,
  (select count(*) from public.events) as events,
  (select count(*) from public.promotions) as promotions,
  (select count(*) from public.membership_plans) as membership_plans,
  (select count(*) from public.cabin_packages) as cabin_packages,
  (select count(*) from public.restaurant_locations) as restaurant_locations,
  (select count(*) from public.venue_spaces) as venue_spaces;

-- The six customer identities tied to auth users are preserved. Only orphan
-- QA customers without an auth account are eligible for removal.
create temp table cleanup_orphan_customers on commit drop as
select id
from public.customers
where user_id is null
  and (
    lower(coalesce(email::text, '')) like 'qa\_%' escape '\'
    or lower(coalesce(email::text, '')) like '%@example.invalid'
    or lower(coalesce(first_name, '')) in ('qa', 'test', 'prueba')
  );

create temp table cleanup_customers on commit drop as
select id from public.customers where user_id in (select id from cleanup_users)
union
select id from cleanup_orphan_customers;

create temp table cleanup_reservations on commit drop as
select id
from public.reservations
where user_id in (select id from cleanup_users)
   or customer_id in (select id from cleanup_customers)
   or created_by_admin in (select id from cleanup_users);

create temp table cleanup_orders on commit drop as
select id
from public.orders
where user_id in (select id from cleanup_users)
   or customer_id in (select id from cleanup_customers)
   or created_by in (select id from cleanup_users)
   or reservation_id in (select id from cleanup_reservations);

create temp table cleanup_carts on commit drop as
select id
from public.carts
where user_id in (select id from cleanup_users)
   or customer_id in (select id from cleanup_customers);

create temp table cleanup_quotes on commit drop as
select id
from public.quote_requests
where user_id in (select id from cleanup_users)
   or customer_id in (select id from cleanup_customers)
   or lower(contact_email::text) in (select email from cleanup_users);

create temp table cleanup_memberships on commit drop as
select id
from public.memberships
where customer_id in (select id from cleanup_customers)
   or created_by in (select id from cleanup_users);

create temp table cleanup_sommelier_sessions on commit drop as
select id
from public.sommelier_sessions
where user_id in (select id from cleanup_users)
   or customer_id in (select id from cleanup_customers);

create temp table cleanup_shipments on commit drop as
select id
from public.shipments
where order_id in (select id from cleanup_orders)
   or created_by in (select id from cleanup_users)
   or updated_by in (select id from cleanup_users)
   or delivered_by in (select id from cleanup_users);

create temp table cleanup_passes on commit drop as
select id
from public.access_passes
where order_id in (select id from cleanup_orders)
   or reservation_id in (select id from cleanup_reservations)
   or revoked_by in (select id from cleanup_users);

create temp table cleanup_communication_events on commit drop as
select id
from public.communication_events
where user_id in (select id from cleanup_users)
   or customer_id in (select id from cleanup_customers)
   or aggregate_id in (
     select id from cleanup_orders
     union select id from cleanup_reservations
     union select id from cleanup_quotes
     union select id from cleanup_memberships
   );

create temp table cleanup_email_outbox on commit drop as
select id
from public.email_outbox
where communication_event_id in (select id from cleanup_communication_events)
   or recipient_user_id in (select id from cleanup_users)
   or recipient_customer_id in (select id from cleanup_customers);

create temp table cleanup_report (
  category text primary key,
  deleted_count bigint not null
) on commit drop;

with deleted as (
  delete from public.email_deliveries
  where email_outbox_id in (select id from cleanup_email_outbox)
  returning 1
)
insert into cleanup_report select 'email_deliveries', count(*) from deleted;

with deleted as (
  delete from public.email_outbox where id in (select id from cleanup_email_outbox) returning 1
)
insert into cleanup_report select 'email_outbox', count(*) from deleted;

with deleted as (
  delete from public.communication_events where id in (select id from cleanup_communication_events) returning 1
)
insert into cleanup_report select 'communication_events', count(*) from deleted;

with deleted as (
  delete from public.notifications
  where user_id in (select id from cleanup_users)
     or customer_id in (select id from cleanup_customers)
  returning 1
)
insert into cleanup_report select 'notifications', count(*) from deleted;

with deleted as (
  delete from public.account_deletion_requests
  where user_id in (select id from cleanup_users)
     or customer_id in (select id from cleanup_customers)
  returning 1
)
insert into cleanup_report select 'account_deletion_requests', count(*) from deleted;

with deleted as (
  delete from public.sommelier_feedback
  where user_id in (select id from cleanup_users)
     or message_id in (
       select m.id
       from public.sommelier_messages m
       where m.session_id in (select id from cleanup_sommelier_sessions)
     )
  returning 1
)
insert into cleanup_report select 'sommelier_feedback', count(*) from deleted;

with deleted as (
  delete from public.sommelier_sessions where id in (select id from cleanup_sommelier_sessions) returning 1
)
insert into cleanup_report select 'sommelier_sessions', count(*) from deleted;

with deleted as (
  delete from public.sommelier_usage
  where user_id in (select id from cleanup_users)
     or customer_id in (select id from cleanup_customers)
  returning 1
)
insert into cleanup_report select 'sommelier_usage', count(*) from deleted;

with deleted as (
  delete from public.customer_notes where customer_id in (select id from cleanup_customers) returning 1
)
insert into cleanup_report select 'customer_notes', count(*) from deleted;

with deleted as (
  delete from public.customer_tag_assignments where customer_id in (select id from cleanup_customers) returning 1
)
insert into cleanup_report select 'customer_tag_assignments', count(*) from deleted;

with deleted as (
  delete from public.campaign_recipients where customer_id in (select id from cleanup_customers) returning 1
)
insert into cleanup_report select 'campaign_recipients', count(*) from deleted;

with deleted as (
  delete from public.promotion_redemptions
  where customer_id in (select id from cleanup_customers)
     or order_id in (select id from cleanup_orders)
     or reservation_id in (select id from cleanup_reservations)
  returning 1
)
insert into cleanup_report select 'promotion_redemptions', count(*) from deleted;

with deleted as (
  delete from public.loyalty_transactions
  where membership_id in (select id from cleanup_memberships)
     or created_by in (select id from cleanup_users)
  returning 1
)
insert into cleanup_report select 'loyalty_transactions', count(*) from deleted;

with deleted as (
  delete from public.memberships where id in (select id from cleanup_memberships) returning 1
)
insert into cleanup_report select 'memberships', count(*) from deleted;

with deleted as (
  delete from public.checkins
  where access_pass_id in (select id from cleanup_passes)
     or checked_in_by in (select id from cleanup_users)
     or reversed_by in (select id from cleanup_users)
  returning 1
)
insert into cleanup_report select 'checkins', count(*) from deleted;

with deleted as (
  delete from public.access_passes where id in (select id from cleanup_passes) returning 1
)
insert into cleanup_report select 'access_passes', count(*) from deleted;

with deleted as (
  delete from public.shipment_events
  where shipment_id in (select id from cleanup_shipments)
     or created_by in (select id from cleanup_users)
  returning 1
)
insert into cleanup_report select 'shipment_events', count(*) from deleted;

with deleted as (
  delete from public.shipments where id in (select id from cleanup_shipments) returning 1
)
insert into cleanup_report select 'shipments', count(*) from deleted;

with deleted as (
  delete from public.payments
  where order_id in (select id from cleanup_orders)
     or recorded_by in (select id from cleanup_users)
  returning 1
)
insert into cleanup_report select 'payments', count(*) from deleted;

with deleted as (
  delete from public.orders where id in (select id from cleanup_orders) returning 1
)
insert into cleanup_report select 'orders', count(*) from deleted;

with deleted as (
  delete from public.reservation_status_history
  where reservation_id in (select id from cleanup_reservations)
     or changed_by in (select id from cleanup_users)
  returning 1
)
insert into cleanup_report select 'reservation_status_history', count(*) from deleted;

with deleted as (
  delete from public.lodging_stays
  where reservation_id in (select id from cleanup_reservations)
     or assigned_by in (select id from cleanup_users)
     or checked_in_by in (select id from cleanup_users)
     or checked_out_by in (select id from cleanup_users)
  returning 1
)
insert into cleanup_report select 'lodging_stays', count(*) from deleted;

with deleted as (
  delete from public.lodging_calendar_entries
  where reservation_id in (select id from cleanup_reservations)
     or created_by in (select id from cleanup_users)
     or released_by in (select id from cleanup_users)
  returning 1
)
insert into cleanup_report select 'lodging_calendar_entries', count(*) from deleted;

with deleted as (
  delete from public.reservations where id in (select id from cleanup_reservations) returning 1
)
insert into cleanup_report select 'reservations', count(*) from deleted;

with deleted as (
  delete from public.carts where id in (select id from cleanup_carts) returning 1
)
insert into cleanup_report select 'carts', count(*) from deleted;

with deleted as (
  delete from public.quote_requests where id in (select id from cleanup_quotes) returning 1
)
insert into cleanup_report select 'quote_requests', count(*) from deleted;

with deleted as (
  delete from public.addresses where user_id in (select id from cleanup_users) returning 1
)
insert into cleanup_report select 'addresses', count(*) from deleted;

with deleted as (
  delete from public.customer_addresses
  where user_id in (select id from cleanup_users)
     or customer_id in (select id from cleanup_customers)
  returning 1
)
insert into cleanup_report select 'customer_addresses', count(*) from deleted;

-- All 132 rows were generated by QA/browser sessions. Anonymous rows cannot be
-- attributed by user id, so clearing the table is required to reset real KPIs.
with deleted as (
  delete from public.customer_app_events returning 1
)
insert into cleanup_report select 'customer_app_events', count(*) from deleted;

-- Availability is operational data. Products/experiences are preserved.
with deleted as (
  delete from public.experience_blockouts where created_by in (select id from cleanup_users) returning 1
)
insert into cleanup_report select 'experience_blockouts', count(*) from deleted;

with deleted as (
  delete from public.experience_slots where created_by in (select id from cleanup_users) returning 1
)
insert into cleanup_report select 'experience_slots', count(*) from deleted;

-- Rebuild capacity from the remaining source of truth to avoid ghost occupancy.
update public.experience_slots slot
set reserved_count = coalesce((
      select sum(r.people_count)::integer
      from public.reservations r
      where r.experience_slot_id = slot.id and r.status = 'confirmed'
    ), 0),
    confirmed_count = coalesce((
      select sum(r.people_count)::integer
      from public.reservations r
      where r.experience_slot_id = slot.id and r.status = 'confirmed'
    ), 0),
    waitlist_count = 0,
    updated_at = now();

-- Remove transaction audit rows only. Editorial/catalog history is preserved.
with transaction_entities as (
  select id from cleanup_orders
  union select id from cleanup_reservations
  union select id from cleanup_carts
  union select id from cleanup_quotes
  union select id from cleanup_memberships
  union select id from cleanup_sommelier_sessions
  union select id from cleanup_shipments
  union select id from cleanup_passes
  union select id from cleanup_communication_events
  union select id from cleanup_email_outbox
  union select id from cleanup_orphan_customers
), deleted as (
  delete from public.audit_logs where entity_id in (select id from transaction_entities) returning 1
)
insert into cleanup_report select 'transaction_audit_logs', count(*) from deleted;

with deleted as (
  delete from public.customers where id in (select id from cleanup_orphan_customers) returning 1
)
insert into cleanup_report select 'orphan_qa_customers', count(*) from deleted;

do $$
begin
  if (select count(*) from auth.users where id in (select id from cleanup_users)) <> 8 then
    raise exception 'Cleanup aborted: an auth user would be lost';
  end if;
  if (select count(*) from public.wines) <> (select wines from cleanup_catalog_counts)
     or (select count(*) from public.experiences) <> (select experiences from cleanup_catalog_counts)
     or (select count(*) from public.events) <> (select events from cleanup_catalog_counts)
     or (select count(*) from public.promotions) <> (select promotions from cleanup_catalog_counts)
     or (select count(*) from public.membership_plans) <> (select membership_plans from cleanup_catalog_counts)
     or (select count(*) from public.cabin_packages) <> (select cabin_packages from cleanup_catalog_counts)
     or (select count(*) from public.restaurant_locations) <> (select restaurant_locations from cleanup_catalog_counts)
     or (select count(*) from public.venue_spaces) <> (select venue_spaces from cleanup_catalog_counts) then
    raise exception 'Cleanup aborted: a commercial catalog changed';
  end if;
end $$;

insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
values (
  null,
  'production_user_activity_cleanup',
  'system',
  gen_random_uuid(),
  jsonb_build_object(
    'preservedAuthUsers', 8,
    'preservedCatalogs', true,
    'scope', 'transactions_app_activity_qa'
  )
);

select jsonb_build_object(
  'deleted', (select jsonb_object_agg(category, deleted_count order by category) from cleanup_report),
  'preserved', jsonb_build_object(
    'auth_users', (select count(*) from auth.users where id in (select id from cleanup_users)),
    'linked_customer_identities', (
      select count(*) from public.customers where user_id in (select id from cleanup_users)
    ),
    'wines', (select count(*) from public.wines),
    'experiences', (select count(*) from public.experiences),
    'events', (select count(*) from public.events),
    'cabin_packages', (select count(*) from public.cabin_packages)
  ),
  'remaining_operational', jsonb_build_object(
    'reservations', (select count(*) from public.reservations),
    'orders', (select count(*) from public.orders),
    'payments', (select count(*) from public.payments),
    'carts', (select count(*) from public.carts),
    'quotes', (select count(*) from public.quote_requests),
    'app_events', (select count(*) from public.customer_app_events)
  )
) as cleanup_result;

commit;
