begin;

-- Sólo retira alertas operativas huérfanas de pruebas cuyos registros de
-- negocio ya no existen. No toca avisos push/email de clientes reales.
delete from public.notifications notification
where notification.channel = 'control'
  and notification.data->>'type' = 'quote_request_created'
  and nullif(notification.data->>'quoteRequestId', '') is not null
  and not exists (
    select 1
    from public.quote_requests quote
    where quote.id::text = notification.data->>'quoteRequestId'
  );

commit;
