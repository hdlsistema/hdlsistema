import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { PublicAccessPass } from '../../services/accessPass.service'

export type AccessCredential = Pick<
  PublicAccessPass,
  'accessType' | 'customerName' | 'endsAt' | 'orderNumber' | 'passNumber' | 'peopleCount' | 'qrPayload' | 'reservationNumber' | 'startsAt' | 'state' | 'title' | 'validFrom' | 'validUntil'
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

function stateLabel(state: string) {
  const labels: Record<string, string> = {
    valid: 'Vigente',
    used: 'Utilizado',
    cancelled: 'Cancelado',
    expired: 'Caducado',
    not_yet_valid: 'Aún no vigente',
  }
  return labels[state] ?? state
}

function isEntryAccessType(type: string) {
  return !['wine_order', 'paid_order'].includes(type)
}

function safeFileName(pass: AccessCredential) {
  const folio = pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber ?? 'acceso'
  return `Hacienda-de-Letras-${folio.replace(/[^A-Za-z0-9_-]/g, '-')}.pdf`
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('No fue posible preparar el PDF.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.includes(',') ? result.split(',')[1] ?? '' : result)
    }
    reader.readAsDataURL(blob)
  })
}

export async function buildAccessCredentialPdf(pass: AccessCredential, locale = 'es-MX') {
  if (!isEntryAccessType(pass.accessType)) {
    throw new Error('Este comprobante no genera QR de entrada.')
  }
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const burgundy = '#680D24'
  const gold = '#B88A4A'
  const ink = '#2D1811'
  const muted = '#6F5A50'
  const paper = '#F7F2EA'
  const title = pass.title || 'Tu acceso'
  const folio = pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber ?? 'Sin folio'
  const holder = pass.customerName || 'Cliente Hacienda de Letras'
  const qrPayload = pass.qrPayload || folio
  const qr = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 960,
    color: { dark: ink, light: '#FFFFFF' },
  })

  doc.setProperties({
    title: `Boleto ${folio}`,
    subject: 'Acceso Hacienda de Letras',
    author: 'Hacienda de Letras',
    creator: 'Hacienda de Letras',
  })

  doc.setFillColor(paper)
  doc.rect(0, 0, 210, 297, 'F')

  doc.setFillColor(104, 13, 36)
  doc.roundedRect(14, 14, 182, 42, 5, 5, 'F')
  doc.setTextColor('#FFFFFF')
  doc.setFont('times', 'bold')
  doc.setFontSize(24)
  doc.text('Hacienda de Letras', 24, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('EL VINO DE AGUASCALIENTES', 24, 39)
  doc.setDrawColor(gold)
  doc.setLineWidth(0.45)
  doc.line(24, 45, 92, 45)

  doc.setTextColor(gold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(typeLabel(pass.accessType).toUpperCase(), 20, 75)
  doc.setTextColor(burgundy)
  doc.setFont('times', 'bold')
  doc.setFontSize(28)
  doc.text(doc.splitTextToSize(title, 168), 20, 89)

  doc.setFillColor('#FFFFFF')
  doc.roundedRect(49, 111, 112, 112, 8, 8, 'F')
  doc.setDrawColor(232, 219, 200)
  doc.roundedRect(49, 111, 112, 112, 8, 8, 'S')
  doc.addImage(qr, 'PNG', 59, 121, 92, 92)
  doc.setTextColor(burgundy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('PRESENTA ESTE CODIGO AL INGRESAR', 105, 233, { align: 'center' })

  doc.setFillColor('#FFFFFF')
  doc.setDrawColor(184, 138, 74)
  doc.roundedRect(18, 244, 174, 34, 4, 4, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(ink)
  const rows = [
    ['Folio', folio],
    ['Titular', holder],
    ['Fecha', dateLabel(pass.startsAt, locale)],
    ['Estado', stateLabel(pass.state)],
  ]
  rows.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? 26 : 108
    const y = 255 + Math.floor(index / 2) * 13
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(gold)
    doc.text(label.toUpperCase(), x, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(ink)
    doc.text(String(value), x, y + 5, { maxWidth: 72 })
  })

  doc.setFillColor(255, 250, 243)
  doc.setDrawColor(232, 219, 200)
  doc.roundedRect(18, 58, 174, 12, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(burgundy)
  doc.text(folio, 24, 66)
  doc.text(`${String(pass.peopleCount ?? 1)} persona(s)`, 186, 66, { align: 'right' })

  if (pass.validUntil) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(muted)
    doc.text(`Vigencia: ${dateLabel(pass.validFrom ?? pass.startsAt, locale)} - ${dateLabel(pass.validUntil, locale)}`, 20, 286, { maxWidth: 170 })
  }

  doc.setFontSize(8)
  doc.setTextColor(muted)
  doc.text('La validación final se realiza en Control de entradas con personal autorizado.', 20, 292, { maxWidth: 170 })
  doc.setTextColor(burgundy)
  doc.text('www.haciendadeletras.com', 20, 280)

  return { blob: doc.output('blob'), fileName: safeFileName(pass) }
}

function openBlobUrl(url: string) {
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  return Boolean(opened)
}

async function writeNativePdf(blob: Blob, fileName: string, directory: Directory) {
  const data = await blobToBase64(blob)
  const result = await Filesystem.writeFile({
    path: `boletos/${fileName}`,
    data,
    directory,
    recursive: true,
  })
  return result.uri
}

export async function downloadAccessCredentialPdf(pass: AccessCredential, locale = 'es-MX') {
  const { blob, fileName } = await buildAccessCredentialPdf(pass, locale)
  if (Capacitor.isNativePlatform()) {
    const uri = await writeNativePdf(blob, fileName, Directory.Documents)
    await Share.share({
      title: pass.title || 'Hacienda de Letras',
      text: `Boleto Hacienda de Letras ${pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber ?? ''}`.trim(),
      files: [uri],
      dialogTitle: 'Guardar PDF',
    })
    return { fileName, delivery: 'saved' as const }
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  const openedPreview = Capacitor.isNativePlatform() ? openBlobUrl(url) : false
  window.setTimeout(() => {
    anchor.remove()
    URL.revokeObjectURL(url)
  }, 60_000)
  return { fileName, delivery: openedPreview ? 'opened' as const : 'downloaded' as const }
}

export async function shareAccessCredential(pass: AccessCredential, locale = 'es-MX') {
  const { blob, fileName } = await buildAccessCredentialPdf(pass, locale)
  if (Capacitor.isNativePlatform()) {
    const uri = await writeNativePdf(blob, fileName, Directory.Cache)
    const canShare = await Share.canShare()
    if (canShare.value) {
      await Share.share({
        title: pass.title || 'Hacienda de Letras',
        text: `Boleto Hacienda de Letras ${pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber ?? ''}`.trim(),
        files: [uri],
        dialogTitle: 'Compartir boleto',
      })
      return 'shared'
    }
  }
  const file = new File([blob], fileName, { type: 'application/pdf' })
  if (navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ title: pass.title || 'Hacienda de Letras', text: 'Tu acceso de Hacienda de Letras', files: [file] })
        return 'shared'
      }
    } catch {
      // Some WebViews expose canShare(files) but reject at runtime; fall back to sharing the public access link.
    }
    await navigator.share({
      title: pass.title || 'Hacienda de Letras',
      text: `Acceso Hacienda de Letras ${pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber ?? ''}`.trim(),
      url: pass.qrPayload,
    })
    return 'shared'
  }
  if (navigator.clipboard && pass.qrPayload) {
    await navigator.clipboard.writeText(pass.qrPayload)
    return 'copied'
  }
  await downloadAccessCredentialPdf(pass, locale)
  return 'downloaded'
}
