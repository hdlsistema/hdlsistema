begin;

create or replace function public.notify_control_on_app_customer_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_name text;
  notification_key text;
begin
  if new.source is distinct from 'public_signup' then
    return new;
  end if;

  customer_name := coalesce(
    nullif(trim(concat_ws(' ', new.first_name, new.last_name)), ''),
    nullif(new.email::text, ''),
    'Nuevo cliente'
  );
  notification_key := concat('customer-signup-control-', new.id::text);

  if not exists (
    select 1
    from public.notifications
    where channel = 'control'
      and data ->> 'idempotencyKey' = notification_key
  ) then
    insert into public.notifications (
      customer_id,
      channel,
      title,
      body,
      data,
      status
    ) values (
      new.id,
      'control',
      'Nuevo cliente en la app',
      concat(customer_name, ' creó una cuenta en Hacienda de Letras.'),
      jsonb_build_object(
        'type', 'customer_registered',
        'customerId', new.id::text,
        'customerName', customer_name,
        'deepLink', concat('/control/clientes?customerId=', new.id::text),
        'idempotencyKey', notification_key
      ),
      'pending'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_app_customer_signup_control_notification on public.customers;
create trigger on_app_customer_signup_control_notification
after insert on public.customers
for each row execute function public.notify_control_on_app_customer_signup();

commit;
