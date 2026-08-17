import { Loader2, UserPlus, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { customersClient, type CustomerRecord } from '../../../services/customers.service'
import { CrystalSelect } from '../shared/CrystalSelect'

type QuickCustomerDialogProps = {
  open: boolean
  token: string | null | undefined
  onClose: () => void
  onCreated: (customer: CustomerRecord) => void
}

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  source: 'Centro de control',
}

export function QuickCustomerDialog({ open, token, onClose, onCreated }: QuickCustomerDialogProps) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setForm(emptyForm)
      setError('')
    }
  }, [open])

  if (!open) return null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Captura al menos correo o teléfono para identificar al cliente.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await customersClient.create(token, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        source: form.source,
      })
      onCreated(response.data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el cliente.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-burgundy)]'

  return (
    <div className="control-form-overlay fixed inset-0 z-[190] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />
      <form onSubmit={submit} className="control-form-surface control-form-surface--compact relative z-10 w-full max-w-xl rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-page)] p-5 shadow-[0_35px_90px_rgba(29,5,12,0.38)]" role="dialog" aria-modal="true" aria-label="Crear cliente">
        <div className="control-form-header mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">CRM inmediato</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--color-burgundy)]">Crear cliente</h2>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Quedará disponible sin salir del flujo actual.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"><X size={16} /></button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Nombre *</span><input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className={inputClass} /></label>
          <label><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Apellido</span><input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className={inputClass} /></label>
          <label><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Correo</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} /></label>
          <label><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Teléfono</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputClass} /></label>
          <label className="md:col-span-2"><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Canal de origen</span><CrystalSelect value={form.source} onChange={(value) => setForm({ ...form, source: value })}><option value="Centro de control">Centro de Control</option><option value="Teléfono">Teléfono</option><option value="WhatsApp">WhatsApp</option><option value="Mostrador">Mostrador</option><option value="Agencia">Agencia</option><option value="Evento">Evento</option></CrystalSelect></label>
        </div>
        {error ? <p className="mt-3 rounded-lg border border-[#ead8c5] bg-[#fff7ed] px-3 py-2 text-xs text-[#8a4b16]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
          <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white disabled:opacity-55">{saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Crear y seleccionar</button>
        </div>
      </form>
    </div>
  )
}
