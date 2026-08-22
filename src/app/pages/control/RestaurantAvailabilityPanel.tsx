import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Save, X } from 'lucide-react'
import { adminCommercialCatalogClient, type PublicCommercialItem } from '../../../services/commercial.service'
import { CrystalSelect } from '../../components/shared/CrystalSelect'

type RestaurantAvailabilityDraft = {
  publicHours: string
  reservationTimes: string
  reservationEnabled: boolean
}

function configuredTimes(item: PublicCommercialItem) {
  return Array.isArray(item.metadata?.reservationTimes)
    ? item.metadata.reservationTimes.filter((value): value is string => typeof value === 'string').join('\n')
    : ''
}

function publicHours(item: PublicCommercialItem) {
  const general = item.hours?.general
  if (typeof general === 'string') return general
  return Object.values(item.hours ?? {}).filter((value): value is string => typeof value === 'string').join(' · ')
}

export function RestaurantAvailabilityPanel({ token, writable }: { token: string | null | undefined; writable: boolean }) {
  const [restaurants, setRestaurants] = useState<PublicCommercialItem[]>([])
  const [drafts, setDrafts] = useState<Record<string, RestaurantAvailabilityDraft>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminCommercialCatalogClient.list(token)
      const nextRestaurants = response.data.restaurants
      setRestaurants(nextRestaurants)
      setDrafts(Object.fromEntries(nextRestaurants.map((item) => [item.id, {
        publicHours: publicHours(item),
        reservationTimes: configuredTimes(item),
        reservationEnabled: item.reservationEnabled ?? true,
      }])))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la disponibilidad de restaurantes.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const updateDraft = (id: string, patch: Partial<RestaurantAvailabilityDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }))
  }

  const save = async (item: PublicCommercialItem) => {
    const draft = drafts[item.id]
    if (!draft || savingId) return

    const values = draft.reservationTimes.split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean)
    if (values.some((value) => !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))) {
      setError('Revisa los horarios: deben usar el formato HH:mm, por ejemplo 13:30.')
      return
    }
    const reservationTimes = [...new Set(values)].sort()
    if (draft.reservationEnabled && item.status === 'published' && item.visibleInApp && reservationTimes.length === 0) {
      setError('Agrega al menos un horario antes de habilitar reservaciones en la app.')
      return
    }

    setSavingId(item.id)
    setError('')
    try {
      await adminCommercialCatalogClient.update(token, 'restaurants', item.id, {
        slug: item.slug,
        name: item.name,
        status: item.status ?? 'draft',
        visibleInApp: item.visibleInApp ?? false,
        verificationStatus: item.verificationStatus ?? 'verified',
        coverImageUrl: item.coverImageUrl ?? null,
        sortOrder: item.sortOrder ?? 0,
        metadata: { ...item.metadata, reservationTimes, managedBy: 'control_center_availability' },
        alias: item.alias ?? null,
        description: item.description ?? null,
        fullAddress: item.address ?? null,
        city: item.city ?? null,
        state: item.state ?? null,
        phone: item.phone ?? null,
        hours: { ...(item.hours ?? {}), general: draft.publicHours.trim() },
        reservationEnabled: draft.reservationEnabled,
      })
      setToast(`${item.name}: disponibilidad guardada y conectada con la app.`)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar la disponibilidad del restaurante.')
    } finally {
      setSavingId('')
    }
  }

  const enabledCount = restaurants.filter((item) => item.reservationEnabled && configuredTimes(item)).length

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">Disponibilidad de mesas</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">Horarios que verá la app móvil</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Cada cambio se guarda en Supabase y la app lo consulta al abrir Restaurantes.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[var(--color-soft)] px-4 py-2 text-xs font-semibold text-[var(--color-burgundy)]">{enabledCount} con horarios activos</span>
          <button type="button" onClick={load} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] px-4 text-xs font-semibold text-[var(--color-burgundy)]">
            <RefreshCw size={14} />Actualizar
          </button>
        </div>
      </section>

      {error ? <p className="rounded-xl border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</p> : null}
      {loading ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-12 text-center text-sm text-[var(--color-muted)]">Cargando restaurantes…</div>
      ) : restaurants.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-12 text-center text-sm text-[var(--color-muted)]">No hay restaurantes registrados en el catálogo operativo.</div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {restaurants.map((item) => {
            const draft = drafts[item.id]
            if (!draft) return null
            const timesCount = draft.reservationTimes.split(/\s+/).filter(Boolean).length
            const visible = item.status === 'published' && item.visibleInApp
            return (
              <article key={item.id} className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
                <header className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-[var(--color-ink)]">{item.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{visible ? 'Publicado y visible en la app' : 'No visible actualmente en la app'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${draft.reservationEnabled ? 'bg-[rgba(37,47,55,0.08)] text-[#252F37]' : 'bg-[#f6eae6] text-[#9b463a]'}`}>{draft.reservationEnabled ? 'Reservaciones activas' : 'Reservaciones pausadas'}</span>
                </header>

                <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
                  <label>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">Horario público</span>
                    <textarea rows={5} value={draft.publicHours} onChange={(event) => updateDraft(item.id, { publicHours: event.target.value })} disabled={!writable} className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-sm outline-none disabled:opacity-60" placeholder="Lun–Dom 11:00 a 18:00" />
                  </label>
                  <label>
                    <span className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]"><span>Horarios disponibles en la app</span><span>{timesCount} horarios</span></span>
                    <textarea rows={5} value={draft.reservationTimes} onChange={(event) => updateDraft(item.id, { reservationTimes: event.target.value })} disabled={!writable} className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 font-mono text-sm outline-none disabled:opacity-60" placeholder={'11:00\n11:30\n12:00'} />
                  </label>
                </div>

                <footer className="mt-4 flex flex-col gap-3 border-t border-[var(--color-line)] pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <label className="min-w-[220px]">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">Solicitudes de mesa</span>
                    <CrystalSelect value={String(draft.reservationEnabled)} onChange={(value) => updateDraft(item.id, { reservationEnabled: value === 'true' })} disabled={!writable}>
                      <option value="true">Habilitadas</option>
                      <option value="false">Pausadas</option>
                    </CrystalSelect>
                  </label>
                  <button type="button" onClick={() => void save(item)} disabled={!writable || Boolean(savingId)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-45">
                    <Save size={15} />{savingId === item.id ? 'Guardando…' : 'Guardar disponibilidad'}
                  </button>
                </footer>
              </article>
            )
          })}
        </section>
      )}

      {toast ? <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[rgba(37,47,55,0.24)] bg-white p-4 text-sm font-semibold text-[#252F37] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{toast}<button type="button" onClick={() => setToast('')} className="ml-4 text-[var(--color-muted)]"><X size={14} /></button></div> : null}
    </div>
  )
}
