import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { CheckCircle2, Download, LogIn, QrCode, Share2, ShieldCheck, XCircle } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { accessPassClient, checkinsClient } from '../../../services/commerce.service'
import { publicAccessPassClient, type PublicAccessPass } from '../../../services/accessPass.service'
import { downloadAccessCredentialPdf, shareAccessCredential } from '../../utils/accessCredentialPdf'
import { normalizeAccessQrCode } from '../../utils/accessQr'

const operatingRoles = ['super_admin', 'admin', 'operations']

function dateLabel(value?: string | null) {
  if (!value) return 'Por confirmar'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

function stateCopy(state: string) {
  const copy: Record<string, { label: string; detail: string }> = {
    valid: { label: 'Vigente', detail: 'El acceso está listo. La lectura del QR no lo consume.' },
    used: { label: 'Ya utilizado', detail: 'Este acceso ya fue confirmado por el personal autorizado.' },
    cancelled: { label: 'Cancelado', detail: 'Este acceso fue cancelado y ya no puede utilizarse.' },
    expired: { label: 'Vencido', detail: 'La vigencia de este acceso terminó.' },
    not_yet_valid: { label: 'Próximamente', detail: 'El acceso todavía no inicia su periodo de vigencia.' },
  }
  return copy[state] ?? { label: state, detail: 'Consulta al personal de Hacienda de Letras.' }
}

function confirmationLabel(type: string) {
  if (type === 'restaurant') return 'Confirmar llegada'
  if (type === 'cabin') return 'Confirmar check-in'
  if (type === 'wine_order' || type === 'paid_order') return 'Confirmar entrega'
  return 'Confirmar acceso'
}

export function AccessPassPage() {
  const { token: routeToken } = useParams<{ token: string }>()
  const location = useLocation()
  const { session, roles, isAuthenticated } = useAuth()
  const token = useMemo(() => normalizeAccessQrCode(routeToken ? decodeURIComponent(routeToken) : location.search), [location.search, routeToken])
  const [pass, setPass] = useState<PublicAccessPass | null>(null)
  const [qrSource, setQrSource] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const canConfirm = roles.some((role) => operatingRoles.includes(role))

  const load = useCallback(async () => {
    if (!token) {
      setError('El código no corresponde a un acceso de Hacienda de Letras.')
      setLoading(false)
      return
    }
    try {
      const response = await publicAccessPassClient.get(token)
      setPass(response.data)
      setError('')
    } catch {
      setPass(null)
      setError('No encontramos este acceso o ya no está disponible.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!pass?.qrPayload) return
    QRCode.toDataURL(pass.qrPayload, { errorCorrectionLevel: 'M', margin: 4, width: 720, color: { dark: '#2D1811', light: '#FFFFFF' } })
      .then(setQrSource)
      .catch(() => setQrSource(''))
  }, [pass?.qrPayload])

  const confirm = async () => {
    if (!pass?.valid || !token || !session?.access_token || !canConfirm || saving) return
    setSaving(true)
    setError('')
    try {
      const validation = await accessPassClient.validate(session.access_token, token)
      if (!validation.data.valid) throw new Error(validation.data.reason || 'El acceso ya no es válido')
      await checkinsClient.register(session.access_token, {
        accessPassId: validation.data.accessPassId,
        requestId: crypto.randomUUID(),
        notes: `${confirmationLabel(pass.accessType)} desde boleto público`,
        metadata: { accessType: pass.accessType, source: 'public_access_page' },
      })
      setMessage(`${confirmationLabel(pass.accessType)} registrado correctamente.`)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible confirmar el acceso.')
    } finally {
      setSaving(false)
    }
  }

  const state = stateCopy(pass?.state ?? '')
  const returnPath = `${location.pathname}${location.search}`

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf5_0%,#f0dcc7_100%)] px-4 py-8 text-[#2D1811] sm:py-12">
      <section className="mx-auto w-full max-w-[620px] overflow-hidden rounded-[2rem] border border-[#dccab5] bg-[rgba(255,250,242,0.96)] shadow-[0_30px_90px_rgba(74,32,28,0.18)]">
        <header className="bg-[#680D24] px-6 py-7 text-center text-white">
          <img src="/hacienda de letras logo 2.png" alt="Hacienda de Letras" className="mx-auto h-16 w-auto rounded-xl bg-[#fffaf5] px-3 py-2" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#efca91]">Acceso oficial</p>
        </header>
        <div className="p-5 sm:p-8">
          {loading ? <p className="py-16 text-center text-sm text-[#7a665c]">Validando acceso…</p> : error && !pass ? (
            <div className="py-14 text-center"><XCircle className="mx-auto text-[#9D473F]" size={42} /><h1 className="mt-4 text-2xl font-semibold">Acceso no disponible</h1><p className="mt-2 text-sm text-[#7a665c]">{error}</p></div>
          ) : pass ? (
            <>
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B88A4A]">{pass.accessType.replaceAll('_', ' ')}</p>
                <h1 className="mt-2 text-[clamp(30px,8vw,45px)] leading-none text-[#680D24]" style={{ fontFamily: 'var(--font-display)' }}>{pass.title || 'Hacienda de Letras'}</h1>
                <div className={`mx-auto mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${pass.valid ? 'bg-[#e9f3e9] text-[#376345]' : 'bg-[#f7e8e5] text-[#943c35]'}`}>
                  {pass.valid ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{state.label}
                </div>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#7a665c]">{state.detail}</p>
              </div>
              <div className="mx-auto mt-6 max-w-[310px] rounded-[1.5rem] border border-[#dccab5] bg-white p-4">
                {qrSource ? <img src={qrSource} alt="Código QR del acceso" className="aspect-square w-full" /> : <QrCode size={86} className="mx-auto my-16 text-[#680D24]" />}
              </div>
              <dl className="mt-6 grid gap-3 rounded-[1.25rem] border border-[#e6d7c7] bg-white/70 p-5 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-[#7a665c]">Folio</dt><dd className="text-right font-semibold">{pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber}</dd></div>
                {pass.customerName ? <div className="flex justify-between gap-4"><dt className="text-[#7a665c]">Titular</dt><dd className="text-right font-semibold">{pass.customerName}</dd></div> : null}
                <div className="flex justify-between gap-4"><dt className="text-[#7a665c]">Fecha</dt><dd className="text-right font-semibold">{dateLabel(pass.startsAt)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#7a665c]">{['wine_order', 'paid_order'].includes(pass.accessType) ? 'Artículos' : 'Personas'}</dt><dd className="font-semibold">{pass.peopleCount ?? 1}</dd></div>
              </dl>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => void downloadAccessCredentialPdf(pass)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#680D24] px-5 text-sm font-semibold text-[#680D24]"><Download size={17} />Descargar PDF</button>
                <button type="button" onClick={() => void shareAccessCredential(pass)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#680D24] px-5 text-sm font-semibold text-white"><Share2 size={17} />Compartir</button>
              </div>
              <div className="mt-6 border-t border-[#e6d7c7] pt-6">
                {!isAuthenticated ? (
                  <Link to="/login" state={{ from: returnPath }} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2D1811] px-5 text-center text-sm font-semibold text-white"><LogIn size={17} />Personal: iniciar sesión para confirmar</Link>
                ) : canConfirm ? (
                  <button type="button" disabled={!pass.valid || saving} onClick={() => void confirm()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2D1811] px-5 text-sm font-semibold text-white disabled:opacity-45"><ShieldCheck size={17} />{saving ? 'Confirmando…' : confirmationLabel(pass.accessType)}</button>
                ) : <p className="text-center text-xs text-[#7a665c]">La confirmación está reservada al personal autorizado.</p>}
              </div>
              {message ? <p className="mt-4 rounded-xl bg-[#e9f3e9] p-3 text-center text-sm text-[#376345]">{message}</p> : null}
              {error ? <p className="mt-4 rounded-xl bg-[#f7e8e5] p-3 text-center text-sm text-[#943c35]">{error}</p> : null}
            </>
          ) : null}
        </div>
      </section>
    </main>
  )
}
