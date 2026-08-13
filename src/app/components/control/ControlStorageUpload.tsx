import { FileText, Image as ImageIcon, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { supabase } from '../../../lib/supabase'

type ControlStorageUploadProps = {
  bucket: string
  pathPrefix: string
  value: string
  onChange: (value: string) => void
  label: string
  accept?: string
  maxSizeMb?: number
  publicFile?: boolean
  image?: boolean
  disabled?: boolean
}

function safeSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function fileExtension(file: File) {
  const namedExtension = file.name.split('.').pop()
  if (namedExtension && namedExtension !== file.name) return safeSegment(namedExtension)
  const mimeExtension = file.type.split('/').pop()
  return safeSegment(mimeExtension || 'bin')
}

export function ControlStorageUpload({
  bucket,
  pathPrefix,
  value,
  onChange,
  label,
  accept,
  maxSizeMb = 10,
  publicFile = false,
  image = false,
  disabled = false,
}: ControlStorageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`El archivo supera el límite de ${maxSizeMb} MB.`)
      return
    }
    if (image && !file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen válido.')
      return
    }

    setUploading(true)
    try {
      const uniqueId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const objectPath = `${safeSegment(pathPrefix)}/${Date.now()}-${uniqueId}.${fileExtension(file)}`
      const result = await supabase.storage.from(bucket).upload(objectPath, file, {
        cacheControl: '3600',
        contentType: file.type || undefined,
        upsert: false,
      })
      if (result.error) throw result.error

      if (publicFile) {
        const publicUrl = supabase.storage.from(bucket).getPublicUrl(result.data.path).data.publicUrl
        onChange(publicUrl)
      } else {
        onChange(result.data.path)
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No fue posible cargar el archivo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled || uploading}
        onChange={uploadFile}
        className="sr-only"
      />
      {image && value ? (
        <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-soft)]">
          <img src={value} alt="Vista previa" className="h-40 w-full object-cover" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-50"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : image ? <ImageIcon size={15} /> : <UploadCloud size={15} />}
          {uploading ? 'Cargando...' : value ? `Reemplazar ${label.toLowerCase()}` : `Cargar ${label.toLowerCase()}`}
        </button>
        {value ? (
          <button type="button" disabled={disabled || uploading} onClick={() => onChange('')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-alert)] disabled:opacity-50">
            <Trash2 size={14} /> Quitar
          </button>
        ) : null}
      </div>
      {value && !image ? <p className="flex min-w-0 items-center gap-2 rounded-lg bg-[var(--color-soft)] px-3 py-2 text-xs text-[var(--color-muted-strong)]"><FileText size={14} className="shrink-0" /><span className="truncate">{value.split('/').pop()}</span></p> : null}
      <p className="text-[11px] text-[var(--color-muted)]">Formatos permitidos: {image ? 'JPG, PNG, WebP o AVIF' : 'PDF o imagen'} · máximo {maxSizeMb} MB.</p>
      {error ? <p className="text-xs font-semibold text-[var(--color-alert)]">{error}</p> : null}
    </div>
  )
}
