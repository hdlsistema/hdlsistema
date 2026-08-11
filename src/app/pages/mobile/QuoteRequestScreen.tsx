import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerCommercialClient, publicCommercialClient, type PublicCommercialItem } from '../../../services/commercial.service'
import { CrystalDateField } from '../../components/shared/CrystalDateField'

const socialTypes = ['Boda', 'Pedida de mano', 'XV años', 'Bautizo', 'Primera Comunión', 'Baby Shower', 'Cumpleaños', 'Aniversario', 'Posada', 'Reunión familiar', 'Sesión fotográfica', 'Otro']
const businessTypes = ['Evento corporativo', 'Convención', 'Presentación', 'Capacitación', 'Comida empresarial', 'Cena empresarial', 'Integración de equipo', 'Evento de fin de año', 'Otro']

function nextIdempotencyKey() {
  return `quote_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function QuoteRequestScreen() {
  const { session, user, isAuthenticated } = useAuth()
  const [spaces, setSpaces] = useState<PublicCommercialItem[]>([])
  const [category, setCategory] = useState<'social' | 'business'>('social')
  const [eventType, setEventType] = useState('Boda')
  const [venueSpaceId, setVenueSpaceId] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [guestCount, setGuestCount] = useState(80)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    publicCommercialClient.services().then((response) => {
      if (!active) return
      setSpaces(response.data.venueSpaces)
      setVenueSpaceId(response.data.venueSpaces[0]?.id ?? '')
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    setEventType(category === 'social' ? socialTypes[0] : businessTypes[0])
  }, [category])

  const submit = async () => {
    if (!isAuthenticated) {
      setMessage('Inicia sesión para enviar tu solicitud.')
      return
    }
    if (!firstName || !lastName || !phone) {
      setMessage('Completa nombre, apellido y teléfono.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      const response = await customerCommercialClient.createQuoteRequest(session?.access_token, {
        eventCategory: category,
        eventType,
        venueSpaceId: venueSpaceId || null,
        preferredDate: preferredDate || null,
        guestCount,
        foodRequired: 'advice',
        wineRequired: 'advice',
        requestedServices: [],
        contactFirstName: firstName,
        contactLastName: lastName,
        contactEmail: user?.email ?? '',
        contactPhone: phone,
        notes: notes || null,
        language: 'es',
        idempotencyKey: nextIdempotencyKey(),
      })
      setMessage(`Solicitud registrada: ${response.data.quoteNumber}`)
    } catch {
      setMessage('No fue posible enviar la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  const currentTypes = category === 'social' ? socialTypes : businessTypes

  return (
    <div className="space-y-5 px-[var(--app-pad)] pb-8 pt-5">
      <header>
        <p className="text-[10px] font-semibold uppercase text-[#B88A4A]">Celebra en Hacienda</p>
        <h1 className="mt-1 text-[clamp(34px,9vw,44px)] leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>
          Haz de Hacienda de Letras el escenario de tu próxima historia.
        </h1>
      </header>

      <section className="rounded-[22px] border border-[#EBDCC8] bg-[#FFF9F1] p-4">
        <div className="grid grid-cols-2 gap-2">
          {(['social', 'business'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setCategory(value)} className={`min-h-11 rounded-full text-[13px] font-semibold ${category === value ? 'bg-[#8A1238] text-white' : 'bg-white/70 text-[#690D2B]'}`}>
              {value === 'social' ? 'Social' : 'Empresarial'}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {currentTypes.map((value) => (
            <button key={value} type="button" onClick={() => setEventType(value)} className={`rounded-full px-3 py-2 text-[12px] ${eventType === value ? 'bg-[#8A1238] text-white' : 'bg-white/70 text-[#4D3B34]'}`}>
              {value}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {spaces.map((space) => (
            <button key={space.id} type="button" onClick={() => setVenueSpaceId(space.id)} className={`rounded-full px-3 py-2 text-[12px] ${venueSpaceId === space.id ? 'bg-[#8A1238] text-white' : 'bg-white/70 text-[#4D3B34]'}`}>
              {space.name}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <CrystalDateField value={preferredDate} onChange={setPreferredDate} placeholder="Fecha ideal" buttonClassName="rounded-[16px] border-[#E2CCAE] bg-white/70 text-[13px]" />
          <input type="number" min={1} value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))} className="rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[13px] outline-none" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input placeholder="Nombre" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[13px] outline-none" />
          <input placeholder="Apellido" value={lastName} onChange={(event) => setLastName(event.target.value)} className="rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[13px] outline-none" />
        </div>
        <input placeholder="Teléfono" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-3 w-full rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[13px] outline-none" />
        <textarea placeholder="Notas del evento" value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-3 min-h-24 w-full rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[13px] outline-none" />
        <button type="button" onClick={submit} disabled={submitting} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-[#8A1238] px-5 text-[14px] font-semibold text-white disabled:opacity-60">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Solicitar cotización'}
        </button>
        {message ? <p className="mt-3 text-[12px] leading-5 text-[#690D2B]">{message}</p> : null}
      </section>
    </div>
  )
}
