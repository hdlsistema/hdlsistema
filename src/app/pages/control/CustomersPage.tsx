import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  BadgeCheck,
  Download,
  FileClock,
  Mail,
  MessageSquarePlus,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Tag,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  customersClient,
  type CustomerHistoryItem,
  type CustomerNote,
  type CustomerPayload,
  type CustomerRecord,
  type CustomerRelationItem,
  type CustomerSegment,
  type CustomerTag,
} from '../../../services/customers.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type CustomerForm = {
  id?: string
  firstName: string
  lastName: string
  displayName: string
  email: string
  phone: string
  birthDate: string
  source: string
  segment: CustomerSegment
  preferredLanguage: 'es' | 'en'
  marketingEmailConsent: boolean
  marketingPushConsent: boolean
  notes: string
}

const emptyCustomerForm: CustomerForm = {
  firstName: '',
  lastName: '',
  displayName: '',
  email: '',
  phone: '',
  birthDate: '',
  source: 'Centro de control',
  segment: 'new',
  preferredLanguage: 'es',
  marketingEmailConsent: false,
  marketingPushConsent: false,
  notes: '',
}

const segments: Array<{ value: CustomerSegment; label: string }> = [
  { value: 'new', label: 'Nuevo' },
  { value: 'recurrente', label: 'Recurrente' },
  { value: 'vip', label: 'VIP' },
  { value: 'alto_valor', label: 'Alto valor' },
  { value: 'en_riesgo', label: 'En riesgo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'wine_club', label: 'Wine Club' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'customer', label: 'Cliente' },
]

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations', 'marketing'].includes(role))
}

function canManageTags(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'marketing'].includes(role))
}

function canExport(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations', 'marketing', 'finance'].includes(role))
}

function segmentLabel(value: string) {
  return segments.find((item) => item.value === value)?.label ?? value
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}

function money(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function formFromCustomer(customer: CustomerRecord): CustomerForm {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    displayName: customer.displayName,
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    birthDate: customer.birthDate ?? '',
    source: customer.source ?? 'Centro de control',
    segment: customer.segment,
    preferredLanguage: customer.preferredLanguage,
    marketingEmailConsent: customer.marketingEmailConsent,
    marketingPushConsent: customer.marketingPushConsent,
    notes: customer.notes ?? '',
  }
}

function payloadFromForm(form: CustomerForm): CustomerPayload {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim() || null,
    displayName: form.displayName.trim() || null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    birthDate: form.birthDate || null,
    source: form.source.trim() || 'Centro de control',
    segment: form.segment,
    preferredLanguage: form.preferredLanguage,
    marketingEmailConsent: form.marketingEmailConsent,
    marketingPushConsent: form.marketingPushConsent,
    notes: form.notes.trim() || null,
  }
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold uppercase text-[var(--color-muted)]">
      {label}
      {children}
    </label>
  )
}

function inputClass() {
  return 'min-h-11 w-full rounded-md border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-burgundy)]'
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <Panel className="rounded-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-[var(--color-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-soft)] text-[var(--color-burgundy)]">
          <Icon size={18} />
        </span>
      </div>
    </Panel>
  )
}

export function CustomersPage() {
  const { isEnglish } = useAppPreferences()
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const tagWritable = canManageTags(roles)
  const exportable = canExport(roles)

  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [tags, setTags] = useState<CustomerTag[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<CustomerRecord | null>(null)
  const [reservations, setReservations] = useState<CustomerRelationItem[]>([])
  const [orders, setOrders] = useState<CustomerRelationItem[]>([])
  const [memberships, setMemberships] = useState<CustomerRelationItem[]>([])
  const [history, setHistory] = useState<CustomerHistoryItem[]>([])
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [consentFilter, setConsentFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [form, setForm] = useState<CustomerForm | null>(null)
  const [note, setNote] = useState('')
  const [editingNote, setEditingNote] = useState<CustomerNote | null>(null)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#681126')
  const [assignTagId, setAssignTagId] = useState('')

  const selected = selectedDetail ?? customers.find((item) => item.id === selectedId) ?? customers[0] ?? null

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [customerResponse, tagResponse] = await Promise.all([
        customersClient.list(token, {
          search: search || undefined,
          segment: segmentFilter || undefined,
          tagId: tagFilter || undefined,
          consent: consentFilter || undefined,
          perPage: 100,
        }),
        customersClient.tags(token),
      ])
      setCustomers(customerResponse.data)
      setTags(tagResponse.data)
      setSelectedId((current) => current ?? customerResponse.data[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar clientes.')
    } finally {
      setLoading(false)
    }
  }, [consentFilter, search, segmentFilter, tagFilter, token])

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const [detail, customerReservations, customerOrders, customerMemberships, customerHistory] = await Promise.all([
        customersClient.get(token, id),
        customersClient.reservations(token, id),
        customersClient.orders(token, id),
        customersClient.memberships(token, id),
        customersClient.history(token, id),
      ])
      setSelectedDetail(detail.data)
      setReservations(customerReservations.data)
      setOrders(customerOrders.data)
      setMemberships(customerMemberships.data)
      setHistory(customerHistory.data)
      setAssignTagId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar el expediente del cliente.')
    } finally {
      setDetailLoading(false)
    }
  }, [token])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCustomers(), 300)
    return () => window.clearTimeout(timer)
  }, [loadCustomers])

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null)
      setReservations([])
      setOrders([])
      setMemberships([])
      setHistory([])
      return
    }
    void loadDetail(selectedId)
  }, [loadDetail, selectedId])

  const metrics = useMemo(() => ({
    total: customers.length,
    vip: customers.filter((item) => item.segment === 'vip' || item.activeMembershipsCount > 0).length,
    revenue: customers.reduce((sum, item) => sum + item.totalSpend, 0),
    consent: customers.filter((item) => item.marketingEmailConsent || item.marketingPushConsent).length,
  }), [customers])

  const openCreate = () => {
    setForm(emptyCustomerForm)
    setError('')
  }

  const openEdit = (customer: CustomerRecord) => {
    setForm(formFromCustomer(customer))
    setError('')
  }

  const submitCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form || saving) return
    setSaving(true)
    setError('')
    try {
      const payload = payloadFromForm(form)
      const response = form.id
        ? await customersClient.update(token, form.id, payload)
        : await customersClient.create(token, payload)
      setForm(null)
      setSelectedId(response.data.id)
      setToast(form.id ? 'Cliente actualizado en Supabase.' : 'Cliente creado en Supabase.')
      await loadCustomers()
      await loadDetail(response.data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el cliente.')
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (message: string, action: () => Promise<unknown>, confirmMessage: string) => {
    if (!writable || saving) return
    if (!window.confirm(confirmMessage)) return
    setSaving(true)
    setError('')
    try {
      await action()
      setToast(message)
      await loadCustomers()
      if (selectedId) await loadDetail(selectedId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible completar la acción.')
    } finally {
      setSaving(false)
    }
  }

  const submitNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !note.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      if (editingNote) {
        await customersClient.updateNote(token, selected.id, editingNote.id, note)
      } else {
        await customersClient.addNote(token, selected.id, note)
      }
      setNote('')
      setEditingNote(null)
      setToast('Nota guardada en Supabase.')
      await loadDetail(selected.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar la nota.')
    } finally {
      setSaving(false)
    }
  }

  const submitTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!tagWritable || !tagName.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const response = await customersClient.createTag(token, { name: tagName, color: tagColor })
      setTags((current) => [...current, response.data].sort((a, b) => a.name.localeCompare(b.name, 'es-MX')))
      setTagName('')
      setToast('Etiqueta creada en Supabase.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la etiqueta.')
    } finally {
      setSaving(false)
    }
  }

  const assignTag = async () => {
    if (!selected || !assignTagId || saving) return
    setSaving(true)
    setError('')
    try {
      await customersClient.assignTag(token, selected.id, assignTagId)
      setToast('Etiqueta asignada.')
      await loadDetail(selected.id)
      await loadCustomers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible asignar la etiqueta.')
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = async () => {
    if (!exportable) return
    setError('')
    try {
      const response = await customersClient.exportCsv(token, {
        search: search || undefined,
        segment: segmentFilter || undefined,
        tagId: tagFilter || undefined,
        consent: consentFilter || undefined,
      })
      if (!response.ok) throw new Error('No fue posible exportar clientes.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'clientes-hacienda-de-letras.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar clientes.')
    }
  }

  const pageTitle = isEnglish ? 'Customers' : 'Clientes'
  const pageDescription = isEnglish
    ? 'Operational CRM connected to customer records, relations and audit trail.'
    : 'CRM operativo conectado a clientes, relaciones e historial real.'

  return (
    <div className="min-h-full bg-[var(--color-bg)] px-4 py-6 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1480px] gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow="CRM"
            title={pageTitle}
            subtitle={pageDescription}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-burgundy)]"
            >
              <RefreshCw size={16} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!exportable}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-burgundy)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download size={16} />
              Exportar
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={!writable}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus size={16} />
              Nuevo cliente
            </button>
          </div>
        </div>

        {toast ? (
          <div className="rounded-md border border-[#b7d7bd] bg-[#eef8f0] px-4 py-3 text-sm font-medium text-[#35623d]">
            {toast}
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-col gap-3 rounded-md border border-[#e2b6b6] bg-[#fff4f4] px-4 py-3 text-sm text-[#8c2f2f] sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="inline-flex h-9 items-center justify-center rounded-md border border-[#d78d8d] px-3 font-semibold"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Clientes visibles" value={String(metrics.total)} icon={Users} />
          <Metric label="VIP o membresía activa" value={String(metrics.vip)} icon={BadgeCheck} />
          <Metric label="Valor histórico" value={money(metrics.revenue)} icon={UserRound} />
          <Metric label="Consentimiento marketing" value={String(metrics.consent)} icon={Mail} />
        </div>

        <Panel className="rounded-lg">
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px_190px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${inputClass()} pl-10`}
                placeholder="Buscar por nombre, correo, teléfono o número"
              />
            </label>
            <CrystalSelect value={segmentFilter} onChange={setSegmentFilter}>
              <option value="">Todos los segmentos</option>
              {segments.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </CrystalSelect>
            <CrystalSelect value={tagFilter} onChange={setTagFilter}>
              <option value="">Todas las etiquetas</option>
              {tags.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </CrystalSelect>
            <CrystalSelect value={consentFilter} onChange={setConsentFilter}>
              <option value="">Todo consentimiento</option>
              <option value="email">Correo autorizado</option>
              <option value="push">Push autorizado</option>
              <option value="none">Sin consentimiento</option>
            </CrystalSelect>
          </div>
        </Panel>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Panel className="rounded-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">Directorio</h2>
                <p className="text-sm text-[var(--color-muted)]">Datos leídos desde Supabase.</p>
              </div>
              {loading ? <RefreshCw className="animate-spin text-[var(--color-burgundy)]" size={18} /> : null}
            </div>

            {loading ? (
              <div className="grid gap-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-lg bg-[var(--color-soft)]" />
                ))}
              </div>
            ) : customers.length ? (
              <div className="grid gap-3">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelectedId(customer.id)}
                    className={`grid gap-3 rounded-lg border p-4 text-left transition hover:border-[var(--color-burgundy)] md:grid-cols-[auto_1fr_auto] md:items-center ${
                      selected?.id === customer.id
                        ? 'border-[var(--color-burgundy)] bg-[var(--color-soft)]'
                        : 'border-[var(--color-line)] bg-white'
                    }`}
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[var(--color-burgundy)] text-sm font-bold text-white">
                      {initials(customer.displayName)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[var(--color-ink)]">{customer.displayName}</span>
                        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[var(--color-burgundy)]">
                          {segmentLabel(customer.segment)}
                        </span>
                      </span>
                      <span className="mt-2 grid gap-1 text-sm text-[var(--color-muted)] md:grid-cols-2">
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <Mail size={14} />
                          <span className="truncate">{customer.email ?? 'Sin correo'}</span>
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <Phone size={14} />
                          <span className="truncate">{customer.phone ?? 'Sin teléfono'}</span>
                        </span>
                      </span>
                    </span>
                    <span className="grid gap-1 text-right text-sm">
                      <span className="font-semibold text-[var(--color-ink)]">{money(customer.totalSpend)}</span>
                      <span className="text-[var(--color-muted)]">{customer.reservationsCount} reservaciones</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-[var(--color-line)] bg-white p-8 text-center">
                <div>
                  <Users className="mx-auto text-[var(--color-muted)]" size={28} />
                  <p className="mt-3 font-semibold text-[var(--color-ink)]">Sin clientes para estos filtros</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">Ajusta la búsqueda o crea un cliente desde el Centro de Control.</p>
                </div>
              </div>
            )}
          </Panel>

          <Panel className="rounded-lg">
            {selected ? (
              <div className="grid gap-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">{selected.customerNumber}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">{selected.displayName}</h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">Actualizado: {formatDate(selected.updatedAt)}</p>
                  </div>
                  {detailLoading ? <RefreshCw className="animate-spin text-[var(--color-burgundy)]" size={18} /> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selected.tags.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-semibold"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                  ))}
                  {!selected.tags.length ? <span className="text-sm text-[var(--color-muted)]">Sin etiquetas internas.</span> : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Reservaciones" value={String(selected.reservationsCount)} />
                  <MiniStat label="Órdenes" value={String(selected.ordersCount)} />
                  <MiniStat label="Membresías activas" value={String(selected.activeMembershipsCount)} />
                  <MiniStat label="Ticket promedio" value={money(selected.averageTicket)} />
                </div>

                <div className="grid gap-2 text-sm">
                  <InfoRow icon={Mail} label="Correo" value={selected.email ?? 'Sin correo'} />
                  <InfoRow icon={Phone} label="Teléfono" value={selected.phone ?? 'Sin teléfono'} />
                  <InfoRow icon={Tag} label="Origen" value={selected.source ?? 'Sin origen'} />
                  <InfoRow icon={BadgeCheck} label="Consentimiento" value={[
                    selected.marketingEmailConsent ? 'correo' : '',
                    selected.marketingPushConsent ? 'push' : '',
                  ].filter(Boolean).join(', ') || 'sin autorización'} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(selected)}
                    disabled={!writable}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Pencil size={15} />
                    Editar
                  </button>
                  {selected.archivedAt ? (
                    <button
                      type="button"
                      onClick={() => void runAction(
                        'Cliente restaurado.',
                        () => customersClient.restore(token, selected.id),
                        '¿Restaurar este cliente al directorio activo?',
                      )}
                      disabled={!writable || saving}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <RotateCcw size={15} />
                      Restaurar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void runAction(
                        'Cliente archivado.',
                        () => customersClient.archive(token, selected.id),
                        '¿Archivar este cliente? Sus relaciones históricas se conservan.',
                      )}
                      disabled={!writable || saving}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d5b2b2] bg-white px-3 text-sm font-semibold text-[#8c2f2f] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Archive size={15} />
                      Archivar
                    </button>
                  )}
                </div>

                <form onSubmit={submitNote} className="grid gap-3 rounded-lg border border-[var(--color-line)] bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-[var(--color-ink)]">Notas internas</h3>
                    {editingNote ? (
                      <button type="button" onClick={() => { setEditingNote(null); setNote('') }} className="text-sm font-semibold text-[var(--color-burgundy)]">
                        Cancelar edición
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className={`${inputClass()} min-h-24 py-3`}
                    placeholder="Registrar seguimiento, preferencia o contexto comercial"
                    disabled={!writable}
                  />
                  <button
                    type="submit"
                    disabled={!writable || saving || !note.trim()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--color-burgundy)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <MessageSquarePlus size={15} />
                    Guardar nota
                  </button>
                  <div className="grid gap-2">
                    {(selected.recentNotes ?? []).map((item) => (
                      <div key={item.id} className="rounded-md bg-[var(--color-soft)] p-3 text-sm">
                        <p className="text-[var(--color-ink)]">{item.note}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
                          <span>{formatDate(item.createdAt)}</span>
                          <button type="button" onClick={() => { setEditingNote(item); setNote(item.note) }} disabled={!writable} className="font-semibold text-[var(--color-burgundy)] disabled:opacity-45">
                            Editar
                          </button>
                          <button type="button" onClick={() => {
                            if (window.confirm('¿Eliminar esta nota interna?')) {
                              void customersClient.deleteNote(token, selected.id, item.id)
                                .then(() => loadDetail(selected.id))
                                .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No fue posible eliminar la nota.'))
                            }
                          }} disabled={!writable} className="font-semibold text-[#8c2f2f] disabled:opacity-45">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                    {!(selected.recentNotes ?? []).length ? <p className="text-sm text-[var(--color-muted)]">Sin notas internas registradas.</p> : null}
                  </div>
                </form>

                <div className="grid gap-3 rounded-lg border border-[var(--color-line)] bg-white p-3">
                  <h3 className="font-semibold text-[var(--color-ink)]">Etiquetas</h3>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <CrystalSelect value={assignTagId} onChange={setAssignTagId} disabled={!writable}>
                      <option value="">Seleccionar etiqueta</option>
                      {tags.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </CrystalSelect>
                    <button type="button" onClick={assignTag} disabled={!writable || saving || !assignTagId} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--color-line)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
                      <Tag size={15} />
                      Asignar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.tags.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void runAction(
                          'Etiqueta retirada.',
                          () => customersClient.unassignTag(token, selected.id, item.id),
                          '¿Retirar esta etiqueta del cliente?',
                        )}
                        disabled={!writable || saving}
                        className="rounded-md border border-[var(--color-line)] px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {item.name} ×
                      </button>
                    ))}
                  </div>
                </div>

                <RelatedPanel title="Reservaciones" items={reservations} empty="Sin reservaciones asociadas." />
                <RelatedPanel title="Órdenes" items={orders} empty="Sin órdenes asociadas." />
                <RelatedPanel title="Membresías" items={memberships} empty="Sin membresías asociadas." />
                <HistoryPanel items={history} />
              </div>
            ) : (
              <div className="grid min-h-80 place-items-center text-center">
                <div>
                  <UserRound className="mx-auto text-[var(--color-muted)]" size={32} />
                  <p className="mt-3 font-semibold text-[var(--color-ink)]">Selecciona un cliente</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">El expediente se mostrará con relaciones reales.</p>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <Panel className="rounded-lg">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <form onSubmit={submitTag} className="grid gap-3">
              <h2 className="font-semibold text-[var(--color-ink)]">Catálogo de etiquetas</h2>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
                <input value={tagName} onChange={(event) => setTagName(event.target.value)} className={inputClass()} placeholder="Nombre de etiqueta" disabled={!tagWritable} />
                <input type="color" value={tagColor} onChange={(event) => setTagColor(event.target.value)} className="h-11 w-full rounded-md border border-[var(--color-line)] bg-white p-1 disabled:opacity-45" disabled={!tagWritable} />
                <button type="submit" disabled={!tagWritable || saving || !tagName.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
                  <Plus size={16} />
                  Crear
                </button>
              </div>
            </form>
            <div className="flex flex-wrap gap-2 self-end">
              {tags.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!tagWritable) return
                    const next = window.prompt('Nuevo nombre de etiqueta', item.name)
                    if (!next?.trim()) return
                    void customersClient.updateTag(token, item.id, { name: next.trim() })
                      .then(() => loadCustomers())
                      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No fue posible actualizar la etiqueta.'))
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-semibold"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <form onSubmit={submitCustomer} className="grid max-h-[92vh] w-full max-w-3xl gap-4 overflow-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-ink)]">{form.id ? 'Editar cliente' : 'Nuevo cliente'}</h2>
                <p className="text-sm text-[var(--color-muted)]">Registro administrativo sin crear usuario Auth.</p>
              </div>
              <button type="button" onClick={() => setForm(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-line)]">
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nombre">
                <input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className={inputClass()} />
              </Field>
              <Field label="Apellido">
                <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className={inputClass()} />
              </Field>
              <Field label="Nombre visible">
                <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className={inputClass()} />
              </Field>
              <Field label="Correo">
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass()} />
              </Field>
              <Field label="Teléfono">
                <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputClass()} />
              </Field>
              <Field label="Nacimiento">
                <input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} className={inputClass()} />
              </Field>
              <Field label="Origen">
                <input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className={inputClass()} />
              </Field>
              <Field label="Segmento">
                <CrystalSelect value={form.segment} onChange={(value) => setForm({ ...form, segment: value as CustomerSegment })}>
                  {segments.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </CrystalSelect>
              </Field>
              <Field label="Idioma">
                <CrystalSelect value={form.preferredLanguage} onChange={(value) => setForm({ ...form, preferredLanguage: value as 'es' | 'en' })}>
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                </CrystalSelect>
              </Field>
              <div className="grid gap-3 rounded-lg border border-[var(--color-line)] p-3">
                <label className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--color-ink)]">
                  <input type="checkbox" checked={form.marketingEmailConsent} onChange={(event) => setForm({ ...form, marketingEmailConsent: event.target.checked })} />
                  Autoriza correo
                </label>
                <label className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--color-ink)]">
                  <input type="checkbox" checked={form.marketingPushConsent} onChange={(event) => setForm({ ...form, marketingPushConsent: event.target.checked })} />
                  Autoriza notificaciones
                </label>
              </div>
              <Field label="Notas">
                <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={`${inputClass()} min-h-24 py-3`} />
              </Field>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--color-line)] px-4 text-sm font-semibold">
                Cancelar
              </button>
              <button type="submit" disabled={saving || !writable} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
                <Save size={16} />
                {saving ? 'Guardando' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-white p-3">
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-[var(--color-soft)] p-3">
      <Icon className="shrink-0 text-[var(--color-burgundy)]" size={16} />
      <span className="min-w-0">
        <span className="block text-xs text-[var(--color-muted)]">{label}</span>
        <span className="block truncate font-medium text-[var(--color-ink)]">{value}</span>
      </span>
    </div>
  )
}

function RelatedPanel({ title, items, empty }: { title: string; items: CustomerRelationItem[]; empty: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-[var(--color-line)] bg-white p-3">
      <h3 className="font-semibold text-[var(--color-ink)]">{title}</h3>
      {items.length ? items.slice(0, 5).map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-[var(--color-soft)] px-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-semibold text-[var(--color-ink)]">
              {item.reservationNumber ?? item.orderNumber ?? item.membershipNumber ?? item.plan?.name ?? 'Registro'}
            </span>
            <span className="text-xs text-[var(--color-muted)]">{item.createdAt ? formatDate(item.createdAt) : item.startsAt ? formatDate(item.startsAt) : 'Sin fecha'}</span>
          </span>
          <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-[var(--color-burgundy)]">{item.status}</span>
        </div>
      )) : <p className="text-sm text-[var(--color-muted)]">{empty}</p>}
    </div>
  )
}

function HistoryPanel({ items }: { items: CustomerHistoryItem[] }) {
  return (
    <div className="grid gap-2 rounded-lg border border-[var(--color-line)] bg-white p-3">
      <div className="flex items-center gap-2">
        <FileClock size={16} className="text-[var(--color-burgundy)]" />
        <h3 className="font-semibold text-[var(--color-ink)]">Historial</h3>
      </div>
      {items.length ? items.slice(0, 6).map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-[var(--color-soft)] px-3 py-2 text-sm">
          <span className="min-w-0"><span className="block truncate font-medium text-[var(--color-ink)]">{item.action}</span>{historyEntityRoute(item) ? <Link to={historyEntityRoute(item)!} className="mt-1 block text-xs text-[var(--color-burgundy)]">Ver {historyEntityLabel(item)}</Link> : null}</span>
          <span className="text-xs text-[var(--color-muted)]">{formatDate(item.createdAt)}</span>
        </div>
      )) : <p className="text-sm text-[var(--color-muted)]">Sin eventos de auditoría todavía.</p>}
    </div>
  )
}

function historyEntityRoute(item: CustomerHistoryItem) {
  if (!item.entityId) return null
  if (item.entityType === 'cart') return `/control/carritos?cartId=${encodeURIComponent(item.entityId)}`
  if (item.entityType === 'order') return '/control/ordenes'
  if (item.entityType === 'reservation') return '/control/reservaciones'
  if (item.entityType === 'membership') return '/control/wine-club'
  return null
}

function historyEntityLabel(item: CustomerHistoryItem) {
  if (item.entityType === 'cart') return 'carrito'
  if (item.entityType === 'order') return 'orden'
  if (item.entityType === 'reservation') return 'reservación'
  if (item.entityType === 'membership') return 'membresía'
  return 'registro'
}
