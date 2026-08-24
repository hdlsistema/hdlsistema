import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, QrCode, Share2, X } from 'lucide-react'
import type { CustomerAccessPass } from '../../../services/customer.service'
import {
  downloadAccessCredentialPdf,
  shareAccessCredential,
  type AccessCredential,
} from '../../utils/accessCredentialPdf'

function formatDateTime(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function AccessQr({ payload, alt }: { payload: string; alt: string }) {
  const [source, setSource] = useState('')

  useEffect(() => {
    let active = true
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 260,
      color: {
        dark: '#252F37',
        light: '#F7F2EA',
      },
    }).then((nextSource) => {
      if (active) setSource(nextSource)
    }).catch(() => {
      if (active) setSource('')
    })
    return () => {
      active = false
    }
  }, [payload])

  return source ? (
    <img src={source} alt={alt} className="mx-auto aspect-square w-full max-w-[244px] rounded-[1.2rem] border border-[rgba(184,138,74,0.26)] bg-[#fff9f1] p-3" />
  ) : (
    <div className="mx-auto flex aspect-square w-full max-w-[244px] items-center justify-center rounded-[1.2rem] border border-[rgba(184,138,74,0.26)] bg-[#fff9f1] text-[var(--color-burgundy)]">
      <QrCode size={42} strokeWidth={1.5} />
    </div>
  )
}

export function ticketStatusLabel(pass: CustomerAccessPass, t: (key: string, fallback?: string) => string) {
  if (pass.usedAt) return t('app.premium.ticket.used', 'Utilizado')
  if (pass.revokedAt) return t('app.premium.ticket.cancelled', 'Cancelado')
  if (pass.validUntil && new Date(pass.validUntil).getTime() < Date.now()) return t('app.premium.ticket.expired', 'Caducado')
  if (pass.validFrom && new Date(pass.validFrom).getTime() > Date.now()) return t('app.premium.ticket.notYetValid', 'Aún no vigente')
  const status = String(pass.status ?? '').toLocaleLowerCase('es-MX')
  if (['published', 'valid', 'confirmed', 'active'].includes(status)) return t('app.premium.ticket.valid', 'Vigente')
  if (['pending', 'reserved'].includes(status)) return t('common.pending', 'Pendiente')
  if (['cancelled', 'canceled', 'revoked'].includes(status)) return t('app.premium.ticket.cancelled', 'Cancelado')
  return pass.status ?? t('common.toBeConfirmed')
}

function ticketCredentialState(pass: CustomerAccessPass): AccessCredential['state'] {
  if (pass.usedAt) return 'used'
  if (pass.revokedAt) return 'cancelled'
  if (pass.validUntil && new Date(pass.validUntil).getTime() < Date.now()) return 'expired'
  if (pass.validFrom && new Date(pass.validFrom).getTime() > Date.now()) return 'not_yet_valid'
  return 'valid'
}

export function AccessTicketSheet({
  pass,
  locale,
  onClose,
  t,
}: {
  pass: CustomerAccessPass
  locale: string
  onClose: () => void
  t: (key: string, fallback?: string) => string
}) {
  const [ticketAction, setTicketAction] = useState<'download' | 'share' | ''>('')
  const [ticketActionMessage, setTicketActionMessage] = useState('')
  const credential: AccessCredential = {
    ...pass,
    qrPayload: pass.qrPayload || pass.qrToken,
    state: ticketCredentialState(pass),
  }

  const runTicketAction = async (action: 'download' | 'share') => {
    setTicketAction(action)
    setTicketActionMessage('')
    try {
      if (action === 'download') {
        const result = await downloadAccessCredentialPdf(credential, locale)
        setTicketActionMessage(result.delivery === 'saved'
          ? t('app.premium.ticket.pdfSaved', 'PDF guardado en el dispositivo.')
          : result.delivery === 'opened'
            ? t('app.premium.ticket.pdfOpened', 'PDF abierto en el dispositivo.')
            : t('app.premium.ticket.downloadReady', 'PDF listo para descargar.'))
      } else {
        const result = await shareAccessCredential(credential, locale)
        setTicketActionMessage(result === 'shared'
          ? t('app.premium.ticket.shared', 'Listo para compartir.')
          : result === 'copied'
            ? t('app.premium.ticket.linkCopied', 'Enlace copiado.')
            : t('app.premium.ticket.downloadReady', 'PDF listo para descargar.'))
      }
    } catch {
      setTicketActionMessage(t('app.premium.ticket.actionError', 'No fue posible preparar el boleto en este dispositivo.'))
    } finally {
      setTicketAction('')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center overflow-y-auto bg-[rgba(45,24,17,0.46)] px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 104px)' }}
    >
      <section className="max-h-[calc(100dvh-132px)] w-full max-w-[28rem] overflow-y-auto overscroll-contain rounded-[1.75rem] border border-[rgba(255,255,255,0.56)] bg-[rgba(255,249,241,0.94)] p-5 shadow-[0_24px_70px_rgba(45,24,17,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{t('app.premium.ticket.eyebrow', 'Mi boleto')}</p>
            <h3 className="mt-1 text-[25px] font-medium leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{pass.title ?? t('app.premium.ticket.access', 'Acceso')}</h3>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(45,24,17,0.2)] bg-white/70 text-[var(--color-ink)]" aria-label={t('common.close', 'Cerrar')}>
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">
          <AccessQr payload={pass.qrPayload || pass.qrToken} alt={pass.passNumber ?? t('app.premium.ticket.qrAlt', 'Código QR de acceso')} />
        </div>
        <p className="mt-4 text-center text-[13px] font-semibold text-[var(--color-burgundy)]">{t('app.premium.ticket.present', 'Presenta este código al ingresar')}</p>
        <div className="mt-5 grid gap-2 rounded-[1.2rem] border border-[rgba(184,138,74,0.2)] bg-white/58 p-4 text-[12px] text-[var(--color-muted)]">
          <div className="flex justify-between gap-3"><span>{t('app.premium.ticket.folio', 'Folio')}</span><strong className="text-right text-[var(--color-ink)]">{pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber}</strong></div>
          <div className="flex justify-between gap-3"><span>{t('app.premium.reservation.date')}</span><strong className="text-right text-[var(--color-ink)]">{formatDateTime(pass.startsAt, locale, t('common.toBeConfirmed'))}</strong></div>
          <div className="flex justify-between gap-3"><span>{pass.accessType === 'event_ticket' ? t('app.premium.events.ticket') : t('app.premium.reservation.guests')}</span><strong className="text-right text-[var(--color-ink)]">{pass.ticketTypeName ?? pass.peopleCount ?? t('common.toBeConfirmed')}</strong></div>
          <div className="flex justify-between gap-3"><span>{t('app.premium.ticket.status', 'Estado')}</span><strong className="text-right text-[var(--color-ink)]">{ticketStatusLabel(pass, t)}</strong></div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={Boolean(ticketAction)} onClick={() => void runTicketAction('download')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-burgundy)] px-4 text-[12px] font-semibold text-[var(--color-burgundy)] disabled:opacity-60">
            <Download size={15} />{ticketAction === 'download' ? t('common.loading', 'Preparando...') : t('app.premium.ticket.download', 'Descargar PDF')}
          </button>
          <button type="button" disabled={Boolean(ticketAction)} onClick={() => void runTicketAction('share')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-burgundy)] px-4 text-[12px] font-semibold text-white disabled:opacity-60">
            <Share2 size={15} />{ticketAction === 'share' ? t('common.loading', 'Preparando...') : t('app.premium.ticket.share', 'Compartir')}
          </button>
        </div>
        {ticketActionMessage ? <p className="mt-3 text-center text-[11px] font-semibold text-[var(--color-muted)]">{ticketActionMessage}</p> : null}
      </section>
    </div>
  )
}
