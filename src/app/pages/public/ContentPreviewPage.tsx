import { ArrowLeft, CalendarDays, Check, Clock3, Grape, Loader2, MapPin, ShieldCheck, Ticket, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { previewContentClient, type PreviewResponse } from '../../../services/content.service'

type PreviewData = PreviewResponse['data']

function text(data: PreviewData, ...keys: string[]) {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function amount(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(number)
    : ''
}

function previewDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date)
}

function entityCopy(entity: PreviewResponse['entity']) {
  const normalized = String(entity).replace(/s$/, '')
  return {
    wine: { eyebrow: 'Colección de vinos', label: 'Vino', icon: Grape },
    experience: { eyebrow: 'Vive la Hacienda', label: 'Experiencia', icon: MapPin },
    event: { eyebrow: 'Agenda Hacienda', label: 'Evento', icon: CalendarDays },
    promotion: { eyebrow: 'Selección especial', label: 'Promoción', icon: Ticket },
    membership_plan: { eyebrow: 'Wine Club', label: 'Membresía', icon: ShieldCheck },
    'membership-plan': { eyebrow: 'Wine Club', label: 'Membresía', icon: ShieldCheck },
    campaign: { eyebrow: 'Comunicación', label: 'Campaña', icon: Ticket },
  }[normalized] ?? { eyebrow: 'Hacienda de Letras', label: 'Contenido', icon: Grape }
}

function PreviewPhone({ preview }: { preview: PreviewResponse }) {
  const data = preview.data
  const copy = entityCopy(preview.entity)
  const Icon = copy.icon
  const title = text(data, 'name', 'title') || 'Contenido sin título'
  const description = text(data, 'short_description', 'subtitle', 'description', 'long_description') || 'La descripción aparecerá aquí cuando se capture en el formulario editorial.'
  const image = text(data, 'cover_image_url', 'image_url', 'main_image_url')
  const location = text(data, 'venue', 'location', 'origin')
  const date = text(data, 'start_at', 'publish_at')
  const price = amount(data.price ?? data.ticket_price ?? data.monthly_price)
  const capacity = Number(data.capacity ?? data.max_people ?? 0)

  return (
    <div className="relative mx-auto w-full max-w-[390px] overflow-hidden rounded-[2.65rem] border-[7px] border-[#281c1b] bg-[#fbf7f0] shadow-[0_35px_90px_rgba(50,17,25,0.28)]">
      <div className="absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-[#281c1b]" />
      <div className="flex h-10 items-center justify-between px-7 pt-2 text-[10px] font-semibold text-[#3c302d]"><span>9:41</span><span>● ●●</span></div>
      <div className="flex items-center justify-between border-b border-[#eadfd3] bg-white/78 px-5 py-3 backdrop-blur-xl">
        <img src="/hacienda de letras logo1.png" alt="Hacienda de Letras" className="h-9 w-auto object-contain" />
        <span className="rounded-full border border-[#e2d1bf] bg-white/80 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#681026]">Vista previa</span>
      </div>
      <div className="h-[690px] overflow-y-auto pb-8">
        <div className="relative m-3 min-h-[310px] overflow-hidden rounded-[1.8rem] bg-[linear-gradient(145deg,#5a1025,#8e3245)]">
          {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,8,17,.08),rgba(35,8,17,.84))]" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#edce91]"><Icon size={13} />{copy.eyebrow}</p>
            <h1 className="mt-2 text-[32px] leading-[.98]" style={{ fontFamily: 'var(--font-display)' }}>{title}</h1>
            {location ? <p className="mt-3 flex items-center gap-2 text-[11px] text-white/82"><MapPin size={13} />{location}</p> : null}
          </div>
        </div>
        <div className="px-5">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f2e5d7] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#681026]">{copy.label}</span>
            <span className="flex items-center gap-1 rounded-full border border-[#e2d1bf] bg-white px-3 py-1.5 text-[9px] text-[#6f625d]"><Check size={11} />Vista editorial</span>
          </div>
          <p className="mt-5 text-[13px] leading-6 text-[#665853]">{description}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {date ? <div className="rounded-[1rem] border border-[#eadfd3] bg-white p-3"><CalendarDays size={15} className="text-[#9b7540]" /><p className="mt-2 text-[10px] text-[#756762]">Fecha</p><p className="mt-1 text-[11px] font-semibold text-[#342724]">{previewDate(date)}</p></div> : null}
            {capacity > 0 ? <div className="rounded-[1rem] border border-[#eadfd3] bg-white p-3"><Users size={15} className="text-[#9b7540]" /><p className="mt-2 text-[10px] text-[#756762]">Capacidad</p><p className="mt-1 text-[11px] font-semibold text-[#342724]">{capacity} personas</p></div> : null}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-[1.2rem] bg-[#fffdfa] p-4 shadow-[0_12px_28px_rgba(70,35,24,.08)]">
            <div><p className="text-[9px] uppercase tracking-[0.12em] text-[#92744e]">{price ? 'Desde' : 'Disponibilidad'}</p><p className="mt-1 text-[18px] font-semibold text-[#5f1027]">{price || 'Consulta fechas'}</p></div>
            <span className="rounded-full bg-[#641027] px-5 py-3 text-[11px] font-semibold text-white">Ver detalles</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ContentPreviewPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    previewContentClient.get(token)
      .then((response) => { if (active) setPreview(response) })
      .catch(() => { if (active) setError('La vista previa expiró o ya no está disponible.') })
    return () => { active = false }
  }, [token])

  const title = useMemo(() => preview ? text(preview.data, 'name', 'title') : '', [preview])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fffaf4_0,#f2e8de_46%,#e8d9cd_100%)] px-5 py-8 text-[var(--color-ink)] md:py-12">
      <header className="mx-auto mb-8 flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">Revisión editorial segura</p>
          <h1 className="mt-2 text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{title || 'Vista previa de contenido'}</h1>
        </div>
        <button type="button" onClick={() => window.close()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(104,13,36,.16)] bg-white/72 px-4 text-xs font-semibold text-[var(--color-burgundy)] backdrop-blur-xl"><ArrowLeft size={14} />Cerrar</button>
      </header>
      {error ? (
        <section className="mx-auto max-w-lg rounded-[1.4rem] border border-[#dfcdbc] bg-white/86 p-8 text-center shadow-xl backdrop-blur-xl"><Clock3 className="mx-auto text-[var(--color-gold)]" /><h2 className="mt-4 text-xl text-[var(--color-burgundy)]">Vista no disponible</h2><p className="mt-2 text-sm text-[var(--color-muted)]">{error}</p></section>
      ) : preview ? (
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="hidden rounded-[2rem] border border-white/70 bg-white/48 p-10 shadow-[0_30px_80px_rgba(68,25,28,.10)] backdrop-blur-2xl lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">Así lo verá el cliente</p>
            <h2 className="mt-4 text-4xl leading-tight text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--color-muted)]">Esta vista representa el contenido dentro de la experiencia móvil. No publica cambios ni expone herramientas técnicas.</p>
            <div className="mt-8 flex items-center gap-3 rounded-[1.2rem] border border-[#e3d4c6] bg-white/70 p-4 text-xs text-[var(--color-muted)]"><ShieldCheck className="text-[var(--color-burgundy)]" size={20} /><span>Enlace temporal y protegido. Los datos administrativos permanecen fuera de esta vista.</span></div>
          </section>
          <PreviewPhone preview={preview} />
        </div>
      ) : (
        <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="animate-spin text-[var(--color-burgundy)]" size={30} /></div>
      )}
    </main>
  )
}
