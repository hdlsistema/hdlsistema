export function normalizeAccessQrCode(value: string) {
  const raw = value.trim()
  if (!raw) return ''

  const candidates = [raw]
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const key of ['code', 'token', 'qrToken', 'qrPayload']) {
      if (typeof parsed[key] === 'string') candidates.push(parsed[key])
    }
  } catch {
    // El contenido normal de Hacienda es un token, no JSON.
  }

  try {
    const parsedUrl = new URL(raw)
    for (const key of ['code', 'token', 'qr', 'qrToken']) {
      const candidate = parsedUrl.searchParams.get(key)
      if (candidate) candidates.push(candidate)
    }
    if (parsedUrl.hash) candidates.push(decodeURIComponent(parsedUrl.hash.slice(1)))
  } catch {
    // No es URL; se conserva el valor capturado por la cámara.
  }

  for (const candidate of candidates) {
    const match = candidate.trim().match(/hdl_(?:pass_)?[A-Za-z0-9_-]{12,}/)
    if (match) return match[0]
  }
  return ''
}
