import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Archive,
  AlertTriangle,
  BadgeCheck,
  Building2,
  Clock3,
  Crown,
  Download,
  FileClock,
  Gem,
  Globe2,
  Mail,
  MapPin,
  Megaphone,
  MessageSquarePlus,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Tag,
  UserPlus,
  UserRound,
  Users,
  Wine,
  X,
  type LucideIcon,
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
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { dateOnly, eventLabel, money as formatMoney, statusLabel as safeStatusLabel } from './controlCopy'

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

type PendingCustomerAction = {
  title: string
  message: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  action: () => Promise<unknown>
  success: string
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

type CustomerSourceGroup = '' | 'app' | 'web' | 'hacienda'
type CustomerAccountFilter = '' | 'customer' | 'staff' | 'admin' | 'customer_staff'

const segmentProfiles: Record<CustomerSegment, { label: string; icon: LucideIcon; campaignKey: string }> = {
  customer: { label: 'Cliente', icon: UserRound, campaignKey: 'CLIENTE' },
  new: { label: 'Nuevo', icon: UserPlus, campaignKey: 'NUEVO' },
  recurrente: { label: 'Recurrente', icon: RotateCcw, campaignKey: 'RECURRENTE' },
  vip: { label: 'VIP', icon: Crown, campaignKey: 'VIP' },
  alto_valor: { label: 'Alto valor', icon: Gem, campaignKey: 'ALTO VALOR' },
  en_riesgo: { label: 'En riesgo', icon: AlertTriangle, campaignKey: 'EN RIESGO' },
  inactivo: { label: 'Inactivo', icon: Clock3, campaignKey: 'INACTIVO' },
  wine_club: { label: 'Wine Club', icon: Wine, campaignKey: 'WINE CLUB' },
  corporativo: { label: 'Corporativo', icon: Building2, campaignKey: 'CORPORATIVO' },
}

const sourceOptions: Array<{ value: CustomerSourceGroup; label: string; labelEn: string }> = [
  { value: '', label: 'Todos los orígenes', labelEn: 'All sources' },
  { value: 'app', label: 'App', labelEn: 'App' },
  { value: 'web', label: 'Web', labelEn: 'Web' },
  { value: 'hacienda', label: 'Hacienda / manual', labelEn: 'Hacienda / manual' },
]

const accountOptions: Array<{ value: CustomerAccountFilter; label: string; labelEn: string }> = [
  { value: '', label: 'Todas las clasificaciones', labelEn: 'All classifications' },
  { value: 'customer', label: 'Clientes', labelEn: 'Customers' },
  { value: 'staff', label: 'Usuarios internos', labelEn: 'Internal users' },
  { value: 'admin', label: 'Administradores', labelEn: 'Administrators' },
  { value: 'customer_staff', label: 'Cliente + staff', labelEn: 'Customer + staff' },
]

const staffRoleLabels: Record<string, string> = {
  super_admin: 'Superadministrador',
  admin: 'Administrador',
  operations: 'Operación',
  marketing: 'Marketing',
  finance: 'Finanzas',
  viewer: 'Lectura',
}

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
  return segmentProfiles[value as CustomerSegment]?.label ?? segments.find((item) => item.value === value)?.label ?? value
}

function segmentProfile(value: CustomerSegment) {
  return segmentProfiles[value] ?? segmentProfiles.customer
}

function normalizeValue(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function sourceGroup(value?: string | null): Exclude<CustomerSourceGroup, ''> {
  const normalized = normalizeValue(value)
  if (normalized.includes('app') || normalized.includes('mobile') || normalized.includes('android') || normalized.includes('ios')) return 'app'
  if (normalized.includes('web') || normalized.includes('landing') || normalized.includes('ecommerce') || normalized.includes('checkout')) return 'web'
  return 'hacienda'
}

function sourceLabel(value?: string | null, isEnglish = false) {
  const group = sourceGroup(value)
  if (group === 'app') return 'App'
  if (group === 'web') return 'Web'
  return isEnglish ? 'Hacienda / manual' : 'Hacienda / manual'
}

function sourceIcon(value?: string | null) {
  const group = sourceGroup(value)
  if (group === 'app') return Smartphone
  if (group === 'web') return Globe2
  return MapPin
}

function operationalStatusLabel(value?: string | null) {
  return safeStatusLabel(value)
}

function historyActionLabel(value?: string | null) {
  return eventLabel(value)
}

function formatDate(value: string | null | undefined) {
  return dateOnly(value)
}

function money(value: number) {
  return formatMoney(value)
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

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <Panel className="control-metric rounded-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-[var(--color-muted)]">{label}</p>
          <p className="control-metric__value font-semibold text-[var(--color-ink)]">{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-soft)] text-[var(--color-burgundy)]">
          <Icon size={18} />
        </span>
      </div>
    </Panel>
  )
}

function matchesAccountFilter(customer: CustomerRecord, filter: CustomerAccountFilter) {
  if (!filter) return true
  if (filter === 'staff') return Boolean(customer.isStaff)
  if (filter === 'customer') return !customer.isStaff
  return customer.accountType === filter
}

function classificationLabel(customer: CustomerRecord) {
  return customer.isStaff ? customer.accountLabel : segmentLabel(customer.segment)
}

function campaignAudience(customer: CustomerRecord) {
  return customer.isStaff ? customer.campaignAudience || 'USUARIO INTERNO' : segmentProfile(customer.segment).campaignKey
}

function staffScopeLabel(customer: CustomerRecord, isEnglish = false) {
  if (!customer.isStaff) return sourceLabel(customer.source, isEnglish)
  const labels = customer.staffScopes.map((scope) => scope.label).filter(Boolean)
  if (labels.length) return labels.join(' · ')
  return isEnglish ? 'No assigned site' : 'Sin sede asignada'
}

function staffAccessLabel(customer: CustomerRecord) {
  const roleLabels = customer.staffRoles.map((role) => staffRoleLabels[role] ?? role).filter(Boolean)
  if (roleLabels.length) return roleLabels.join(' · ')
  if (customer.staffPermissionCount > 0) return `${customer.staffPermissionCount} permisos`
  return 'Permisos activos'
}

export function CustomersPage() {
  const { isEnglish } = useAppPreferences()
  const { session, roles } = useAuth()
  const [searchParams] = useSearchParams()
  const linkedCustomerId = searchParams.get('customerId')
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
  const [accountFilter, setAccountFilter] = useState<CustomerAccountFilter>('')
  const [sourceFilter, setSourceFilter] = useState<CustomerSourceGroup>('')
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
  const [tagColor, setTagColor] = useState('#5B0B1F')
  const [assignTagId, setAssignTagId] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingCustomerAction | null>(null)
  const [tagEdit, setTagEdit] = useState<CustomerTag | null>(null)
  const [tagEditName, setTagEditName] = useState('')

  const visibleCustomers = useMemo(() => {
    if (!selectedDetail) return customers
    return customers.map((customer) => customer.id === selectedDetail.id ? { ...customer, ...selectedDetail } : customer)
  }, [customers, selectedDetail])

  const filteredCustomers = useMemo(
    () => visibleCustomers.filter((customer) =>
      (!sourceFilter || sourceGroup(customer.source) === sourceFilter) &&
      matchesAccountFilter(customer, accountFilter),
    ),
    [accountFilter, sourceFilter, visibleCustomers],
  )

  const selected = selectedDetail && filteredCustomers.some((item) => item.id === selectedDetail.id)
    ? selectedDetail
    : filteredCustomers.find((item) => item.id === selectedId) ?? filteredCustomers[0] ?? null

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [customerResponse, tagResponse] = await Promise.all([
        customersClient.list(token, {
          search: search || undefined,
          segment: segmentFilter || undefined,
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
  }, [consentFilter, search, segmentFilter, token])

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
      setCustomers((current) => current.map((customer) => customer.id === detail.data.id ? { ...customer, ...detail.data } : customer))
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
    if (linkedCustomerId) setSelectedId(linkedCustomerId)
  }, [linkedCustomerId])

  useEffect(() => {
    if (loading) return
    if (!filteredCustomers.length) {
      if (selectedId) setSelectedId(null)
      return
    }
    if (!selectedId || !filteredCustomers.some((customer) => customer.id === selectedId)) {
      setSelectedId(filteredCustomers[0].id)
    }
  }, [filteredCustomers, loading, selectedId])

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null)
      setReservations([])
      setOrders([])
      setMemberships([])
      setHistory([])
      return
    }
    const selectedListRecord = customers.find((customer) => customer.id === selectedId)
    if (selectedListRecord?.isStaff && !selectedListRecord.isCustomer) {
      setSelectedDetail(selectedListRecord)
      setReservations([])
      setOrders([])
      setMemberships([])
      setHistory([])
      setAssignTagId('')
      setDetailLoading(false)
      return
    }
    void loadDetail(selectedId)
  }, [customers, loadDetail, selectedId])

  const metrics = useMemo(() => ({
    total: filteredCustomers.length,
    customers: filteredCustomers.filter((item) => !item.isStaff).length,
    staff: filteredCustomers.filter((item) => item.isStaff).length,
    revenue: filteredCustomers.filter((item) => !item.isStaff).reduce((sum, item) => sum + item.totalSpend, 0),
    consent: filteredCustomers.filter((item) => item.marketingEmailConsent || item.marketingPushConsent).length,
  }), [filteredCustomers])

  const openCreate = () => {
    setForm(emptyCustomerForm)
    setError('')
  }

  const clearFilters = () => {
    setSearch('')
    setSegmentFilter('')
    setAccountFilter('')
    setSourceFilter('')
    setConsentFilter('')
  }

  const openEdit = (customer: CustomerRecord) => {
    if (!customer.isCustomer) {
      setToast('Los usuarios internos se administran desde Usuarios y permisos.')
      return
    }
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
      setToast(form.id ? 'Cliente actualizado.' : 'Cliente creado.')
      await loadCustomers()
      await loadDetail(response.data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el cliente.')
    } finally {
      setSaving(false)
    }
  }

  const requestAction = (pending: PendingCustomerAction) => {
    if (!writable || saving) return
    setPendingAction(pending)
  }

  const confirmPendingAction = async () => {
    if (!pendingAction || saving) return
    setSaving(true)
    setError('')
    try {
      await pendingAction.action()
      setToast(pendingAction.success)
      await loadCustomers()
      if (selectedId) await loadDetail(selectedId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible completar la acción.')
    } finally {
      setSaving(false)
      setPendingAction(null)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!selected || !selected.isCustomer || saving) return
    requestAction({
      title: 'Eliminar nota interna',
      message: 'La nota se retirará del expediente del cliente.',
      confirmLabel: 'Eliminar nota',
      tone: 'danger',
      success: 'Nota eliminada.',
      action: () => customersClient.deleteNote(token, selected.id, noteId),
    })
  }

  const openTagEdit = (tag: CustomerTag) => {
    if (!tagWritable) return
    setTagEdit(tag)
    setTagEditName(tag.name)
  }

  const submitTagEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!tagEdit || !tagWritable || !tagEditName.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await customersClient.updateTag(token, tagEdit.id, { name: tagEditName.trim() })
      setTagEdit(null)
      setTagEditName('')
      setToast('Etiqueta actualizada.')
      await loadCustomers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar la etiqueta.')
    } finally {
      setSaving(false)
    }
  }

  const submitNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !selected.isCustomer || !note.trim() || saving) return
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
      setToast('Nota guardada.')
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
      setToast('Etiqueta creada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la etiqueta.')
    } finally {
      setSaving(false)
    }
  }

  const assignTag = async () => {
    if (!selected || !selected.isCustomer || !assignTagId || saving) return
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

  const pageTitle = isEnglish ? 'Users and customers' : 'Usuarios y clientes'
  const pageDescription = isEnglish
    ? 'Classified directory for customers, internal users, permissions and commercial history.'
    : 'Directorio clasificado de clientes, usuarios internos, permisos e historial comercial.'

  return (
    <div className="control-page control-page--customers min-h-full text-[var(--color-ink)]">
      <div className="grid gap-5">
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
          <div className="rounded-md border border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.08)] px-4 py-3 text-sm font-medium text-[#252F37]">
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

        <div className="control-metrics-strip grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Registros visibles" value={String(metrics.total)} icon={Users} />
          <Metric label="Clientes" value={String(metrics.customers)} icon={UserRound} />
          <Metric label="Usuarios internos" value={String(metrics.staff)} icon={Building2} />
          <Metric label="Valor clientes" value={money(metrics.revenue)} icon={BadgeCheck} />
          <Metric label="Consentimiento marketing" value={String(metrics.consent)} icon={Mail} />
        </div>

        <Panel className="control-customers-filters rounded-lg">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(250px,1fr)_160px_170px_170px_170px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${inputClass()} min-h-10 pl-9 text-[12px]`}
                placeholder="Buscar por nombre, correo, teléfono o número"
              />
            </label>
            <CrystalSelect value={sourceFilter} onChange={(value) => setSourceFilter(value as CustomerSourceGroup)} buttonClassName="control-compact-select-trigger" menuClassName="control-compact-select-menu">
              {sourceOptions.map((item) => (
                <option key={item.value || 'all'} value={item.value}>{isEnglish ? item.labelEn : item.label}</option>
              ))}
            </CrystalSelect>
            <CrystalSelect value={segmentFilter} onChange={setSegmentFilter} buttonClassName="control-compact-select-trigger" menuClassName="control-compact-select-menu">
              <option value="">Todos los segmentos</option>
              {segments.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </CrystalSelect>
            <CrystalSelect value={accountFilter} onChange={(value) => setAccountFilter(value as CustomerAccountFilter)} buttonClassName="control-compact-select-trigger" menuClassName="control-compact-select-menu">
              {accountOptions.map((item) => (
                <option key={item.value || 'all'} value={item.value}>{isEnglish ? item.labelEn : item.label}</option>
              ))}
            </CrystalSelect>
            <CrystalSelect value={consentFilter} onChange={setConsentFilter} buttonClassName="control-compact-select-trigger" menuClassName="control-compact-select-menu">
              <option value="">Todo consentimiento</option>
              <option value="email">Correo autorizado</option>
              <option value="push">Push autorizado</option>
              <option value="none">Sin consentimiento</option>
            </CrystalSelect>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 text-[11px] font-semibold text-[var(--color-burgundy)] transition hover:border-[var(--color-burgundy)]"
            >
              <X size={14} />
              Limpiar
            </button>
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel className="control-customers-board rounded-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-ink)]">Directorio por clasificación</h2>
                <p className="text-[11px] text-[var(--color-muted)]">{filteredCustomers.length} registros visibles para operación, segmentación y campañas.</p>
              </div>
              {loading ? <RefreshCw className="animate-spin text-[var(--color-burgundy)]" size={18} /> : null}
            </div>

            {loading ? (
              <div className="control-customers-card-grid">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="h-40 animate-pulse rounded-lg border border-[var(--color-line)] bg-white" />
                ))}
              </div>
            ) : filteredCustomers.length ? (
              <div className="control-customers-card-grid">
                {filteredCustomers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    active={selected?.id === customer.id}
                    isEnglish={isEnglish}
                    onSelect={() => setSelectedId(customer.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-[var(--color-line)] bg-white p-8 text-center">
                <div>
                  <Users className="mx-auto text-[var(--color-muted)]" size={28} />
                  <p className="mt-3 font-semibold text-[var(--color-ink)]">Sin registros para estos filtros</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">Ajusta la búsqueda o crea un cliente nuevo.</p>
                </div>
              </div>
            )}
          </Panel>

          <Panel className="control-customer-detail-pane rounded-lg">
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
                  {selected.isCustomer ? (
                    <>
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
                    </>
                  ) : (
                    <span className="rounded-md border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-burgundy)]">
                      Usuario interno fuera de campañas comerciales
                    </span>
                  )}
                </div>

                {selected.isCustomer ? (
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat label="Reservaciones" value={String(selected.reservationsCount)} />
                    <MiniStat label="Órdenes" value={String(selected.ordersCount)} />
                    <MiniStat label="Membresías activas" value={String(selected.activeMembershipsCount)} />
                    <MiniStat label="Ticket promedio" value={money(selected.averageTicket)} />
                  </div>
                ) : null}

                <div className="grid gap-2 text-sm">
                  <InfoRow icon={Mail} label="Correo" value={selected.email ?? 'Sin correo'} />
                  <InfoRow icon={Phone} label="Teléfono" value={selected.phone ?? 'Sin teléfono'} />
                  <InfoRow icon={sourceIcon(selected.source)} label="Origen" value={sourceLabel(selected.source, isEnglish)} />
                  <InfoRow icon={selected.isStaff ? Building2 : segmentProfile(selected.segment).icon} label="Clasificación" value={classificationLabel(selected)} />
                  {selected.isStaff ? <InfoRow icon={MapPin} label="Sede operativa" value={staffScopeLabel(selected, isEnglish)} /> : null}
                  <InfoRow icon={Megaphone} label="Audiencia campañas" value={campaignAudience(selected)} />
                  <InfoRow icon={BadgeCheck} label="Consentimiento" value={[
                    selected.marketingEmailConsent ? 'correo' : '',
                    selected.marketingPushConsent ? 'push' : '',
                  ].filter(Boolean).join(', ') || 'sin autorización'} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(selected)}
                    disabled={!writable || !selected.isCustomer}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Pencil size={15} />
                    Editar cliente
                  </button>
                  {selected.isStaff ? (
                    <Link
                      to="/control/usuarios"
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm font-semibold text-[var(--color-burgundy)] transition hover:border-[var(--color-burgundy)]"
                    >
                      <Building2 size={15} />
                      Usuarios y permisos
                    </Link>
                  ) : (
                    <Link
                      to={`/control/campanas?segmento=${encodeURIComponent(selected.segment)}`}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm font-semibold text-[var(--color-burgundy)] transition hover:border-[var(--color-burgundy)]"
                    >
                      <Megaphone size={15} />
                      Campañas
                    </Link>
                  )}
                  {selected.isCustomer ? (
                    selected.archivedAt ? (
                      <button
                        type="button"
                        onClick={() => requestAction({
                          title: 'Restaurar cliente',
                          message: 'El cliente volverá al directorio activo y conservará su historial.',
                          confirmLabel: 'Restaurar',
                          success: 'Cliente restaurado.',
                          action: () => customersClient.restore(token, selected.id),
                        })}
                        disabled={!writable || saving}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <RotateCcw size={15} />
                        Restaurar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => requestAction({
                          title: 'Archivar cliente',
                          message: 'El cliente saldrá del directorio activo, pero sus relaciones históricas se conservan.',
                          confirmLabel: 'Archivar',
                          tone: 'danger',
                          success: 'Cliente archivado.',
                          action: () => customersClient.archive(token, selected.id),
                        })}
                        disabled={!writable || saving}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d5b2b2] bg-white px-3 text-sm font-semibold text-[#8c2f2f] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Archive size={15} />
                        Archivar
                      </button>
                    )
                  ) : null}
                </div>

                {selected.isCustomer ? (
                  <>
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
                              <button type="button" onClick={() => void deleteNote(item.id)} disabled={!writable} className="font-semibold text-[#8c2f2f] disabled:opacity-45">
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
                            onClick={() => requestAction({
                              title: 'Retirar etiqueta',
                              message: `La etiqueta ${item.name} dejará de estar asociada a este cliente.`,
                              confirmLabel: 'Retirar',
                              success: 'Etiqueta retirada.',
                              action: () => customersClient.unassignTag(token, selected.id, item.id),
                            })}
                            disabled={!writable || saving}
                            className="rounded-md border border-[var(--color-line)] px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {item.name} ×
                          </button>
                        ))}
                      </div>
                    </div>

                    <RelatedPanel title="Reservaciones" items={reservations} kind="reservation" empty="Sin reservaciones asociadas." />
                    <RelatedPanel title="Órdenes" items={orders} kind="order" empty="Sin órdenes asociadas." />
                    <RelatedPanel title="Membresías" items={memberships} kind="membership" empty="Sin membresías asociadas." />
                    <HistoryPanel items={history} />
                  </>
                ) : (
                  <div className="grid gap-3 rounded-lg border border-[var(--color-line)] bg-white p-4 text-sm">
                    <h3 className="font-semibold text-[var(--color-ink)]">Cuenta operativa</h3>
                    <p className="text-[var(--color-muted)]">
                      Este registro viene de Supabase Auth y permisos del Centro de Control. No entra a campañas,
                      métricas comerciales, etiquetas ni notas de CRM.
                    </p>
                    <Link
                      to="/control/usuarios"
                      className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[var(--color-line)] px-3 font-semibold text-[var(--color-burgundy)] transition hover:border-[var(--color-burgundy)]"
                    >
                      <Building2 size={15} />
                      Administrar en Usuarios y permisos
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid min-h-80 place-items-center text-center">
                <div>
                  <UserRound className="mx-auto text-[var(--color-muted)]" size={32} />
                  <p className="mt-3 font-semibold text-[var(--color-ink)]">Selecciona un cliente</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">El expediente se mostrará con sus relaciones de cliente.</p>
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
	                  onClick={() => openTagEdit(item)}
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
        <div className="control-form-overlay fixed inset-0 z-[150] grid place-items-center bg-black/35 p-4">
          <form onSubmit={submitCustomer} className="control-form-surface grid max-h-[92vh] w-full max-w-4xl gap-4 overflow-auto rounded-lg bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-label={form.id ? 'Editar cliente' : 'Nuevo cliente'}>
            <div className="control-form-header flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-ink)]">{form.id ? 'Editar cliente' : 'Nuevo cliente'}</h2>
                <p className="text-sm text-[var(--color-muted)]">Registro administrativo del cliente; el acceso se gestiona por separado.</p>
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
                <CrystalDateField value={form.birthDate} onChange={(value) => setForm({ ...form, birthDate: value })} placeholder="Seleccionar fecha" />
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
                  <input type="checkbox" checked={form.marketingEmailConsent} onChange={(event) => setForm({ ...form, marketingEmailConsent: event.target.checked })} className="h-5 w-5 rounded-full accent-[var(--color-burgundy)]" />
                  Autoriza correo
                </label>
                <label className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--color-ink)]">
                  <input type="checkbox" checked={form.marketingPushConsent} onChange={(event) => setForm({ ...form, marketingPushConsent: event.target.checked })} className="h-5 w-5 rounded-full accent-[var(--color-burgundy)]" />
                  Autoriza notificaciones
                </label>
              </div>
              <Field label="Notas">
                <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={`${inputClass()} min-h-24 py-3`} />
              </Field>
            </div>

            <div className="control-form-actions">
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
      {tagEdit ? (
        <div className="control-form-overlay fixed inset-0 z-[150] grid place-items-center bg-black/35 p-4">
          <form onSubmit={submitTagEdit} className="control-form-surface control-form-surface--compact grid w-full max-w-md gap-4 rounded-lg bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-label="Editar etiqueta">
            <div className="control-form-header flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-ink)]">Editar etiqueta</h2>
                <p className="text-sm text-[var(--color-muted)]">Actualiza el nombre visible para segmentación comercial.</p>
              </div>
              <button type="button" onClick={() => setTagEdit(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-line)]">
                <X size={16} />
              </button>
            </div>
            <input value={tagEditName} onChange={(event) => setTagEditName(event.target.value)} className={inputClass()} autoFocus />
            <div className="control-form-actions">
              <button type="button" onClick={() => setTagEdit(null)} className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--color-line)] px-4 text-sm font-semibold">
                Cancelar
              </button>
              <button type="submit" disabled={saving || !tagEditName.trim()} className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white disabled:opacity-45">
                Guardar
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <ControlConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? ''}
        message={pendingAction?.message ?? ''}
        confirmLabel={pendingAction?.confirmLabel}
        tone={pendingAction?.tone}
        busy={saving}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
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

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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

function RelatedPanel({ title, items, empty, kind }: { title: string; items: CustomerRelationItem[]; empty: string; kind: 'reservation' | 'order' | 'membership' }) {
  return (
    <div className="grid gap-2 rounded-lg border border-[var(--color-line)] bg-white p-3">
      <h3 className="font-semibold text-[var(--color-ink)]">{title}</h3>
      {items.length ? items.slice(0, 5).map((item) => (
        <Link key={item.id} to={relatedRoute(kind, item.id)} className="flex items-center justify-between gap-3 rounded-md bg-[var(--color-soft)] px-3 py-2 text-sm transition hover:bg-white">
          <span className="min-w-0">
            <span className="block truncate font-semibold text-[var(--color-ink)]">
              {item.reservationNumber ?? item.orderNumber ?? item.membershipNumber ?? item.plan?.name ?? 'Registro'}
            </span>
            <span className="text-xs text-[var(--color-muted)]">{item.createdAt ? formatDate(item.createdAt) : item.startsAt ? formatDate(item.startsAt) : 'Sin fecha'}</span>
          </span>
          <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-[var(--color-burgundy)]">{operationalStatusLabel(item.status)}</span>
        </Link>
      )) : <p className="text-sm text-[var(--color-muted)]">{empty}</p>}
    </div>
  )
}

function relatedRoute(kind: 'reservation' | 'order' | 'membership', id: string) {
  if (kind === 'reservation') return `/control/reservaciones?reservationId=${encodeURIComponent(id)}`
  if (kind === 'order') return `/control/ordenes?orderId=${encodeURIComponent(id)}`
  return '/control/wine-club'
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
          <span className="min-w-0"><span className="block truncate font-medium text-[var(--color-ink)]">{historyActionLabel(item.action)}</span>{historyEntityRoute(item) ? <Link to={historyEntityRoute(item)!} className="mt-1 block text-xs text-[var(--color-burgundy)]">Ver {historyEntityLabel(item)}</Link> : null}</span>
          <span className="text-xs text-[var(--color-muted)]">{formatDate(item.createdAt)}</span>
        </div>
      )) : <p className="text-sm text-[var(--color-muted)]">Sin eventos de auditoría todavía.</p>}
    </div>
  )
}

function historyEntityRoute(item: CustomerHistoryItem) {
  if (!item.entityId) return null
  if (item.entityType === 'cart') return `/control/carritos?cartId=${encodeURIComponent(item.entityId)}`
  if (item.entityType === 'order') return `/control/ordenes?orderId=${encodeURIComponent(item.entityId)}`
  if (item.entityType === 'reservation') return `/control/reservaciones?reservationId=${encodeURIComponent(item.entityId)}`
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

function CustomerCard({
  customer,
  active,
  isEnglish,
  onSelect,
}: {
  customer: CustomerRecord
  active: boolean
  isEnglish: boolean
  onSelect: () => void
}) {
  const segment = segmentProfile(customer.segment)
  const isStaff = Boolean(customer.isStaff)
  const classificationText = classificationLabel(customer)
  const ClassificationIcon = isStaff ? Building2 : segment.icon
  const SecondaryIcon = isStaff ? MapPin : sourceIcon(customer.source)
  const secondaryText = isStaff ? staffScopeLabel(customer, isEnglish) : sourceLabel(customer.source, isEnglish)
  const hasMarketing = customer.marketingEmailConsent || customer.marketingPushConsent
  const tagNames = customer.tags.slice(0, 2).map((item) => item.name).join(' · ')
  const hiddenTags = customer.tags.length > 2 ? ` +${customer.tags.length - 2}` : ''
  const tagSummary = isStaff
    ? `Sede: ${staffScopeLabel(customer, isEnglish)}`
    : tagNames ? `${tagNames}${hiddenTags}` : 'Sin etiquetas'
  const accessSummary = isStaff ? staffAccessLabel(customer) : hasMarketing ? 'Marketing autorizado' : 'Sin autorización'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`control-customer-card ${isStaff ? 'is-staff' : ''} ${active ? 'is-active' : ''}`}
      aria-pressed={active}
    >
      <span className="control-customer-card__topline">
        <span className="control-customer-card__classmark" title={`Clasificación: ${classificationText}`}>
          <ClassificationIcon size={18} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="control-customer-card__number">{customer.customerNumber}</span>
          <span className="control-customer-card__name">{customer.displayName}</span>
        </span>
        <span className="control-customer-card__initials">{initials(customer.displayName) || 'CL'}</span>
      </span>

      <span className="control-customer-card__chips">
        <span className="control-customer-card__segment">
          <ClassificationIcon size={12} strokeWidth={1.75} />
          {classificationText}
        </span>
        <span className="control-customer-card__source">
          <SecondaryIcon size={12} strokeWidth={1.75} />
          {secondaryText}
        </span>
      </span>

      <span className="control-customer-card__contact">
        <span><Mail size={12} />{customer.email ?? 'Sin correo'}</span>
        <span><Phone size={12} />{customer.phone ?? 'Sin teléfono'}</span>
      </span>

      <span className="control-customer-card__stats">
        <span><strong>{money(customer.totalSpend)}</strong><small>{isEnglish ? 'value' : 'valor'}</small></span>
        <span><strong>{customer.reservationsCount}</strong><small>{isEnglish ? 'reservations' : 'reservas'}</small></span>
        <span><strong>{customer.ordersCount}</strong><small>{isEnglish ? 'orders' : 'órdenes'}</small></span>
      </span>

      <span className="control-customer-card__footer">
        <span>
          <Megaphone size={12} />
          {isEnglish ? 'Audience' : 'Audiencia'}: {campaignAudience(customer)}
        </span>
        <span className={hasMarketing || isStaff ? 'is-on' : ''}>{accessSummary}</span>
      </span>

      <span className="control-customer-card__tags">
        {tagSummary}
      </span>
    </button>
  )
}
