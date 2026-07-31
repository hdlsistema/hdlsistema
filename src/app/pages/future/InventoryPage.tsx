import { MapboxScene } from '../../components/shared/MapboxScene'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { wines } from '../../data/wines'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function InventoryPage() {
  const { isEnglish } = useAppPreferences()
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow={isEnglish ? 'Inventory' : 'Inventario'}
        title={isEnglish ? 'Inventory' : 'Inventario'}
        subtitle={isEnglish ? 'Comprehensive stock control, warehouses, suppliers and traceability by lot.' : 'Control integral de existencias, bodegas, proveedores y trazabilidad por lote.'}
      />

      <div className="grid gap-4 xl:grid-cols-5">
        {[
          [isEnglish ? 'Total stock (Bottles)' : 'Stock total (Botellas)', '412,860', isEnglish ? '18.6% vs. previous month' : '18.6% vs. mes anterior'],
          [isEnglish ? 'Active SKUs' : 'SKUs activos', '128', isEnglish ? '6.2% vs. previous month' : '6.2% vs. mes anterior'],
          [isEnglish ? 'Orders in transit' : 'Ordenes en transito', '14', isEnglish ? '2 vs. last week' : '2 vs. semana anterior'],
          [isEnglish ? 'Active suppliers' : 'Proveedores activos', '23', isEnglish ? 'No change' : 'Sin cambio'],
          [isEnglish ? 'Critical alerts' : 'Alertas criticas', '7', isEnglish ? '2 vs. yesterday' : '2 vs. ayer'],
        ].map(([label, value, note]) => (
          <article key={label} className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm text-[var(--color-muted)]">{label}</p>
            <p className="mt-2 text-[2.4rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {value}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.34fr_0.78fr_0.88fr]">
        <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--color-line)] px-5 py-4">
            <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {isEnglish ? 'Wine inventory' : 'Inventario de vinos'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-soft)] text-[var(--color-muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">{isEnglish ? 'Label' : 'Etiqueta'}</th>
                  <th className="px-5 py-3 font-medium">{isEnglish ? 'Type' : 'Tipo'}</th>
                  <th className="px-5 py-3 font-medium">{isEnglish ? 'Lot' : 'Lote'}</th>
                  <th className="px-5 py-3 font-medium">{isEnglish ? 'Vintage' : 'Cosecha'}</th>
                  <th className="px-5 py-3 font-medium">{isEnglish ? 'Stock' : 'Existencia'}</th>
                  <th className="px-5 py-3 font-medium">{isEnglish ? 'Warehouse' : 'Bodega'}</th>
                  <th className="px-5 py-3 font-medium">{isEnglish ? 'Status' : 'Estado'}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Hacienda de Letras Gran Reserva', 'Tinto', 'HL-GR-24', '2021', '18,360', 'Bodega 1', 'En stock'],
                  ['Letras de Altura Seleccion', 'Tinto', 'LA-S-24', '2022', '24,120', 'Bodega 1', 'En stock'],
                  ['Terra 1854 Malbec', 'Tinto', 'T1854-MB-24', '2022', '12,480', 'Bodega 2', 'En stock'],
                  ['Blanco de Letras Chardonnay', 'Blanco', 'BL-CH-24', '2023', '15,842', 'Bodega 3', 'En stock'],
                  ['Rosado de Altura Garnacha', 'Rosado', 'RA-G-24', '2023', '8,915', 'Bodega 3', 'En stock'],
                  ['Espumoso Brut Metodo Tradicional', 'Espumoso', 'ESP-BR-24', '2022', '6,245', 'Bodega 4', 'Atencion'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-[var(--color-line)]">
                    {row.map((cell) => (
                      <td key={cell} className="px-5 py-4 text-[var(--color-muted-strong)]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Warehouse occupancy' : 'Ocupacion por bodega'}
          </h3>
          <div className="mt-5 space-y-4">
            {[
              ['Bodega 1', [92, 78, 65, 40], '69%'],
              ['Bodega 2', [88, 72, 60, 38], '64%'],
              ['Bodega 3', [75, 58, 45, 30], '52%'],
              ['Bodega 4', [48, 35, 25, 18], '31%'],
            ].map(([label, values, total]) => (
              <div key={String(label)} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-[var(--color-muted-strong)]">
                  <span>{label}</span>
                  <span>{total}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(values as number[]).map((value, index) => (
                    <div key={index} className="rounded-md px-2 py-2 text-center text-xs text-[var(--color-muted-strong)]" style={{ backgroundColor: ['#edd9ca', '#dfab9f', '#c96d67', '#7e1f30'][index] }}>
                      {value}%
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {isEnglish ? 'Logistics map' : 'Mapa logistico'}
            </h3>
            <button type="button" className="rounded-full border border-[var(--color-line)] px-3 py-2 text-xs text-[var(--color-muted)]">
              {isEnglish ? 'View on map' : 'Ver en mapa'}
            </button>
          </div>
          <div className="relative mt-5 h-72 overflow-hidden rounded-[1rem] border border-[var(--color-line)]">
            <MapboxScene
              center={[-101.8, 21.8]}
              zoom={6.1}
              pitch={52}
              bearing={-18}
              markers={[
                { coordinates: [-102.296, 22.7709], label: 'Zacatecas' },
                { coordinates: [-100.9855, 22.1565], label: 'San Luis Potosi' },
                { coordinates: [-102.296, 21.8818], label: 'Aguascalientes' },
                { coordinates: [-101.684, 21.1214], label: 'Leon' },
                { coordinates: [-103.3496, 20.6597], label: 'Guadalajara' },
              ]}
              routes={[
                {
                  coordinates: [
                    [-102.296, 21.8818],
                    [-102.296, 22.7709],
                    [-100.9855, 22.1565],
                    [-101.684, 21.1214],
                    [-103.3496, 20.6597],
                    [-102.296, 21.8818],
                  ],
                },
              ]}
              className="h-72"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
            <span>{isEnglish ? 'In transit (6)' : 'En transito (6)'}</span>
            <span>{isEnglish ? 'Delivered today (4)' : 'Entregado hoy (4)'}</span>
            <span>{isEnglish ? 'Pending (2)' : 'Pendiente (2)'}</span>
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_0.95fr_0.8fr]">
        <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Recent purchase orders' : 'Ordenes de compra recientes'}
          </h3>
          <div className="mt-5 space-y-3 text-sm text-[var(--color-muted-strong)]">
            {[
              ['OC-2024-156', 'Vidrio SA de CV', '12 may, 2024', '$285,600', 'Pendiente'],
              ['OC-2024-155', 'Corchos del Bajio', '10 may, 2024', '$142,800', 'Parcial'],
              ['OC-2024-154', 'Etiquetas Finas', '9 may, 2024', '$98,450', 'Recibido'],
              ['OC-2024-153', 'Barricas Selectas', '7 may, 2024', '$376,200', 'Pendiente'],
            ].map((order) => (
              <div key={order[0]} className="grid grid-cols-[1fr_1fr_88px] gap-3 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
                <div>
                  <p className="text-[var(--color-ink)]">{order[0]}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{order[1]}</p>
                </div>
                <div>
                  <p>{order[2]}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{order[3]}</p>
                </div>
                <StatusBadge label={order[4]} />
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Supplier performance' : 'Desempeno de proveedores'}
          </h3>
          <div className="mt-5 space-y-3">
            {[
              ['Vidrio SA de CV', 12, 92, '98%'],
              ['Corchos del Bajio', 8, 95, '96%'],
              ['Etiquetas Finas', 7, 90, '100%'],
              ['Barricas Selectas', 15, 93, '94%'],
            ].map(([name, leadTime, quality, compliance]) => (
              <div key={name} className="grid grid-cols-[minmax(0,1fr)_52px_52px_56px] gap-3 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 text-sm text-[var(--color-muted-strong)]">
                <span className="text-[var(--color-ink)]">{name}</span>
                <span>{leadTime}d</span>
                <span>{quality}</span>
                <span>{compliance}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[var(--radius-card)] border border-[rgba(137,47,58,0.2)] bg-[linear-gradient(180deg,var(--color-burgundy),#6b1428)] p-5 text-white shadow-[var(--shadow-card)]">
          <h3 className="text-2xl leading-none text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'ALQIA Intelligence Insights' : 'Insights de ALQIA Intelligence'}
          </h3>
          <div className="mt-5 space-y-4 text-sm text-[rgba(255,243,229,0.92)]">
            <p>{isEnglish ? 'Restock soon: Gran Reserva 2021 will reach reorder point in 12 days.' : 'Reabastecer pronto: Gran Reserva 2021 alcanzara punto de reorder en 12 dias.'}</p>
            <p>{isEnglish ? 'Slow rotation: Lineas del Tiempo shows low turnout.' : 'Rotacion lenta: Lineas del Tiempo presenta baja salida.'}</p>
            <p>{isEnglish ? 'Demand forecast: Vendimia Festival projects a 32% increase from June 14–16.' : 'Pronostico de demanda: Festival de Vendimia proyecta aumento del 32% del 14 al 16 de junio.'}</p>
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr_0.8fr]">
        <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Product mix' : 'Mezcla de productos'}
          </h3>
          <div className="mt-6 flex items-center justify-center">
            <div className="relative h-48 w-48 rounded-full bg-[conic-gradient(#7e1f30_0_56%,#d0b38d_56%_74%,#d38c87_74%_83%,#ece4d8_83%_90%,#b48a55_90%_100%)]">
              <div className="absolute inset-8 rounded-full bg-[var(--color-panel)]" />
            </div>
          </div>
          <div className="mt-5 space-y-2 text-sm text-[var(--color-muted-strong)]">
            <div className="flex justify-between"><span>{isEnglish ? 'Reds' : 'Tintos'}</span><span>56%</span></div>
            <div className="flex justify-between"><span>{isEnglish ? 'Whites' : 'Blancos'}</span><span>18%</span></div>
            <div className="flex justify-between"><span>{isEnglish ? 'Rosés' : 'Rosados'}</span><span>9%</span></div>
            <div className="flex justify-between"><span>{isEnglish ? 'Sparkling' : 'Espumosos'}</span><span>7%</span></div>
            <div className="flex justify-between"><span>{isEnglish ? 'Experiences' : 'Experiencias'}</span><span>10%</span></div>
          </div>
        </article>

        <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Lot traceability' : 'Trazabilidad por lote'}
          </h3>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-soft)] text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">{isEnglish ? 'Lot' : 'Lote'}</th>
                  <th className="px-4 py-3 font-medium">{isEnglish ? 'Product' : 'Producto'}</th>
                  <th className="px-4 py-3 font-medium">{isEnglish ? 'Origin' : 'Origen'}</th>
                  <th className="px-4 py-3 font-medium">{isEnglish ? 'Date' : 'Fecha'}</th>
                  <th className="px-4 py-3 font-medium">{isEnglish ? 'Stock' : 'Existencia'}</th>
                  <th className="px-4 py-3 font-medium">{isEnglish ? 'Status' : 'Estado'}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['HL-GR-21', 'Gran Reserva 2021', 'Finca La Estancia', '18 feb. 2023', '18,360', 'Optimo'],
                  ['LA-S-22', 'Letras de Altura 2022', 'Finca El Porvenir', '12 mar. 2023', '24,120', 'Optimo'],
                  ['T1854-MB-22', 'Terra 1854 Malbec', 'Finca Las Letras', '20 feb. 2023', '12,480', 'Optimo'],
                  ['ESP-BR-22', 'Espumoso Brut 2022', 'Finca La Estancia', '05 jun. 2023', '6,245', 'Atencion'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-[var(--color-line)]">
                    {row.map((cell) => (
                      <td key={cell} className="px-4 py-3 text-[var(--color-muted-strong)]">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Inventory alerts' : 'Alertas de inventario'}
          </h3>
          <div className="mt-5 space-y-4">
            {wines.slice(1).map((wine) => (
              <div key={wine.id} className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
                <div className="flex items-center gap-3">
                  <img src={wine.image} alt={wine.name} className="h-16 w-8 object-contain" />
                  <div>
                    <p className="text-sm text-[var(--color-ink)]">{wine.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{wine.stock}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <StatusBadge label={wine.status} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
