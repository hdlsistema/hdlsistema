import {
  Archive,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  adminContentClient,
  getPreviewUrl,
  type ContentEntity,
  type ContentRecord,
  type EditorialApprover,
  type PublicationAction,
} from '../../../services/content.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalDateTimeField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { EditorialConfirmDialog } from './editorial/EditorialConfirmDialog'
import {
  actionErrorMessage,
  buildEditorialConfirmState,
  runConfirmedEditorialAction,
  validateEditorialSchedule,
  type EditorialConfirmAction,
  type EditorialConfirmState,
} from './editorial/EditorialConfirmDialog.logic'
import { CampaignEditorialForm } from './editorial/forms/CampaignEditorialForm'
import { EventEditorialForm } from './editorial/forms/EventEditorialForm'
import { ExperienceEditorialForm } from './editorial/forms/ExperienceEditorialForm'
import { MembershipPlanEditorialForm } from './editorial/forms/MembershipPlanEditorialForm'
import { PromotionEditorialForm } from './editorial/forms/PromotionEditorialForm'
import { WineEditorialForm } from './editorial/forms/WineEditorialForm'
import { editorialDefinitions, getStatusOptions } from './editorial/forms/editorialFormSchemas'
import {
  buildInitialEditorialForm,
  extractFieldErrorsFromBackend,
  formatDate,
  getRecordSubtitle,
  getRecordTitle,
  serializeEditorialPayload,
  statusLabel,
  validateEditorialForm,
} from './editorial/forms/editorialFormMappers'
import type { EditorialFieldErrors, EditorialFormProps } from './editorial/forms/editorialFormTypes'

type UiError = {
  status?: number
  message: string
  fieldErrors?: EditorialFieldErrors
}

type PendingConfirmation = EditorialConfirmState & {
  execute: () => Promise<void>
}

function getSafeError(error: unknown, fieldErrors: EditorialFieldErrors = {}): UiError {
  if (error && typeof error === 'object') {
    const maybeStatus = 'status' in error ? Number((error as { status?: unknown }).status) : undefined
    if (maybeStatus === 401) return { status: 401, message: 'Tu sesión expiró o no autorizó esta operación.', fieldErrors }
    if (maybeStatus === 403) return { status: 403, message: 'Tu usuario no tiene permisos para esta operación.', fieldErrors }
    if (maybeStatus === 404) return { status: 404, message: 'El recurso solicitado no existe.', fieldErrors }
    if (maybeStatus === 422) return { status: 422, message: 'Revisa los campos marcados antes de guardar.', fieldErrors }
    if (maybeStatus) return { status: maybeStatus, message: 'No fue posible completar la operación.', fieldErrors }
  }

  return { message: 'No fue posible completar la operación.', fieldErrors }
}

function publicationActionAfterStatus(action: PublicationAction) {
  if (action === 'publish') return 'Publicado'
  if (action === 'unpublish') return 'Despublicado'
  if (action === 'archive') return 'Archivado'
  return 'Borrador'
}

function confirmationTypeForPublicationAction(action: PublicationAction): EditorialConfirmAction {
  if (action === 'publish') return 'publish'
  if (action === 'unpublish') return 'unpublish'
  if (action === 'archive') return 'archive'
  return 'restore'
}

function StatusPill({ status, label }: { status?: string | null; label: string }) {
  const rawStatus = status || 'sin_estado'
  const tone =
    rawStatus === 'published' || rawStatus === 'active'
      ? 'border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.08)] text-[var(--color-positive)]'
      : rawStatus === 'scheduled' || rawStatus === 'draft'
        ? 'border-[rgba(180,138,85,0.3)] bg-[rgba(180,138,85,0.12)] text-[var(--color-gold)]'
        : 'border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] text-[var(--color-alert)]'

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-semibold ${tone}`}>
      {label}
    </span>
  )
}

function metadataRecord(record?: ContentRecord | null) {
  const value = record?.metadata
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function editorialApproval(record?: ContentRecord | null) {
  const value = metadataRecord(record).editorial_approval
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function approvalStatusLabel(status: unknown) {
  if (status === 'approved') return 'Autorizado'
  if (status === 'rejected') return 'Rechazado'
  if (status === 'pending') return 'Pendiente de autorización'
  if (status === 'published_without_approval') return 'Publicado sin autorización'
  return 'Sin solicitud'
}

function notifyContentUpdated(entity: ContentEntity, record: ContentRecord | null) {
  if (!record || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('hdl:content-updated', {
    detail: { entity, id: record.id, updatedAt: Date.now() },
  }))
}

export function EditorialContentPage({ entity }: { entity: ContentEntity }) {
  const config = editorialDefinitions[entity]
  const { session, roles } = useAuth()
  const token = session?.access_token
  const [records, setRecords] = useState<ContentRecord[]>([])
  const [selected, setSelected] = useState<ContentRecord | null>(null)
  const [form, setForm] = useState<Record<string, string>>(() => buildInitialEditorialForm(null, config))
  const [fieldErrors, setFieldErrors] = useState<EditorialFieldErrors>({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<UiError | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [versions, setVersions] = useState<Array<{ version: number; created_at?: string | null }> | null>(null)
  const [scheduleAction, setScheduleAction] = useState<PublicationAction>('publish')
  const [scheduleAt, setScheduleAt] = useState('')
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)
  const [confirmationError, setConfirmationError] = useState<string | null>(null)
  const [confirmingAction, setConfirmingAction] = useState(false)
  const [approvers, setApprovers] = useState<EditorialApprover[]>([])
  const [selectedApproverId, setSelectedApproverId] = useState('')
  const [approvalNote, setApprovalNote] = useState('')
  const [approvalError, setApprovalError] = useState('')
  const [approvalBusy, setApprovalBusy] = useState('')

  const statusOptions = useMemo(() => getStatusOptions(entity), [entity])
  const isGrandEvents = entity === 'grand-events'
  const isAdminUser = roles.some((role) => ['super_admin', 'admin'].includes(role))

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await adminContentClient.list(entity, token, {
        page: 1,
        perPage: 50,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        locale: 'es-MX',
        orderBy: config.orderBy,
        orderDirection: 'asc',
      })
      setRecords(response.data)
      setSelected((current) => {
        if (!current) return response.data[0] ?? null
        return response.data.find((item) => item.id === current.id) ?? response.data[0] ?? null
      })
    } catch (loadError) {
      setError(getSafeError(loadError))
      setRecords([])
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }, [config.orderBy, entity, search, statusFilter, token])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  useEffect(() => {
    if (!isGrandEvents || !token) {
      setApprovers([])
      setSelectedApproverId('')
      return
    }
    let active = true
    adminContentClient.approvers(entity, token)
      .then((response) => {
        if (!active) return
        setApprovers(response.data)
        setSelectedApproverId((current) => current || response.data[0]?.id || '')
      })
      .catch(() => {
        if (active) setApprovers([])
      })
    return () => {
      active = false
    }
  }, [entity, isGrandEvents, token])

  useEffect(() => {
    setForm(buildInitialEditorialForm(selected, config))
    setFieldErrors({})
    setVersions(null)
    setSuccess(null)
  }, [config, selected])

  function selectRecord(record: ContentRecord) {
    setSelected(record)
    setError(null)
  }

  function startCreate() {
    setSelected(null)
    setForm(buildInitialEditorialForm(null, config))
    setFieldErrors({})
    setVersions(null)
    setError(null)
    setSuccess(null)
  }

  function updateFormField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function closeConfirmation() {
    if (confirmingAction) return
    setPendingConfirmation(null)
    setConfirmationError(null)
  }

  async function confirmPendingAction() {
    if (!pendingConfirmation) return
    setConfirmingAction(true)
    setConfirmationError(null)

    try {
      await runConfirmedEditorialAction(pendingConfirmation.execute)
      setPendingConfirmation(null)
    } catch (confirmError) {
      setConfirmationError(actionErrorMessage(confirmError))
    } finally {
      setConfirmingAction(false)
    }
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    try {
      const validation = validateEditorialForm(config, form, 'save')
      if (!validation.valid) {
        setFieldErrors(validation.fieldErrors)
        setError({ message: validation.generalMessage ?? 'Revisa los campos marcados antes de guardar.' })
        return
      }

      const payload = serializeEditorialPayload(config, form)
      const response = selected
        ? await adminContentClient.update(entity, selected.id, payload, token)
        : await adminContentClient.create(entity, payload, token)
      setSelected(response.data)
      notifyContentUpdated(entity, response.data)
      setSuccess(selected ? 'Cambios guardados.' : 'Registro creado.')
      await loadRecords()
    } catch (saveError) {
      const apiFieldErrors = extractFieldErrorsFromBackend(saveError, config)
      setFieldErrors(apiFieldErrors)
      setError(getSafeError(saveError, apiFieldErrors))
    } finally {
      setSaving(false)
    }
  }

  async function executePublicationAction(action: PublicationAction) {
    if (!selected) return
    setBusyAction(action)
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    try {
      if (action === 'publish') {
        const validation = validateEditorialForm(config, form, 'publish')
        if (!validation.valid) {
          setFieldErrors(validation.fieldErrors)
          setError({ message: validation.generalMessage ?? 'Faltan campos antes de publicar.' })
          return
        }
      }
      const response = await adminContentClient.action(entity, selected.id, action, token)
      setSelected(response.data)
      notifyContentUpdated(entity, response.data)
      setSuccess(action === 'publish' ? 'Publicado y visible en app.' : 'Acción completada.')
      await loadRecords()
    } catch (actionError) {
      const apiFieldErrors = extractFieldErrorsFromBackend(actionError, config)
      setFieldErrors(apiFieldErrors)
      setError(getSafeError(actionError, apiFieldErrors))
      throw actionError
    } finally {
      setBusyAction(null)
    }
  }

  function requestPublicationAction(action: PublicationAction) {
    if (!selected) return
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    if (action === 'publish') {
      const validation = validateEditorialForm(config, form, 'publish')
      if (!validation.valid) {
        setFieldErrors(validation.fieldErrors)
        setError({ message: validation.generalMessage ?? 'Faltan campos antes de publicar.' })
        return
      }
    }

    setConfirmationError(null)
    const approval = editorialApproval(selected)
    const publishingWithoutApproval = isGrandEvents && action === 'publish' && approval.status !== 'approved'
    const confirmState = buildEditorialConfirmState({
      action: confirmationTypeForPublicationAction(action),
      contentLabel: selectedTitle,
      currentStatus: statusLabel(config, selected.status),
      afterStatus: publicationActionAfterStatus(action),
      visibleAfter: action === 'publish',
    })
    setPendingConfirmation({
      ...confirmState,
      message: publishingWithoutApproval
        ? 'Esta publicación no está autorizada por administración. Si confirmas, se publicará con tracking como publicación sin autorización.'
        : confirmState.message,
      confirmLabel: publishingWithoutApproval ? 'Publicar sin autorización' : confirmState.confirmLabel,
      execute: () => executePublicationAction(action),
    })
  }

  async function sendApprovalRequest() {
    if (!selected || !selectedApproverId) {
      setApprovalError('Selecciona un administrador para enviar el preview.')
      return
    }
    setApprovalBusy('request')
    setApprovalError('')
    setSuccess(null)
    try {
      const response = await adminContentClient.requestApproval(
        entity,
        selected.id,
        { approverUserId: selectedApproverId, note: approvalNote.trim() || undefined, expiresInMinutes: 120, locale: 'es-MX' },
        token,
      )
      setSelected(response.data.content)
      setApprovalNote('')
      setSuccess('Preview enviado para autorización.')
      await loadRecords()
    } catch (requestError) {
      setApprovalError(requestError instanceof Error ? requestError.message : 'No fue posible solicitar autorización.')
    } finally {
      setApprovalBusy('')
    }
  }

  async function decideApproval(decision: 'approved' | 'rejected') {
    if (!selected) return
    setApprovalBusy(decision)
    setApprovalError('')
    setSuccess(null)
    try {
      const response = await adminContentClient.approvalDecision(
        entity,
        selected.id,
        { decision, note: approvalNote.trim() || undefined },
        token,
      )
      setSelected(response.data.content)
      setApprovalNote('')
      setSuccess(decision === 'approved' ? 'Publicación autorizada.' : 'Publicación rechazada.')
      await loadRecords()
    } catch (decisionError) {
      setApprovalError(decisionError instanceof Error ? decisionError.message : 'No fue posible actualizar la autorización.')
    } finally {
      setApprovalBusy('')
    }
  }

  async function executeScheduleRecord() {
    if (!selected || !scheduleAt) return
    setBusyAction('schedule')
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    try {
      const scheduleError = validateEditorialSchedule(scheduleAt)
      if (scheduleError) {
        const validationError = Object.assign(new Error(scheduleError), { status: 422 })
        setError({ message: scheduleError })
        throw validationError
      }
      await adminContentClient.schedule(
        entity,
        selected.id,
        { action: scheduleAction, run_at: new Date(scheduleAt).toISOString() },
        token,
      )
      setSuccess('Programación registrada.')
      setScheduleAt('')
      await loadRecords()
    } catch (scheduleError) {
      const apiFieldErrors = extractFieldErrorsFromBackend(scheduleError, config)
      setFieldErrors(apiFieldErrors)
      setError(getSafeError(scheduleError, apiFieldErrors))
      throw scheduleError
    } finally {
      setBusyAction(null)
    }
  }

  function requestScheduleRecord() {
    if (!selected) return
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    const scheduleError = validateEditorialSchedule(scheduleAt)
    if (scheduleError) {
      setError({ message: scheduleError })
      return
    }

    if (scheduleAction === 'publish') {
      const validation = validateEditorialForm(config, form, 'publish')
      if (!validation.valid) {
        setFieldErrors(validation.fieldErrors)
        setError({ message: validation.generalMessage ?? 'Faltan campos antes de publicar.' })
        return
      }
    }

    const scheduledLabel = `${selectedTitle} · ${formatDate(new Date(scheduleAt).toISOString())}`
    setConfirmationError(null)
    setPendingConfirmation({
      ...buildEditorialConfirmState({
        action: 'schedule',
        contentLabel: scheduledLabel,
        currentStatus: statusLabel(config, selected.status),
        afterStatus: 'Programado',
        visibleAfter: scheduleAction === 'publish',
      }),
      message: scheduleAction === 'publish'
        ? 'El contenido se publicará automáticamente en la fecha y hora indicada.'
        : 'La acción editorial se ejecutará automáticamente en la fecha y hora indicada.',
      confirmLabel: scheduleAction === 'publish' ? 'Programar publicación' : 'Programar acción',
      execute: executeScheduleRecord,
    })
  }

  async function executeDuplicateRecord() {
    if (!selected) return
    setBusyAction('duplicate')
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.duplicate(entity, selected.id, token)
      setSelected(response.data)
      setSuccess('Duplicado creado.')
      await loadRecords()
    } catch (duplicateError) {
      setError(getSafeError(duplicateError))
      throw duplicateError
    } finally {
      setBusyAction(null)
    }
  }

  function requestDuplicateRecord() {
    if (!selected) return
    setConfirmationError(null)
    setPendingConfirmation({
      ...buildEditorialConfirmState({
        action: 'duplicate',
        contentLabel: selectedTitle,
        currentStatus: statusLabel(config, selected.status),
      }),
      execute: executeDuplicateRecord,
    })
  }

  async function executeRemoveRecord() {
    if (!selected) return
    setBusyAction('remove')
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.remove(entity, selected.id, token)
      setSelected(response.data)
      setSuccess('Registro retirado.')
      await loadRecords()
    } catch (removeError) {
      setError(getSafeError(removeError))
      throw removeError
    } finally {
      setBusyAction(null)
    }
  }

  function requestRemoveRecord() {
    if (!selected) return
    setConfirmationError(null)
    setPendingConfirmation({
      ...buildEditorialConfirmState({
        action: 'retire',
        contentLabel: selectedTitle,
        currentStatus: statusLabel(config, selected.status),
      }),
      execute: executeRemoveRecord,
    })
  }

  async function loadVersions() {
    if (!selected) return
    setBusyAction('versions')
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.versions(entity, selected.id, token)
      setVersions(response.data)
    } catch (versionsError) {
      setError(getSafeError(versionsError))
    } finally {
      setBusyAction(null)
    }
  }

  async function executeRestoreVersion(version: number) {
    if (!selected) return
    setBusyAction(`version-${version}`)
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.restoreVersion(entity, selected.id, version, token)
      setSelected(response.data)
      setSuccess('Versión restaurada.')
      await loadRecords()
      await loadVersions()
    } catch (restoreError) {
      setError(getSafeError(restoreError))
      throw restoreError
    } finally {
      setBusyAction(null)
    }
  }

  function requestRestoreVersion(version: number) {
    if (!selected) return
    setConfirmationError(null)
    setPendingConfirmation({
      ...buildEditorialConfirmState({
        action: 'restoreVersion',
        contentLabel: `${selectedTitle} · Versión ${version}`,
        currentStatus: statusLabel(config, selected.status),
      }),
      execute: () => executeRestoreVersion(version),
    })
  }

  async function openPreview() {
    if (!selected) return
    setBusyAction('preview')
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.previewToken(entity, selected.id, token)
      window.open(getPreviewUrl(response.data.token), '_blank', 'noopener,noreferrer')
      setSuccess('Vista previa generada.')
    } catch (previewError) {
      setError(getSafeError(previewError))
    } finally {
      setBusyAction(null)
    }
  }

  const createLabel = config.createLabel ?? `Nuevo ${config.singularLabel}`
  const selectedTitle = selected ? getRecordTitle(selected, config) : createLabel
  const isBusy = saving || busyAction !== null
  const FormComponent = {
    wines: WineEditorialForm,
    experiences: ExperienceEditorialForm,
    events: EventEditorialForm,
    'grand-events': EventEditorialForm,
    promotions: PromotionEditorialForm,
    'membership-plans': MembershipPlanEditorialForm,
    campaigns: CampaignEditorialForm,
  }[entity]

  const actionControls = selected ? (
    <div className="space-y-4 border-t border-[var(--color-line)] pt-4">
      {isGrandEvents ? (
        <section className="space-y-3 rounded-xl border border-[var(--color-line)] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">Autorización administrativa</p>
              <h3 className="mt-1 text-base font-semibold text-[var(--color-ink)]">{approvalStatusLabel(editorialApproval(selected).status)}</h3>
              <p className="mt-1 text-[13px] leading-5 text-[var(--color-muted)]">
                Marketing puede preparar y solicitar revisión. Si se publica sin aprobación, queda trazado en historial.
              </p>
            </div>
            {editorialApproval(selected).status === 'approved' ? (
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[rgba(37,47,55,0.08)] px-3 text-[12px] font-semibold text-[var(--color-positive)]">
                <ShieldCheck size={15} />Autorizado
              </span>
            ) : (
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[rgba(180,138,85,0.13)] px-3 text-[12px] font-semibold text-[var(--color-gold)]">
                <ShieldAlert size={15} />Requiere revisión
              </span>
            )}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <CrystalSelect value={selectedApproverId} onChange={setSelectedApproverId}>
              <option value="">Elegir administrador</option>
              {approvers.map((approver) => (
                <option key={approver.id} value={approver.id}>
                  {approver.displayName}{approver.email ? ` · ${approver.email}` : ''}
                </option>
              ))}
            </CrystalSelect>
            <input
              value={approvalNote}
              onChange={(event) => setApprovalNote(event.target.value)}
              placeholder="Nota para autorización"
              className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none"
            />
          </div>
          {approvalError ? <p className="text-[13px] font-semibold text-[var(--color-alert)]">{approvalError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void sendApprovalRequest()}
              disabled={isBusy || Boolean(approvalBusy) || !selectedApproverId}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-burgundy)] px-4 text-[13px] font-semibold text-white disabled:opacity-45"
            >
              {approvalBusy === 'request' ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
              Enviar preview
            </button>
            {isAdminUser ? (
              <>
                <button
                  type="button"
                  onClick={() => void decideApproval('approved')}
                  disabled={isBusy || Boolean(approvalBusy)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.08)] px-4 text-[13px] font-semibold text-[var(--color-positive)] disabled:opacity-45"
                >
                  {approvalBusy === 'approved' ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                  Autorizar
                </button>
                <button
                  type="button"
                  onClick={() => void decideApproval('rejected')}
                  disabled={isBusy || Boolean(approvalBusy)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.06)] px-4 text-[13px] font-semibold text-[var(--color-alert)] disabled:opacity-45"
                >
                  {approvalBusy === 'rejected' ? <Loader2 className="animate-spin" size={15} /> : <XCircle size={15} />}
                  Rechazar
                </button>
              </>
            ) : null}
          </div>
        </section>
      ) : null}
      <details className="control-more-actions rounded-lg border border-[var(--color-line)] bg-white">
        <summary className="cursor-pointer px-3 py-2 text-[13px] font-semibold text-[var(--color-burgundy)]">Más acciones</summary>
        <div className="space-y-3 border-t border-[var(--color-line)] p-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => requestPublicationAction('publish')}
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--color-positive)] disabled:opacity-45"
        >
          <CheckCircle2 size={16} />
          Publicar
        </button>
        <button
          type="button"
          onClick={() => requestPublicationAction('unpublish')}
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--color-gold)] disabled:opacity-45"
        >
          <XCircle size={16} />
          Despublicar
        </button>
        <button
          type="button"
          onClick={() => requestPublicationAction('archive')}
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--color-alert)] disabled:opacity-45"
        >
          <Archive size={16} />
          Archivar
        </button>
        <button
          type="button"
          onClick={() => requestPublicationAction('restore')}
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--color-burgundy)] disabled:opacity-45"
        >
          <RotateCcw size={16} />
          Restaurar
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--color-line)] bg-white p-3 md:grid-cols-[150px_minmax(0,1fr)_auto]">
        <CrystalSelect
          value={scheduleAction}
          onChange={(value) => setScheduleAction(value as PublicationAction)}
        >
          <option value="publish">Publicar</option>
          <option value="unpublish">Despublicar</option>
          <option value="archive">Archivar</option>
          <option value="restore">Restaurar</option>
        </CrystalSelect>
        <CrystalDateTimeField value={scheduleAt} onChange={setScheduleAt} placeholder="Programar fecha" />
        <button
          type="button"
          onClick={() => requestScheduleRecord()}
          disabled={isBusy || !scheduleAt}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-ink)] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-45"
        >
          <Clock3 size={16} />
          Programar
        </button>
      </div>
      <p className="text-[13px] text-[var(--color-muted)]">
        Programar lo hará visible u ocultará en la fecha indicada según la acción. Horario local configurado para Hacienda.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => requestDuplicateRecord()}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--color-muted)] disabled:opacity-45"
        >
          <Copy size={16} />
          Duplicar como borrador
        </button>
        <button
          type="button"
          onClick={() => requestRemoveRecord()}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-lg border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.06)] px-3 py-2 text-[13px] font-semibold text-[var(--color-alert)] disabled:opacity-45"
        >
          <Trash2 size={16} />
          Retirar
        </button>
      </div>
        </div>
      </details>
    </div>
  ) : null

  const versionsPanel = versions ? (
    <div className="space-y-2 border-t border-[var(--color-line)] pt-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
        Historial de versiones
      </p>
      {versions.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted)]">No hay versiones registradas.</p>
      ) : (
        <div className="space-y-2">
          {versions.map((version) => (
            <div
              key={version.version}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
            >
              <span className="text-[13px] text-[var(--color-ink)]">
                Versión {version.version} · {formatDate(version.created_at)}
              </span>
              <button
                type="button"
                onClick={() => requestRestoreVersion(version.version)}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-burgundy)] disabled:opacity-45"
              >
                <Pencil size={14} />
                Restaurar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null

  const formProps: EditorialFormProps = {
    definition: config,
    record: selected,
    selectedTitle,
    recordVersion: selected?.version ?? null,
    updatedAtLabel: formatDate(selected?.updated_at),
    form,
    fieldErrors,
    saving,
    isBusy,
    success,
    onSubmit: saveRecord,
    onChange: updateFormField,
    onPreview: openPreview,
    onVersions: loadVersions,
    actions: actionControls,
    versions: versionsPanel,
    token,
    canWrite: roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role)),
    canDelete: roles.some((role) => ['super_admin', 'admin'].includes(role)),
  }

  return (
    <section className={`control-page control-page--editorial control-page--${entity} space-y-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionTitle eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:brightness-110"
        >
          <Plus size={17} />
          {createLabel}
        </button>
      </div>

      <div className="control-master-detail control-editorial-workspace grid gap-5">
        <div className="control-master-list space-y-4">
          <div className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-muted)]">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Buscar ${config.listLabel}`}
                  className="w-full bg-transparent py-2 text-[var(--color-ink)] outline-none"
                />
              </label>
              <CrystalSelect
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <option value="">Todos los estados</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CrystalSelect>
            </div>
          </div>

          {error ? (
            <div className="rounded-[1rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-4 text-sm text-[var(--color-alert)]">
              {error.message}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel)] text-sm text-[var(--color-muted)]">
              <Loader2 className="mr-2 animate-spin" size={18} />
              Cargando contenido...
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-[var(--color-line)] bg-[var(--color-panel)] p-8 text-center">
              <p className="text-lg font-semibold text-[var(--color-ink)]">Sin registros</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                No hay {config.listLabel} para los filtros actuales.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
              <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] border-b border-[var(--color-line)] px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                <span>Registro</span>
                <span>Estado</span>
                <span>Actualizado</span>
              </div>
              <div className="divide-y divide-[var(--color-line)]">
                {records.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => selectRecord(record)}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_120px_120px] items-center gap-3 px-4 py-4 text-left transition hover:bg-[rgba(104,17,38,0.04)] ${
                      selected?.id === record.id ? 'bg-[rgba(104,17,38,0.06)]' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                        {getRecordTitle(record, config)}
                      </span>
                      <span className="mt-1 block truncate text-[13px] text-[var(--color-muted)]">
                        {getRecordSubtitle(record, config)}
                      </span>
                    </span>
                    <StatusPill status={record.status} label={statusLabel(config, record.status)} />
                    <span className="text-[13px] text-[var(--color-muted)]">{formatDate(record.updated_at)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <FormComponent
          {...formProps}
        />
      </div>
      <EditorialConfirmDialog
        state={pendingConfirmation}
        loading={confirmingAction}
        error={confirmationError}
        onCancel={closeConfirmation}
        onConfirm={() => void confirmPendingAction()}
      />
    </section>
  )
}
