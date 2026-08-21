import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import type { PublicAccessPass } from '../../services/accessPass.service'

export type AccessCredential = Pick<
  PublicAccessPass,
  'accessType' | 'customerName' | 'endsAt' | 'orderNumber' | 'passNumber' | 'peopleCount' | 'qrPayload' | 'reservationNumber' | 'startsAt' | 'state' | 'title'
>

function dateLabel(value?: string | null, locale = 'es-MX') {
  if (!value) return 'Por confirmar'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    event_ticket: 'Boleto de evento',
    experience: 'Reservación de experiencia',
    restaurant: 'Reservación de restaurante',
    cabin: 'Reservación de hospedaje',
  }
  return labels[type] ?? 'Acceso Hacienda de Letras'
}

function isEntryAccessType(type: string) {
  return !['wine_order', 'paid_order'].includes(type)
}

function safeFileName(pass: AccessCredential) {
  const folio = pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber ?? 'acceso'
  return `Hacienda-de-Letras-${folio.replace(/[^A-Za-z0-9_-]/g, '-')}.pdf`
}

export async function buildAccessCredentialPdf(pass: AccessCredential, locale = 'es-MX') {
  if (!isEntryAccessType(pass.accessType)) {
    throw new Error('Este comprobante no genera QR de entrada.')
  }
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const burgundy = '#680D24'
  const gold = '#B88A4A'
  const ink = '#2D1811'
  const qr = await QRCode.toDataURL(pass.qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 960,
    color: { dark: ink, light: '#FFFFFF' },
  })

  doc.setFillColor(104, 13, 36)
  doc.rect(0, 0, 210, 35, 'F')
  doc.setTextColor('#FFFFFF')
  doc.setFont('times', 'bold')
  doc.setFontSize(22)
  doc.text('Hacienda de Letras', 20, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('EL VINO DE AGUASCALIENTES', 20, 26)

  doc.setTextColor(gold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(typeLabel(pass.accessType).toUpperCase(), 20, 51)
  doc.setTextColor(burgundy)
  doc.setFont('times', 'bold')
  doc.setFontSize(26)
  doc.text(pass.title || 'Tu acceso', 20, 65, { maxWidth: 170 })

  doc.addImage(qr, 'PNG', 57, 79, 96, 96)
  doc.setDrawColor(184, 138, 74)
  doc.roundedRect(18, 184, 174, 73, 4, 4, 'S')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(ink)
  const folio = pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber ?? 'Sin folio'
  const rows = [
    ['Folio', folio],
    ['Titular', pass.customerName || 'Cliente Hacienda de Letras'],
    ['Fecha', dateLabel(pass.startsAt, locale)],
    ...(pass.endsAt ? [['Finaliza', dateLabel(pass.endsAt, locale)]] : []),
    ['Personas', String(pass.peopleCount ?? 1)],
    ['Estado', pass.state === 'valid' ? 'Vigente' : pass.state],
  ]
  rows.forEach(([label, value], index) => {
    const y = 196 + index * 10
    doc.setFont('helvetica', 'bold')
    doc.text(label, 25, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value), 67, y, { maxWidth: 116 })
  })
  doc.setFontSize(8)
  doc.setTextColor('#6F5A50')
  doc.text('Escanea el código con la cámara del teléfono. La lectura no consume el acceso; la confirmación requiere personal autorizado.', 20, 275, { maxWidth: 170 })
  doc.setTextColor(burgundy)
  doc.text('www.haciendadeletras.com', 20, 286)

  return { blob: doc.output('blob'), fileName: safeFileName(pass) }
}

export async function downloadAccessCredentialPdf(pass: AccessCredential, locale = 'es-MX') {
  const { blob, fileName } = await buildAccessCredentialPdf(pass, locale)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function shareAccessCredential(pass: AccessCredential, locale = 'es-MX') {
  const { blob, fileName } = await buildAccessCredentialPdf(pass, locale)
  const file = new File([blob], fileName, { type: 'application/pdf' })
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ title: pass.title || 'Hacienda de Letras', text: 'Tu acceso de Hacienda de Letras', files: [file] })
    return 'shared'
  }
  await downloadAccessCredentialPdf(pass, locale)
  return 'downloaded'
}
