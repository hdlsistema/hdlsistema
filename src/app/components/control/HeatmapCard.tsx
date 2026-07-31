import { useAppPreferences } from '../../context/AppPreferencesContext'

export function HeatmapCard() {
  const { isEnglish } = useAppPreferences()

  const rows = isEnglish
    ? ['Wine tastings', 'Tours', 'Romantic dinners', 'Vineyard picnic', 'Restaurant', 'Private events']
    : ['Catas de vino', 'Recorridos', 'Cenas romanticas', 'Picnic entre vinedos', 'Restaurante', 'Eventos privados']

  const cols = isEnglish
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
  const cells = [
    [1, 2, 2, 3, 3, 4, 4],
    [0, 1, 2, 2, 3, 4, 3],
    [1, 1, 2, 3, 4, 4, 5],
    [1, 2, 2, 3, 3, 4, 3],
    [2, 2, 3, 3, 4, 5, 4],
    [0, 1, 1, 2, 3, 3, 2],
  ]
  const tones = ['#f5ece3', '#efdfcf', '#e8c7b1', '#d89b8e', '#ba5d60', '#7e1f30']

  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Occupancy map' : 'Mapa de ocupacion'}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{isEnglish ? 'Reservations by experience and day' : 'Reservaciones por experiencia y dia'}</p>
        </div>
        <div className="inline-flex rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] p-1 text-xs text-[var(--color-muted)]">
          <span className="rounded-full bg-[var(--color-burgundy)] px-3 py-1 text-white">{isEnglish ? 'Month' : 'Mes'}</span>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <div className="grid min-w-[620px] grid-cols-[180px_repeat(7,minmax(0,1fr))] gap-2 text-sm">
          <div />
          {cols.map((col) => (
            <div key={col} className="text-center text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
              {col}
            </div>
          ))}
          {rows.map((row, rowIndex) => (
            <div key={row} className="contents">
              <div className="py-2 text-[var(--color-muted-strong)]">{row}</div>
              {cells[rowIndex].map((level, colIndex) => (
                <div
                  key={`${row}-${colIndex}`}
                  className="flex h-11 items-center justify-center rounded-lg border border-white/40 text-xs text-[var(--color-muted-strong)]"
                  style={{ backgroundColor: tones[level] }}
                >
                  {rowIndex * 5 + colIndex + 2}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>{isEnglish ? 'Low demand' : 'Baja demanda'}</span>
        <div className="flex gap-1">
          {tones.map((tone) => (
            <span key={tone} className="h-2.5 w-7 rounded-full" style={{ backgroundColor: tone }} />
          ))}
        </div>
        <span>{isEnglish ? 'High demand' : 'Alta demanda'}</span>
      </div>
    </article>
  )
}
