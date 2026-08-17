import { Loader2, Pencil, Plus, Save, Ticket, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  adminContentClient,
  type EventTicketType,
  type EventTicketTypePayload,
} from '../../../../../services/content.service'
import { CrystalDateTimeField } from '../../../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../../../components/shared/CrystalSelect'
import { money } from '../../controlCopy'

type TicketDraft = {
  id: string
  name: string
  description: string
  price: string
  capacity: string
  salesStartAt: string
  salesEndAt: string
  active: string
  status: EventTicketTypePayload['status']
  visibleInApp: string
  sortOrder: string
}

const emptyDraft: TicketDraft = {
  id: '',
  name: '',
  description: '',
  price: '0',
  capacity: '1',
  salesStartAt: '',
  salesEndAt: '',
  active: 'true',
  status: 'draft',
  visibleInApp: 'false',
  sortOrder: '0',
}

function toLocalDateTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16)
}

function draftFromTicket(ticket: EventTicketType): TicketDraft {
  return {
    id: ticket.id,
    name: ticket.name,
    description: ticket.description ?? '',
    price: String(ticket.price),
    capacity: String(ticket.capacity),
    salesStartAt: toLocalDateTime(ticket.sales_start_at),
    salesEndAt: toLocalDateTime(ticket.sales_end_at),
    active: String(ticket.active),
    status: ['draft', 'published', 'scheduled', 'archived', 'inactive'].includes(ticket.status)
      ? ticket.status as EventTicketTypePayload['status']
      : 'draft',
    visibleInApp: String(ticket.visible_in_app),
    sortOrder: String(ticket.sort_order),
  }
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null
}

export function EventTicketTypesPanel({
  eventId,
  token,
  canWrite,
  canDelete,
}: {
  eventId: string | null
  token?: string | null
  canWrite?: boolean
  canDelete?: boolean
}) {
  const [tickets, setTickets] = useState<EventTicketType[]>([])
  const [draft, setDraft] = useState<TicketDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pendingRemoveId, setPendingRemoveId] = useState('')

  const load = useCallback(async () => {
    if (!eventId || !token) {
      setTickets([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await adminContentClient.eventTicketTypes(eventId, token)
      setTickets(response.data)
    } catch (loadError) {
      setTickets([])
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar los tipos de boleto.')
    } finally {
      setLoading(false)
    }
  }, [eventId, token])

  useEffect(() => {
    setDraft(null)
    setPendingRemoveId('')
    void load()
  }, [load])

  const totals = useMemo(() => tickets.reduce((sum, ticket) => ({
    capacity: sum.capacity + Number(ticket.capacity ?? 0),
    sold: sum.sold + Number(ticket.sold_count ?? 0),
    reserved: sum.reserved + Number(ticket.reserved_count ?? 0),
  }), { capacity: 0, sold: 0, reserved: 0 }), [tickets])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!eventId || !token || !draft) return
    const capacity = Number(draft.capacity)
    const price = Number(draft.price)
    if (!draft.name.trim() || !Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(price) || price < 0) {
      setError('Completa nombre, precio y capacidad válida.')
      return
    }
    if (draft.salesStartAt && draft.salesEndAt && draft.salesEndAt <= draft.salesStartAt) {
      setError('El cierre de venta debe ser posterior al inicio.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    const payload: EventTicketTypePayload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      price,
      capacity,
      sales_start_at: toIso(draft.salesStartAt),
      sales_end_at: toIso(draft.salesEndAt),
      active: draft.active === 'true',
      status: draft.status,
      visible_in_app: draft.visibleInApp === 'true',
      sort_order: Math.max(0, Number(draft.sortOrder) || 0),
      publish_at: null,
      unpublish_at: null,
    }
    try {
      if (draft.id) await adminContentClient.updateEventTicketType(eventId, draft.id, payload, token)
      else await adminContentClient.createEventTicketType(eventId, payload, token)
      setSuccess(draft.id ? 'Tipo de boleto actualizado.' : 'Tipo de boleto creado.')
      setDraft(null)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar el tipo de boleto.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(ticketId: string) {
    if (!eventId || !token) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await adminContentClient.removeEventTicketType(eventId, ticketId, token)
      setPendingRemoveId('')
      setSuccess('Tipo de boleto retirado.')
      await load()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'No fue posible retirar el tipo de boleto.')
    } finally {
      setSaving(false)
    }
  }

  if (!eventId) {
    return (
      <section className="rounded-[1rem] border border-dashed border-[var(--color-line)] bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted)]">
        Guarda primero el evento como borrador. Después podrás configurar sus tipos de boleto, precios, cupos y ventana de venta.
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">Venta y acceso</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--color-ink)]">Tipos de boleto</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">Estos boletos son los que la app muestra, cobra y convierte en pases QR.</p>
        </div>
        <button type="button" disabled={!canWrite || saving} onClick={() => setDraft({ ...emptyDraft })} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-45">
          <Plus size={14} />Nuevo boleto
        </button>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-[var(--color-soft)] p-3 text-xs"><strong className="block text-base text-[var(--color-ink)]">{totals.capacity}</strong>Cupo configurado</div>
        <div className="rounded-xl bg-[var(--color-soft)] p-3 text-xs"><strong className="block text-base text-[var(--color-ink)]">{totals.sold}</strong>Vendidos</div>
        <div className="rounded-xl bg-[var(--color-soft)] p-3 text-xs"><strong className="block text-base text-[var(--color-ink)]">{totals.reserved}</strong>En proceso de pago</div>
      </div>

      {error ? <p className="rounded-xl border border-[#ead8c5] bg-[#fff7ed] p-3 text-xs text-[#8a4b16]">{error}</p> : null}
      {success ? <p className="rounded-xl border border-[#cfddca] bg-[#f5fbf2] p-3 text-xs text-[#4e704e]">{success}</p> : null}

      {loading ? (
        <div className="flex min-h-24 items-center justify-center text-sm text-[var(--color-muted)]"><Loader2 className="mr-2 animate-spin" size={16} />Cargando boletos...</div>
      ) : tickets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-line)] p-5 text-center text-sm text-[var(--color-muted)]">Este evento todavía no tiene boletos configurados.</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const available = Math.max(Number(ticket.capacity) - Number(ticket.sold_count ?? 0) - Number(ticket.reserved_count ?? 0), 0)
            return (
              <article key={ticket.id} className="rounded-xl border border-[var(--color-line)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-ink)]"><Ticket className="mr-2 inline" size={14} />{ticket.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{money(ticket.price)} · {available} disponibles de {ticket.capacity}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-gold)]">{ticket.status} · {ticket.active && ticket.visible_in_app ? 'Visible y vendible' : 'No visible'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={!canWrite || saving} onClick={() => setDraft(draftFromTicket(ticket))} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-45"><Pencil size={13} />Editar</button>
                    {pendingRemoveId === ticket.id ? (
                      <>
                        <button type="button" disabled={saving} onClick={() => void remove(ticket.id)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[var(--color-alert)] px-3 text-xs font-semibold text-white disabled:opacity-45"><Trash2 size={13} />Confirmar retiro</button>
                        <button type="button" disabled={saving} onClick={() => setPendingRemoveId('')} className="inline-flex min-h-9 items-center rounded-lg border border-[var(--color-line)] px-3 text-xs">Cancelar</button>
                      </>
                    ) : (
                      <button type="button" disabled={!canDelete || saving} onClick={() => setPendingRemoveId(ticket.id)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[rgba(157,71,63,0.3)] px-3 text-xs font-semibold text-[var(--color-alert)] disabled:opacity-45"><Trash2 size={13} />Retirar</button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {draft ? (
        <form onSubmit={submit} className="grid gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-soft)] p-4 sm:grid-cols-2">
          <div className="flex items-center justify-between sm:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">{draft.id ? 'Editar boleto' : 'Nuevo boleto'}</h3>
            <button type="button" onClick={() => setDraft(null)} aria-label="Cerrar formulario"><X size={16} /></button>
          </div>
          <Field label="Nombre" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} required />
          <Field label="Precio MXN" type="number" value={draft.price} onChange={(price) => setDraft({ ...draft, price })} required />
          <Field label="Capacidad" type="number" value={draft.capacity} onChange={(capacity) => setDraft({ ...draft, capacity })} required />
          <Field label="Orden" type="number" value={draft.sortOrder} onChange={(sortOrder) => setDraft({ ...draft, sortOrder })} />
          <label><span className={labelClass}>Inicio de venta</span><CrystalDateTimeField value={draft.salesStartAt} onChange={(salesStartAt) => setDraft({ ...draft, salesStartAt })} /></label>
          <label><span className={labelClass}>Cierre de venta</span><CrystalDateTimeField value={draft.salesEndAt} onChange={(salesEndAt) => setDraft({ ...draft, salesEndAt })} /></label>
          <label><span className={labelClass}>Estado</span><CrystalSelect value={draft.status} onChange={(status) => setDraft({ ...draft, status: status as TicketDraft['status'] })}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="inactive">Inactivo</option><option value="archived">Archivado</option></CrystalSelect></label>
          <label><span className={labelClass}>Venta</span><CrystalSelect value={draft.active} onChange={(active) => setDraft({ ...draft, active })}><option value="true">Activa</option><option value="false">Inactiva</option></CrystalSelect></label>
          <label><span className={labelClass}>Visible en app</span><CrystalSelect value={draft.visibleInApp} onChange={(visibleInApp) => setDraft({ ...draft, visibleInApp })}><option value="true">Sí</option><option value="false">No</option></CrystalSelect></label>
          <label className="sm:col-span-2"><span className={labelClass}>Descripción</span><textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-sm outline-none" /></label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setDraft(null)} className="inline-flex min-h-10 items-center rounded-xl border border-[var(--color-line)] bg-white px-4 text-xs font-semibold text-[var(--color-burgundy)]">Cancelar</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-45">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Guardar boleto</button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]'

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label><span className={labelClass}>{label}{required ? ' *' : ''}</span><input type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm outline-none" /></label>
}
