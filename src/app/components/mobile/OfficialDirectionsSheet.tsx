import { ExternalLink, MapPin, Navigation, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { PublicMapPoi } from '../../../services/customer.service'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { navigationUrl } from '../../utils/officialLocations'

export function OfficialDirectionsSheet({
  poi,
  displayName,
  onClose,
}: {
  poi: PublicMapPoi
  displayName?: string
  onClose: () => void
}) {
  const { isEnglish } = useAppPreferences()

  const openDirections = (provider: 'google' | 'waze') => {
    window.open(navigationUrl(provider, poi), '_blank', 'noopener,noreferrer')
    onClose()
  }

  const sheet = (
    <div className="fixed inset-0 z-[260] flex items-end bg-[rgba(35,12,13,0.38)] px-3 pb-[calc(env(safe-area-inset-bottom)+104px)] pt-[calc(env(safe-area-inset-top)+16px)] backdrop-blur-[7px]" role="dialog" aria-modal="true" aria-label={isEnglish ? 'Choose navigation app' : 'Elige aplicación de navegación'}>
      <section className="app-scrollbar-none max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-132px)] w-full overflow-y-auto overscroll-contain rounded-[24px] border border-[rgba(231,207,170,0.82)] bg-[rgba(255,249,241,0.97)] p-5 pb-5 shadow-[0_28px_64px_rgba(45,12,18,0.3)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">{isEnglish ? 'Directions' : 'Cómo llegar'}</p>
            <h2 className="mt-1 text-[23px] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{displayName ?? poi.name}</h2>
            <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted)]">{poi.address}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[var(--color-ink)]" aria-label={isEnglish ? 'Close' : 'Cerrar'}><X size={17} /></button>
        </div>
        <p className="mt-4 rounded-[13px] bg-[rgba(244,234,228,.78)] px-3 py-2.5 text-[10px] leading-4 text-[var(--color-muted)]">
          {isEnglish ? 'Choose your navigation app. The route uses the exact marker coordinates.' : 'Elige tu aplicación de navegación. La ruta usa las coordenadas exactas del marcador.'}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          <button type="button" onClick={() => openDirections('google')} className="flex min-h-14 items-center justify-center gap-2 rounded-[15px] border border-[rgba(184,138,74,0.28)] bg-white text-[12px] font-semibold text-[var(--color-ink)]"><MapPin size={17} className="text-[var(--color-burgundy)]" />Google Maps<ExternalLink size={13} /></button>
          <button type="button" onClick={() => openDirections('waze')} className="app-burgundy-cta flex min-h-14 items-center justify-center gap-2 rounded-[15px] bg-[linear-gradient(135deg,#7d1435,#57071d)] text-[12px] font-semibold text-white"><Navigation size={17} />Waze<ExternalLink size={13} /></button>
        </div>
      </section>
    </div>
  )

  return typeof document === 'undefined' ? sheet : createPortal(sheet, document.body)
}
