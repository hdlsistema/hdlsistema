import { useEffect, useState } from 'react'
import { ChevronDown, Loader2, MapPinned, X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerCommercialClient } from '../../../services/commercial.service'
import { EmptyState, ErrorState } from '../../components/mobile/PremiumMobileUi'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { usePublicCommercialServices } from '../../hooks/usePublicCommercialServices'

const socialTypes = ['Boda', 'Pedida de mano', 'XV años', 'Bautizo', 'Primera Comunión', 'Baby Shower', 'Cumpleaños', 'Aniversario', 'Posada', 'Reunión familiar', 'Sesión fotográfica', 'Otro']
const businessTypes = ['Cena empresarial', 'Integración de equipo', 'Evento de fin de año', 'Otro']

type ChoiceSheetOption = {
  value: string
  label: string
  description?: string
}

function ChoiceSheet({
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  title: string
  options: ChoiceSheetOption[]
  selectedValue: string
  onSelect: (value: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end bg-[rgba(45,24,17,0.28)] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] backdrop-blur-[6px]">
      <section className="max-h-[72dvh] w-full overflow-hidden rounded-[24px] border border-[#E2CCAE] bg-[rgba(255,249,241,0.96)] shadow-[0_24px_54px_rgba(45,24,17,0.24)] backdrop-blur-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[#EBDCC8] px-5 py-4">
          <h2 className="text-[18px] leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-[#2D1811]" aria-label="Cerrar">
            <X size={17} />
          </button>
        </header>
        <div className="app-scrollbar-none max-h-[calc(72dvh-74px)] overflow-y-auto p-3">
          {options.map((option) => {
            const active = option.value === selectedValue
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value)
                  onClose()
                }}
                className={`mb-2 flex min-h-[54px] w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left ${
                  active
                    ? 'bg-[#8A1238] text-white shadow-[0_12px_26px_rgba(104,17,38,0.18)]'
                    : 'bg-white/72 text-[#2D1811] shadow-[inset_0_0_0_1px_rgba(226,204,174,0.82)]'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold leading-5">{option.label}</span>
                  {option.description ? <span className={`mt-0.5 block text-[11px] leading-4 ${active ? 'text-white/78' : 'text-[#776053]'}`}>{option.description}</span> : null}
                </span>
                <span className={`h-3 w-3 shrink-0 rounded-full ${active ? 'bg-[#D9BD8A]' : 'bg-[#EBDCC8]'}`} />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function nextIdempotencyKey() {
  return `quote_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function QuoteRequestScreen() {
  const { session, user, isAuthenticated } = useAuth()
  const [category, setCategory] = useState<'social' | 'business'>('social')
  const [eventType, setEventType] = useState('Boda')
  const [venueSpaceId, setVenueSpaceId] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [guestCount, setGuestCount] = useState('80')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [eventSheetOpen, setEventSheetOpen] = useState(false)
  const [spaceSheetOpen, setSpaceSheetOpen] = useState(false)
  const { services, loading, error, retry } = usePublicCommercialServices()
  const spaces = services.venueSpaces
  const selectedSpace = venueSpaceId || spaces[0]?.id || ''
  const selectedSpaceRecord = spaces.find((space) => space.id === selectedSpace)

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
        venueSpaceId: selectedSpace || null,
        preferredDate: preferredDate || null,
        guestCount: Math.max(1, Number(guestCount || 1)),
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
  const eventOptions = currentTypes.map((value) => ({ value, label: value }))
  const spaceOptions = spaces.map((space) => ({
    value: space.id,
    label: space.name,
    description: space.description ?? undefined,
  }))

  return (
    <div className="space-y-5 px-[var(--app-pad)] pb-8 pt-5">
      <header>
        <p className="text-[10px] font-semibold uppercase text-[#B88A4A]">Celebra en Hacienda</p>
        <h1 className="mt-1 text-[clamp(26px,7vw,34px)] font-medium leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>
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
        <button
          type="button"
          onClick={() => setEventSheetOpen(true)}
          className="mt-4 flex min-h-[58px] w-full items-center justify-between gap-3 rounded-[18px] border border-[#E2CCAE] bg-white/74 px-4 text-left shadow-[0_12px_28px_rgba(90,49,28,0.08)] backdrop-blur-xl"
        >
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B88A4A]">Tipo de evento</span>
            <span className="mt-1 block text-[15px] font-semibold text-[#2D1811]">{eventType}</span>
          </span>
          <ChevronDown size={18} className="shrink-0 text-[#8A1238]" />
        </button>
        {loading ? (
          <div className="mt-4 rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[12px] text-[#690D2B]">Cargando espacios...</div>
        ) : error ? (
          <div className="mt-4"><ErrorState message={error} retryLabel="Reintentar" onRetry={retry} /></div>
        ) : spaces.length === 0 ? (
          <div className="mt-4"><EmptyState title="Sin espacios publicados" description="Pronto podrás elegir el espacio ideal para tu celebración." /></div>
        ) : (
          <button
            type="button"
            onClick={() => setSpaceSheetOpen(true)}
            className="mt-4 flex min-h-[58px] w-full items-center justify-between gap-3 rounded-[18px] border border-[#E2CCAE] bg-white/74 px-4 text-left shadow-[0_12px_28px_rgba(90,49,28,0.08)] backdrop-blur-xl"
          >
            <span className="flex min-w-0 items-center gap-3">
              <MapPinned size={18} className="shrink-0 text-[#8A1238]" />
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B88A4A]">Espacio</span>
                <span className="mt-1 block truncate text-[15px] font-semibold text-[#2D1811]">{selectedSpaceRecord?.name ?? 'Elegir espacio'}</span>
              </span>
            </span>
            <ChevronDown size={18} className="shrink-0 text-[#8A1238]" />
          </button>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <CrystalDateField value={preferredDate} onChange={setPreferredDate} placeholder="Fecha ideal" buttonClassName="rounded-[16px] border-[#E2CCAE] bg-white/70 text-[13px]" />
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={guestCount}
            onChange={(event) => {
              const nextValue = event.target.value.replace(/[^\d]/g, '')
              setGuestCount(nextValue === '' ? '' : String(Math.max(1, Number(nextValue))))
            }}
            onBlur={() => setGuestCount((value) => (value === '' ? '1' : value))}
            className="rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[13px] outline-none"
          />
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
      {eventSheetOpen ? (
        <ChoiceSheet
          title="Tipo de evento"
          options={eventOptions}
          selectedValue={eventType}
          onSelect={setEventType}
          onClose={() => setEventSheetOpen(false)}
        />
      ) : null}
      {spaceSheetOpen ? (
        <ChoiceSheet
          title="Espacio para evento"
          options={spaceOptions}
          selectedValue={selectedSpace}
          onSelect={setVenueSpaceId}
          onClose={() => setSpaceSheetOpen(false)}
        />
      ) : null}
    </div>
  )
}
