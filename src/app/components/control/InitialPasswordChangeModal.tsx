import { Check, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../../contexts/AuthContext'

function passwordChecks(value: string) {
  return [
    { label: '12 caracteres como mínimo', valid: value.length >= 12 },
    { label: 'Mayúscula y minúscula', valid: /[A-Z]/.test(value) && /[a-z]/.test(value) },
    { label: 'Al menos un número', valid: /[0-9]/.test(value) },
    { label: 'Al menos un símbolo', valid: /[^A-Za-z0-9]/.test(value) },
  ]
}

export function InitialPasswordChangeModal() {
  const { profile, user, completeInitialPasswordChange, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const checks = useMemo(() => passwordChecks(password), [password])
  const ready = checks.every((item) => item.valid) && password === confirmation
  const displayName = profile?.display_name || user?.email || 'Administrador'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ready || saving) return
    setSaving(true)
    setError('')
    try {
      await completeInitialPasswordChange(password)
    } catch {
      setError('No fue posible actualizar la contraseña. Revisa los requisitos e inténtalo nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[var(--control-z-password)] grid min-h-screen place-items-center overflow-y-auto bg-[rgba(39,15,22,.62)] px-4 py-8 backdrop-blur-xl" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="initial-password-title" className="w-full max-w-[560px] overflow-hidden rounded-[1.7rem] border border-white/70 bg-[rgba(255,252,247,.96)] shadow-[0_38px_110px_rgba(42,10,20,.38)]">
        <div className="h-1.5 bg-[linear-gradient(90deg,#5d0d24,#8b253c,#c49a52)]" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e4d2bf] bg-[#f8eee5] text-[var(--color-burgundy)] shadow-sm"><LockKeyhole size={21} strokeWidth={1.7} /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">Primer acceso protegido</p>
              <h1 id="initial-password-title" className="mt-2 text-[clamp(25px,4vw,32px)] leading-tight text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>Crea tu contraseña personal</h1>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">Hola, {displayName}. La clave entregada es temporal. Para proteger el Centro de Control debes sustituirla antes de continuar.</p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="grid gap-2 text-xs font-semibold text-[var(--color-ink)]">
              Nueva contraseña
              <div className="relative"><KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-gold)]" size={16} /><input autoFocus type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-[#dccab5] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[var(--color-burgundy)] focus:ring-2 focus:ring-[rgba(104,13,36,.1)]" /></div>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-[var(--color-ink)]">
              Confirmar nueva contraseña
              <div className="relative"><ShieldCheck className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-gold)]" size={16} /><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-h-12 w-full rounded-xl border border-[#dccab5] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[var(--color-burgundy)] focus:ring-2 focus:ring-[rgba(104,13,36,.1)]" /></div>
            </label>

            <div className="grid gap-2 rounded-xl border border-[#eadfd4] bg-[#faf5ef] p-4 sm:grid-cols-2">
              {checks.map((item) => <p key={item.label} className={`flex items-center gap-2 text-[11px] ${item.valid ? 'text-[#252F37]' : 'text-[var(--color-muted)]'}`}><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${item.valid ? 'bg-[rgba(37,47,55,0.1)]' : 'bg-white'}`}><Check size={12} /></span>{item.label}</p>)}
              <p className={`flex items-center gap-2 text-[11px] ${confirmation && password === confirmation ? 'text-[#252F37]' : 'text-[var(--color-muted)]'}`}><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${confirmation && password === confirmation ? 'bg-[rgba(37,47,55,0.1)]' : 'bg-white'}`}><Check size={12} /></span>Ambas contraseñas coinciden</p>
            </div>

            {error ? <p role="alert" className="rounded-xl border border-[#e0b7ad] bg-[#fff5f1] px-4 py-3 text-xs text-[#8d352b]">{error}</p> : null}
            <button type="submit" disabled={!ready || saving} className="min-h-12 w-full rounded-full bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(104,13,36,.18)] transition hover:bg-[#7a1731] disabled:cursor-not-allowed disabled:opacity-45">{saving ? 'Actualizando acceso...' : 'Guardar nueva contraseña y continuar'}</button>
            <button type="button" onClick={() => void signOut()} className="w-full py-2 text-xs font-semibold text-[var(--color-muted)] underline-offset-4 hover:underline">Cerrar sesión</button>
          </form>
        </div>
      </section>
    </div>
  )
}
