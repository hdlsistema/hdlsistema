import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  PackageCheck,
  Plus,
  Route,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Truck,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react'
import { MapboxScene } from '../../components/shared/MapboxScene'

type ShipmentStatus =
  | 'En tránsito'
  | 'Programado'
  | 'Entregado'
  | 'Atención'
  | 'Preparando'

type ShipmentPriority = 'Normal' | 'Alta' | 'Crítica'

type ProviderStatus =
  | 'Activo'
  | 'Disponible'
  | 'Capacidad limitada'

type MapMode = 'routes' | 'coverage' | 'providers'

type ModalType = 'shipment' | 'provider' | 'detail' | null

type Provider = {
  id: string
  name: string
  type: string
  initials: string
  status: ProviderStatus
  coverage: string[]
  activeShipments: number
  onTime: number
  averageCost: number
  rating: number
  leadTime: string
  specialty: string
}

type Shipment = {
  id: string
  order: string
  customer: string
  destination: string
  state: string
  coordinates: [number, number]
  providerId: string
  packages: number
  bottles: number
  value: number
  cost: number
  departure: string
  eta: string
  status: ShipmentStatus
  priority: ShipmentPriority
  tracking: string
  route: [number, number][]
}

type ShipmentForm = {
  customer: string
  destination: string
  state: string
  providerId: string
  packages: string
  bottles: string
  value: string
  cost: string
  departure: string
  eta: string
  priority: ShipmentPriority
  tracking: string
}

type ProviderForm = {
  name: string
  type: string
  coverage: string
  averageCost: string
  leadTime: string
  specialty: string
}

const haciendaCoordinates: [number, number] = [
  -102.296,
  21.8818,
]

const destinationCoordinates: Record<
  string,
  [number, number]
> = {
  Guadalajara: [-103.3496, 20.6597],
  León: [-101.684, 21.1214],
  Zacatecas: [-102.296, 22.7709],
  'San Luis Potosí': [-100.9855, 22.1565],
  Monterrey: [-100.3161, 25.6866],
  'Ciudad de México': [-99.1332, 19.4326],
  Querétaro: [-100.3899, 20.5888],
}

const destinationStates: Record<string, string> = {
  Guadalajara: 'Jalisco',
  León: 'Guanajuato',
  Zacatecas: 'Zacatecas',
  'San Luis Potosí': 'San Luis Potosí',
  Monterrey: 'Nuevo León',
  'Ciudad de México': 'Ciudad de México',
  Querétaro: 'Querétaro',
}

const initialProviders: Provider[] = [
  {
    id: 'own-fleet',
    name: 'Flota Hacienda',
    type: 'Operación propia',
    initials: 'HL',
    status: 'Activo',
    coverage: [
      'Aguascalientes',
      'León',
      'Zacatecas',
      'San Luis Potosí',
    ],
    activeShipments: 3,
    onTime: 96,
    averageCost: 1380,
    rating: 4.9,
    leadTime: 'Mismo día / 24 h',
    specialty: 'Experiencias, eventos y entregas premium',
  },
  {
    id: 'estafeta',
    name: 'Estafeta',
    type: 'Paquetería nacional',
    initials: 'ES',
    status: 'Disponible',
    coverage: [
      'Nacional',
      'Guadalajara',
      'Monterrey',
      'Ciudad de México',
    ],
    activeShipments: 7,
    onTime: 93,
    averageCost: 485,
    rating: 4.6,
    leadTime: '1 a 3 días',
    specialty: 'Cajas de vino y comercio electrónico',
  },
  {
    id: 'tresguerras',
    name: 'Tresguerras',
    type: 'Carga consolidada',
    initials: 'TG',
    status: 'Disponible',
    coverage: ['Bajío', 'Centro', 'Occidente', 'Norte'],
    activeShipments: 4,
    onTime: 91,
    averageCost: 2150,
    rating: 4.5,
    leadTime: '24 a 72 h',
    specialty: 'Pedidos de volumen y distribución mayorista',
  },
  {
    id: 'paquetexpress',
    name: 'Paquetexpress',
    type: 'Paquetería nacional',
    initials: 'PX',
    status: 'Capacidad limitada',
    coverage: ['Nacional', 'Occidente', 'Norte'],
    activeShipments: 2,
    onTime: 89,
    averageCost: 540,
    rating: 4.3,
    leadTime: '2 a 4 días',
    specialty: 'Cobertura extendida y última milla',
  },
]

const initialShipments: Shipment[] = [
  {
    id: 'shipment-2048',
    order: 'OC-2048',
    customer: 'Distribuidora Vinum',
    destination: 'León',
    state: 'Guanajuato',
    coordinates: [-101.684, 21.1214],
    providerId: 'own-fleet',
    packages: 22,
    bottles: 132,
    value: 148500,
    cost: 1680,
    departure: '30 Jun · 08:00',
    eta: '30 Jun · 11:40',
    status: 'En tránsito',
    priority: 'Alta',
    tracking: 'HL-AGU-2048',
    route: [
      haciendaCoordinates,
      [-102.02, 21.64],
      [-101.86, 21.36],
      [-101.684, 21.1214],
    ],
  },
  {
    id: 'shipment-2051',
    order: 'OC-2051',
    customer: 'Restaurante Alma',
    destination: 'Guadalajara',
    state: 'Jalisco',
    coordinates: [-103.3496, 20.6597],
    providerId: 'tresguerras',
    packages: 14,
    bottles: 84,
    value: 96300,
    cost: 2450,
    departure: '30 Jun · 06:30',
    eta: '30 Jun · 12:30',
    status: 'Entregado',
    priority: 'Normal',
    tracking: 'TG-GDL-2051',
    route: [
      haciendaCoordinates,
      [-102.62, 21.54],
      [-102.96, 21.18],
      [-103.3496, 20.6597],
    ],
  },
  {
    id: 'shipment-2052',
    order: 'OC-2052',
    customer: 'Casa Potosina',
    destination: 'San Luis Potosí',
    state: 'San Luis Potosí',
    coordinates: [-100.9855, 22.1565],
    providerId: 'estafeta',
    packages: 11,
    bottles: 64,
    value: 72800,
    cost: 790,
    departure: '30 Jun · 10:20',
    eta: '01 Jul · 15:00',
    status: 'En tránsito',
    priority: 'Normal',
    tracking: 'EST-2052-4456',
    route: [
      haciendaCoordinates,
      [-101.91, 21.98],
      [-101.42, 22.05],
      [-100.9855, 22.1565],
    ],
  },
  {
    id: 'shipment-2053',
    order: 'OC-2053',
    customer: 'Hotel Real de Minas',
    destination: 'Zacatecas',
    state: 'Zacatecas',
    coordinates: [-102.296, 22.7709],
    providerId: 'own-fleet',
    packages: 8,
    bottles: 48,
    value: 56400,
    cost: 1250,
    departure: '30 Jun · 14:00',
    eta: '30 Jun · 17:10',
    status: 'Atención',
    priority: 'Crítica',
    tracking: 'HL-ZAC-2053',
    route: [
      haciendaCoordinates,
      [-102.25, 22.14],
      [-102.28, 22.46],
      [-102.296, 22.7709],
    ],
  },
  {
    id: 'shipment-2054',
    order: 'WEB-8412',
    customer: 'Mariana Torres',
    destination: 'Ciudad de México',
    state: 'Ciudad de México',
    coordinates: [-99.1332, 19.4326],
    providerId: 'estafeta',
    packages: 2,
    bottles: 6,
    value: 7800,
    cost: 460,
    departure: '01 Jul · 09:00',
    eta: '03 Jul · 18:00',
    status: 'Programado',
    priority: 'Normal',
    tracking: 'EST-8412-9002',
    route: [
      haciendaCoordinates,
      [-101.3, 21.3],
      [-100.34, 20.58],
      [-99.1332, 19.4326],
    ],
  },
  {
    id: 'shipment-2055',
    order: 'OC-2055',
    customer: 'Cava Norte',
    destination: 'Monterrey',
    state: 'Nuevo León',
    coordinates: [-100.3161, 25.6866],
    providerId: 'paquetexpress',
    packages: 19,
    bottles: 114,
    value: 132600,
    cost: 2860,
    departure: '01 Jul · 07:00',
    eta: '03 Jul · 17:00',
    status: 'Preparando',
    priority: 'Alta',
    tracking: 'PX-MTY-2055',
    route: [
      haciendaCoordinates,
      [-101.58, 22.94],
      [-101.03, 24.2],
      [-100.3161, 25.6866],
    ],
  },
]

const emptyShipmentForm: ShipmentForm = {
  customer: '',
  destination: 'Guadalajara',
  state: 'Jalisco',
  providerId: 'estafeta',
  packages: '6',
  bottles: '36',
  value: '42500',
  cost: '780',
  departure: '2026-07-01T09:00',
  eta: '2026-07-02T16:00',
  priority: 'Normal',
  tracking: '',
}

const emptyProviderForm: ProviderForm = {
  name: '',
  type: 'Paquetería regional',
  coverage: 'Aguascalientes, Jalisco, Guanajuato',
  averageCost: '850',
  leadTime: '24 a 48 h',
  specialty: 'Última milla y entregas de vino',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-MX').format(value)
}

function getProvider(
  providers: Provider[],
  providerId: string,
) {
  return providers.find(
    (provider) => provider.id === providerId,
  )
}

function getShipmentProgress(status: ShipmentStatus) {
  const progress: Record<ShipmentStatus, number> = {
    Preparando: 18,
    Programado: 32,
    'En tránsito': 68,
    Atención: 58,
    Entregado: 100,
  }

  return progress[status]
}

function statusStyles(status: ShipmentStatus) {
  const styles: Record<ShipmentStatus, string> = {
    'En tránsito': 'bg-[#e7edf2] text-[#506a7d]',
    Programado: 'bg-[#f3eadb] text-[#8b642f]',
    Entregado: 'bg-[#e7efe6] text-[#5f7d63]',
    Atención: 'bg-[#f6e4df] text-[#984f42]',
    Preparando: 'bg-[#eee8f0] text-[#6e5975]',
  }

  return styles[status]
}

function priorityStyles(priority: ShipmentPriority) {
  const styles: Record<ShipmentPriority, string> = {
    Normal: 'bg-[#efebe5] text-[#73695f]',
    Alta: 'bg-[#f2e7d9] text-[#8b642f]',
    Crítica: 'bg-[#f5e2df] text-[#974a42]',
  }

  return styles[priority]
}

function providerStatusStyles(status: ProviderStatus) {
  const styles: Record<ProviderStatus, string> = {
    Activo: 'bg-[#e7efe6] text-[#5f7d63]',
    Disponible: 'bg-[#e7edf2] text-[#506a7d]',
    'Capacidad limitada':
      'bg-[#f3eadb] text-[#8b642f]',
  }

  return styles[status]
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  highlighted = false,
}: {
  label: string
  value: string
  note: string
  icon: LucideIcon
  highlighted?: boolean
}) {
  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-[1.1rem] border p-5 shadow-[var(--shadow-card)] ${
        highlighted
          ? 'border-[rgba(41,55,66,0.24)] bg-[linear-gradient(145deg,#26333d,#131c23)]'
          : 'border-[var(--color-line)] bg-[var(--color-panel)]'
      }`}
    >
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full border ${
          highlighted
            ? 'border-white/10'
            : 'border-[rgba(180,138,85,0.14)]'
        }`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`truncate text-xs ${
              highlighted
                ? 'text-white/62'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {label}
          </p>

          <p
            className={`mt-3 text-[2rem] font-semibold leading-none ${
              highlighted
                ? 'text-white'
                : 'text-[var(--color-ink)]'
            }`}
          >
            {value}
          </p>
        </div>

        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            highlighted
              ? 'bg-white/10 text-[#d8b578]'
              : 'bg-[var(--color-soft)] text-[var(--color-burgundy)]'
          }`}
        >
          <Icon size={18} />
        </span>
      </div>

      <p
        className={`relative mt-4 truncate text-[11px] ${
          highlighted
            ? 'text-white/52'
            : 'text-[var(--color-muted)]'
        }`}
      >
        {note}
      </p>
    </article>
  )
}

function ModalShell({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  width = 'max-w-3xl',
}: {
  title: string
  eyebrow: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#141c22]/72 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div
        className={`relative z-10 max-h-[94vh] w-full ${width} overflow-y-auto rounded-[1.45rem] border border-[var(--color-line)] bg-[var(--color-page)] shadow-[0_38px_90px_rgba(12,18,23,0.42)]`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--color-line)] bg-[var(--color-page)] px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
              {eyebrow}
            </p>

            <h2 className="mt-2 text-[1.65rem] font-semibold leading-none text-[var(--color-ink)]">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">{children}</div>

        {footer ? (
          <div className="sticky bottom-0 border-t border-[var(--color-line)] bg-[var(--color-page)] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  min,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  min?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {label}
      </span>

      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-gold)]"
      />
    </label>
  )
}

function ProgressLine({
  label,
  value,
  percent,
  note,
}: {
  label: string
  value: string
  percent: number
  note: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[var(--color-ink)]">
            {label}
          </p>
          <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">
            {note}
          </p>
        </div>

        <span className="shrink-0 text-xs font-bold text-[var(--color-burgundy)]">
          {value}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function LogisticsPage() {
  const mapModeOptions: Array<{
    key: MapMode
    label: string
    icon: LucideIcon
  }> = [
    { key: 'routes', label: 'Rutas activas', icon: Route },
    { key: 'coverage', label: 'Cobertura', icon: MapPin },
    {
      key: 'providers',
      label: 'Red de proveedores',
      icon: Warehouse,
    },
  ]

  const [providers, setProviders] =
    useState<Provider[]>(initialProviders)
  const [shipments, setShipments] =
    useState<Shipment[]>(initialShipments)
  const [selectedShipmentId, setSelectedShipmentId] = useState(
    initialShipments[0].id,
  )
  const [selectedProviderId, setSelectedProviderId] = useState(
    initialProviders[0].id,
  )
  const [mapMode, setMapMode] = useState<MapMode>('routes')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [providerFilter, setProviderFilter] = useState('Todos')
  const [modal, setModal] = useState<ModalType>(null)
  const [toast, setToast] = useState('')
  const [shipmentForm, setShipmentForm] =
    useState<ShipmentForm>(emptyShipmentForm)
  const [providerForm, setProviderForm] =
    useState<ProviderForm>(emptyProviderForm)

  const filteredShipments = useMemo(() => {
    const query = searchTerm.toLocaleLowerCase('es-MX').trim()

    return shipments.filter((shipment) => {
      const provider = getProvider(
        providers,
        shipment.providerId,
      )

      const matchesSearch =
        query.length === 0 ||
        [
          shipment.order,
          shipment.customer,
          shipment.destination,
          shipment.state,
          shipment.tracking,
          provider?.name,
        ]
          .join(' ')
          .toLocaleLowerCase('es-MX')
          .includes(query)

      const matchesStatus =
        statusFilter === 'Todos' ||
        shipment.status === statusFilter

      const matchesProvider =
        providerFilter === 'Todos' ||
        shipment.providerId === providerFilter

      return (
        matchesSearch && matchesStatus && matchesProvider
      )
    })
  }, [
    shipments,
    providers,
    searchTerm,
    statusFilter,
    providerFilter,
  ])

  const selectedShipment =
    shipments.find(
      (shipment) => shipment.id === selectedShipmentId,
    ) ?? shipments[0]

  const selectedProvider =
    providers.find(
      (provider) => provider.id === selectedProviderId,
    ) ?? providers[0]

  const totals = useMemo(() => {
    const active = shipments.filter(
      (shipment) =>
        shipment.status === 'En tránsito' ||
        shipment.status === 'Programado' ||
        shipment.status === 'Preparando' ||
        shipment.status === 'Atención',
    )

    const delivered = shipments.filter(
      (shipment) => shipment.status === 'Entregado',
    )

    const revenueInTransit = active.reduce(
      (sum, shipment) => sum + shipment.value,
      0,
    )

    const logisticsCost = shipments.reduce(
      (sum, shipment) => sum + shipment.cost,
      0,
    )

    const onTime =
      providers.length > 0
        ? Math.round(
            providers.reduce(
              (sum, provider) => sum + provider.onTime,
              0,
            ) / providers.length,
          )
        : 0

    const states = new Set(
      shipments.map((shipment) => shipment.state),
    )

    return {
      active: active.length,
      delivered: delivered.length,
      revenueInTransit,
      logisticsCost,
      onTime,
      states: states.size,
    }
  }, [shipments, providers])

  const mapMarkers = useMemo(() => {
    const baseMarkers = [
      {
        coordinates: haciendaCoordinates,
        label: 'Hacienda de Letras · Origen',
      },
    ]

    if (mapMode === 'coverage') {
      return [
        ...baseMarkers,
        ...Object.entries(destinationCoordinates).map(
          ([label, coordinates]) => ({
            coordinates,
            label,
          }),
        ),
      ]
    }

    if (mapMode === 'providers') {
      return [
        ...baseMarkers,
        {
          coordinates: [-103.3496, 20.6597] as [
            number,
            number,
          ],
          label: 'Hub Occidente',
        },
        {
          coordinates: [-99.1332, 19.4326] as [
            number,
            number,
          ],
          label: 'Hub Centro',
        },
        {
          coordinates: [-100.3161, 25.6866] as [
            number,
            number,
          ],
          label: 'Hub Norte',
        },
        {
          coordinates: [-101.684, 21.1214] as [
            number,
            number,
          ],
          label: 'Hub Bajío',
        },
      ]
    }

    return [
      ...baseMarkers,
      ...filteredShipments.map((shipment) => ({
        coordinates: shipment.coordinates,
        label: `${shipment.order} · ${shipment.destination}`,
      })),
    ]
  }, [mapMode, filteredShipments])

  const mapRoutes = useMemo(() => {
    if (mapMode === 'coverage') {
      return Object.values(destinationCoordinates).map(
        (coordinates) => ({
          coordinates: [
            haciendaCoordinates,
            coordinates,
          ] as [number, number][],
        }),
      )
    }

    if (mapMode === 'providers') {
      return [
        {
          coordinates: [
            haciendaCoordinates,
            [-101.684, 21.1214],
            [-103.3496, 20.6597],
          ] as [number, number][],
        },
        {
          coordinates: [
            haciendaCoordinates,
            [-100.9855, 22.1565],
            [-100.3161, 25.6866],
          ] as [number, number][],
        },
        {
          coordinates: [
            haciendaCoordinates,
            [-100.3899, 20.5888],
            [-99.1332, 19.4326],
          ] as [number, number][],
        },
      ]
    }

    if (selectedShipment) {
      return [
        {
          coordinates: selectedShipment.route,
        },
      ]
    }

    return filteredShipments.map((shipment) => ({
      coordinates: shipment.route,
    }))
  }, [mapMode, selectedShipment, filteredShipments])

  const providerShipments = shipments.filter(
    (shipment) =>
      shipment.providerId === selectedProvider.id,
  )

  const providerRevenue = providerShipments.reduce(
    (sum, shipment) => sum + shipment.value,
    0,
  )

  const providerCost = providerShipments.reduce(
    (sum, shipment) => sum + shipment.cost,
    0,
  )

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4200)
  }

  const createShipment = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const coordinates =
      destinationCoordinates[shipmentForm.destination] ??
      destinationCoordinates.Guadalajara

    const newShipment: Shipment = {
      id: `shipment-${Date.now()}`,
      order: `OC-${2060 + shipments.length}`,
      customer:
        shipmentForm.customer || 'Cliente por confirmar',
      destination: shipmentForm.destination,
      state: shipmentForm.state,
      coordinates,
      providerId: shipmentForm.providerId,
      packages: Number(shipmentForm.packages) || 0,
      bottles: Number(shipmentForm.bottles) || 0,
      value: Number(shipmentForm.value) || 0,
      cost: Number(shipmentForm.cost) || 0,
      departure: shipmentForm.departure.replace('T', ' · '),
      eta: shipmentForm.eta.replace('T', ' · '),
      status: 'Programado',
      priority: shipmentForm.priority,
      tracking:
        shipmentForm.tracking ||
        `HDL-${Date.now().toString().slice(-6)}`,
      route: [
        haciendaCoordinates,
        [
          (haciendaCoordinates[0] + coordinates[0]) / 2,
          (haciendaCoordinates[1] + coordinates[1]) / 2,
        ],
        coordinates,
      ],
    }

    setShipments((current) => [newShipment, ...current])
    setSelectedShipmentId(newShipment.id)
    setShipmentForm(emptyShipmentForm)
    setModal(null)
    setMapMode('routes')

    showToast(
      'Embarque creado, proveedor asignado y ruta publicada en el mapa operativo.',
    )
  }

  const createProvider = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const newProvider: Provider = {
      id: `provider-${Date.now()}`,
      name: providerForm.name || 'Nuevo proveedor',
      type: providerForm.type,
      initials: (providerForm.name || 'NP')
        .split(' ')
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase(),
      status: 'Disponible',
      coverage: providerForm.coverage
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      activeShipments: 0,
      onTime: 92,
      averageCost:
        Number(providerForm.averageCost) || 0,
      rating: 4.4,
      leadTime: providerForm.leadTime,
      specialty: providerForm.specialty,
    }

    setProviders((current) => [newProvider, ...current])
    setSelectedProviderId(newProvider.id)
    setProviderForm(emptyProviderForm)
    setModal(null)
    setMapMode('providers')

    showToast(
      'Proveedor agregado al catálogo logístico y disponible para asignación.',
    )
  }

  const exportLogistics = () => {
    const rows = [
      [
        'Orden',
        'Cliente',
        'Destino',
        'Estado',
        'Proveedor',
        'Cajas',
        'Botellas',
        'Valor',
        'Costo logístico',
        'Salida',
        'ETA',
        'Estado',
        'Prioridad',
        'Rastreo',
      ],
      ...shipments.map((shipment) => [
        shipment.order,
        shipment.customer,
        shipment.destination,
        shipment.state,
        getProvider(providers, shipment.providerId)?.name ??
          'Sin proveedor',
        shipment.packages,
        shipment.bottles,
        shipment.value,
        shipment.cost,
        shipment.departure,
        shipment.eta,
        shipment.status,
        shipment.priority,
        shipment.tracking,
      ]),
    ]

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'logistica-hacienda-de-letras.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="min-w-0 space-y-6"
      style={{
        fontFamily: 'Montserrat, Arial, sans-serif',
      }}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
            Distribución y cumplimiento
          </p>

          <h1 className="mt-2 text-[2.2rem] font-semibold leading-none text-[var(--color-ink)]">
            Logística
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
            Controla rutas, entregas, cobertura, proveedores y costos
            desde un solo centro operativo.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportLogistics}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:-translate-y-0.5"
          >
            <Download size={16} />
            Exportar operación
          </button>

          <button
            type="button"
            onClick={() => setModal('provider')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-burgundy)] shadow-sm transition hover:-translate-y-0.5"
          >
            <Building2 size={16} />
            Agregar proveedor
          </button>

          <button
            type="button"
            onClick={() => setModal('shipment')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_25px_rgba(79,15,31,0.18)] transition hover:-translate-y-0.5"
            style={{ color: '#ffffff' }}
          >
            <Plus size={16} color="#ffffff" />
            Nuevo embarque
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Embarques activos"
          value={formatNumber(totals.active)}
          note={`${totals.delivered} entregados en el periodo`}
          icon={Truck}
        />

        <MetricCard
          label="Entregas a tiempo"
          value={`${totals.onTime}%`}
          note="Promedio de todos los proveedores"
          icon={CheckCircle2}
        />

        <MetricCard
          label="Valor en tránsito"
          value={formatCurrency(totals.revenueInTransit)}
          note="Pedidos actualmente en operación"
          icon={PackageCheck}
          highlighted
        />

        <MetricCard
          label="Cobertura"
          value={`${totals.states} estados`}
          note="Con entrega propia o tercerizada"
          icon={Map}
        />

        <MetricCard
          label="Costo logístico"
          value={formatCurrency(totals.logisticsCost)}
          note="Costo acumulado de los embarques"
          icon={BarChart3}
        />
      </section>

      <section className="rounded-[1.15rem] border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-burgundy)] shadow-sm">
              <Sparkles size={19} />
            </span>

            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Recomendación de distribución
              </p>

              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted-strong)]">
                Mantén León y Zacatecas con flota propia por control de
                experiencia. Consolida Guadalajara y Monterrey con
                proveedor externo. La combinación reduce
                aproximadamente 12% el costo por caja sin ampliar
                unidades propias.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-[10px] font-semibold text-[var(--color-burgundy)]">
            <Target size={13} />
            Ahorro potencial: $18,600/mes
          </span>
        </div>
      </section>

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
        <article className="overflow-hidden rounded-[1.3rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 border-b border-[var(--color-line)] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
                Control geográfico
              </p>

              <h2 className="mt-2 text-[1.45rem] font-semibold text-[var(--color-ink)]">
                Rutas, cobertura y red de distribución
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 rounded-xl bg-[var(--color-panel-strong)] p-1">
              {mapModeOptions.map(({ key, label, icon: ModeIcon }) => {
                const active = mapMode === key

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMapMode(key)}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition ${
                      active
                        ? 'bg-white text-[var(--color-burgundy)] shadow-sm'
                        : 'text-[var(--color-muted)]'
                    }`}
                  >
                    <ModeIcon size={13} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="relative h-[520px] overflow-hidden">
            <MapboxScene
              center={[-101.75, 22.05]}
              zoom={5.55}
              pitch={48}
              bearing={-14}
              markers={mapMarkers}
              routes={mapRoutes}
              className="h-[520px]"
            />

            <div className="absolute left-4 top-4 max-w-[290px] rounded-[1rem] border border-white/12 bg-[rgba(18,27,34,0.88)] p-4 text-white shadow-[0_18px_38px_rgba(11,18,24,0.24)] backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#d8b578]">
                  {mapMode === 'routes' ? (
                    <Navigation size={17} />
                  ) : mapMode === 'coverage' ? (
                    <LocateFixed size={17} />
                  ) : (
                    <Warehouse size={17} />
                  )}
                </span>

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#d8b578]">
                    {mapMode === 'routes'
                      ? 'Despacho en vivo'
                      : mapMode === 'coverage'
                        ? 'Cobertura comercial'
                        : 'Red logística'}
                  </p>

                  <p className="mt-1 text-[11px] text-white/66">
                    {mapMode === 'routes'
                      ? `${totals.active} embarques en seguimiento`
                      : mapMode === 'coverage'
                        ? `${totals.states} estados con servicio`
                        : `${providers.length} proveedores disponibles`}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-[10px] text-white/58">
                <p className="flex items-center justify-between gap-3">
                  <span>Origen operativo</span>
                  <strong className="text-white">
                    Hacienda de Letras
                  </strong>
                </p>

                <p className="flex items-center justify-between gap-3">
                  <span>Entrega propia</span>
                  <strong className="text-white">
                    Bajío y región
                  </strong>
                </p>

                <p className="flex items-center justify-between gap-3">
                  <span>Tercerización</span>
                  <strong className="text-white">
                    Nacional
                  </strong>
                </p>
              </div>
            </div>

            {mapMode === 'routes' && selectedShipment ? (
              <div className="absolute bottom-4 left-4 right-4 rounded-[1rem] border border-white/12 bg-[rgba(18,27,34,0.9)] p-4 text-white shadow-[0_18px_38px_rgba(11,18,24,0.24)] backdrop-blur-md xl:left-auto xl:w-[390px]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#d8b578]">
                      Ruta seleccionada
                    </p>

                    <p className="mt-2 text-sm font-semibold text-white">
                      {selectedShipment.order} ·{' '}
                      {selectedShipment.destination}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${statusStyles(
                      selectedShipment.status,
                    )}`}
                  >
                    {selectedShipment.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-white/38">
                      Cajas
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {selectedShipment.packages}
                    </p>
                  </div>

                  <div>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-white/38">
                      Valor
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {formatCurrency(selectedShipment.value)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-white/38">
                      ETA
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-white">
                      {selectedShipment.eta}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                <ShieldCheck size={18} />
              </span>

              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  Cumplimiento logístico
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                  Nivel de servicio consolidado
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <ProgressLine
                label="Entregas a tiempo"
                value="94%"
                percent={94}
                note="Meta operativa: 92%"
              />

              <ProgressLine
                label="Integridad de pedido"
                value="98%"
                percent={98}
                note="Sin faltantes ni daño"
              />

              <ProgressLine
                label="Trazabilidad"
                value="91%"
                percent={91}
                note="Pedidos con rastreo activo"
              />

              <ProgressLine
                label="Uso de capacidad"
                value="78%"
                percent={78}
                note="Flota y proveedores"
              />
            </div>
          </article>

          <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                <CircleAlert size={18} />
              </span>

              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  Alertas operativas
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                  Señales que requieren atención
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl bg-[#fbf2e9] p-4">
                <p className="text-xs font-semibold text-[var(--color-ink)]">
                  Ruta Zacatecas con retraso
                </p>
                <p className="mt-2 text-[10px] leading-5 text-[var(--color-muted-strong)]">
                  El embarque OC-2053 requiere validación de ETA y
                  contacto con el cliente.
                </p>
              </div>

              <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
                <p className="text-xs font-semibold text-[var(--color-ink)]">
                  Capacidad limitada en Paquetexpress
                </p>
                <p className="mt-2 text-[10px] leading-5 text-[var(--color-muted-strong)]">
                  Reasigna embarques urgentes a Estafeta o Tresguerras.
                </p>
              </div>

              <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
                <p className="text-xs font-semibold text-[var(--color-ink)]">
                  Consolidación disponible
                </p>
                <p className="mt-2 text-[10px] leading-5 text-[var(--color-muted-strong)]">
                  Dos pedidos a Guadalajara pueden compartir salida y
                  reducir 18% el costo.
                </p>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
              Operación activa
            </p>

            <h2 className="mt-2 text-[1.45rem] font-semibold text-[var(--color-ink)]">
              Embarques y trazabilidad
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 sm:w-[310px]">
              <Search
                size={15}
                className="shrink-0 text-[var(--color-muted)]"
              />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Buscar orden, cliente o destino..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-muted-strong)] outline-none"
            >
              {[
                'Todos',
                'Preparando',
                'Programado',
                'En tránsito',
                'Atención',
                'Entregado',
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>

            <select
              value={providerFilter}
              onChange={(event) =>
                setProviderFilter(event.target.value)
              }
              className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-muted-strong)] outline-none"
            >
              <option value="Todos">Todos los proveedores</option>
              {providers.map((provider) => (
                <option
                  key={provider.id}
                  value={provider.id}
                >
                  {provider.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredShipments.map((shipment) => {
            const provider = getProvider(
              providers,
              shipment.providerId,
            )
            const progress = getShipmentProgress(shipment.status)

            return (
              <button
                key={shipment.id}
                type="button"
                onClick={() => {
                  setSelectedShipmentId(shipment.id)
                  setMapMode('routes')
                }}
                className="grid w-full gap-4 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 text-left transition hover:-translate-y-0.5 xl:grid-cols-[minmax(220px,1.15fr)_150px_150px_120px_160px_40px] xl:items-center"
                style={{
                  borderColor:
                    selectedShipmentId === shipment.id
                      ? 'var(--color-burgundy)'
                      : 'var(--color-line)',
                  outline: 'none',
                }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {shipment.order} · {shipment.customer}
                    </p>

                    <span
                      className={`rounded-full px-3 py-1 text-[8px] font-semibold ${priorityStyles(
                        shipment.priority,
                      )}`}
                    >
                      {shipment.priority}
                    </span>
                  </div>

                  <p className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-[var(--color-muted)]">
                    <MapPin size={11} className="shrink-0" />
                    {shipment.destination}, {shipment.state}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Proveedor
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-ink)]">
                    {provider?.name ?? 'Sin asignar'}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Carga
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-ink)]">
                    {shipment.packages} cajas · {shipment.bottles}{' '}
                    botellas
                  </p>
                </div>

                <div>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Valor
                  </p>
                  <p className="mt-1 text-xs font-bold text-[var(--color-ink)]">
                    {formatCurrency(shipment.value)}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${statusStyles(
                        shipment.status,
                      )}`}
                    >
                      {shipment.status}
                    </span>

                    <span className="text-[9px] text-[var(--color-muted)]">
                      {progress}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className="hidden text-[var(--color-muted)] xl:block"
                />
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
                Ecosistema logístico
              </p>

              <h2 className="mt-2 text-[1.45rem] font-semibold text-[var(--color-ink)]">
                Proveedores disponibles
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setModal('provider')}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-xs font-semibold text-[var(--color-burgundy)]"
            >
              <Plus size={14} />
              Agregar proveedor
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => {
                  setSelectedProviderId(provider.id)
                  setMapMode('providers')
                }}
                className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 text-left transition hover:-translate-y-0.5"
                style={{
                  borderColor:
                    selectedProviderId === provider.id
                      ? 'var(--color-burgundy)'
                      : 'var(--color-line)',
                  outline: 'none',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-[var(--color-burgundy)] shadow-sm">
                    {provider.initials}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        {provider.name}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-[8px] font-semibold ${providerStatusStyles(
                          provider.status,
                        )}`}
                      >
                        {provider.status}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">
                      {provider.type}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Puntualidad
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                      {provider.onTime}%
                    </p>
                  </div>

                  <div>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Costo prom.
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                      {formatCurrency(provider.averageCost)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Rating
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm font-bold text-[var(--color-ink)]">
                      <Star
                        size={12}
                        className="fill-[var(--color-gold)] text-[var(--color-gold)]"
                      />
                      {provider.rating}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[10px] leading-5 text-[var(--color-muted-strong)]">
                  {provider.specialty}
                </p>
              </button>
            ))}
          </div>
        </article>

        <aside className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
                Proveedor seleccionado
              </p>

              <h3 className="mt-2 text-[1.45rem] font-semibold text-[var(--color-ink)]">
                {selectedProvider.name}
              </h3>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${providerStatusStyles(
                selectedProvider.status,
              )}`}
            >
              {selectedProvider.status}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
              <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Embarques
              </p>
              <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                {providerShipments.length}
              </p>
            </div>

            <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
              <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Puntualidad
              </p>
              <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                {selectedProvider.onTime}%
              </p>
            </div>

            <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
              <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Valor movido
              </p>
              <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                {formatCurrency(providerRevenue)}
              </p>
            </div>

            <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
              <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Costo total
              </p>
              <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                {formatCurrency(providerCost)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
              <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Tiempo de entrega
              </p>
              <p className="mt-2 text-xs font-semibold text-[var(--color-ink)]">
                {selectedProvider.leadTime}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
              <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Cobertura
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedProvider.coverage.map((zone) => (
                  <span
                    key={zone}
                    className="rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold text-[var(--color-burgundy)]"
                  >
                    {zone}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShipmentForm((current) => ({
                ...current,
                providerId: selectedProvider.id,
              }))
              setModal('shipment')
            }}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold"
            style={{ color: '#ffffff' }}
          >
            Asignar nuevo embarque
            <ArrowRight size={14} color="#ffffff" />
          </button>
        </aside>
      </section>

      <section className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <Warehouse size={19} />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                La operación puede crecer sin comprar una flota completa
              </p>

              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted)]">
                Hacienda de Letras conserva entregas estratégicas con
                operación propia y asigna el resto a proveedores según
                costo, cobertura, puntualidad y tipo de pedido. El sistema
                mantiene una sola trazabilidad, aunque la entrega la realice
                un tercero.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-2 text-[10px] font-semibold text-[var(--color-burgundy)]">
            <CheckCircle2 size={13} />
            Red logística híbrida
          </span>
        </div>
      </section>

      {modal === 'shipment' ? (
        <ModalShell
          eyebrow="Planeación logística"
          title="Crear nuevo embarque"
          onClose={() => setModal(null)}
          width="max-w-5xl"
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-5 text-sm font-semibold text-[var(--color-muted-strong)]"
              >
                Cancelar
              </button>

              <button
                type="submit"
                form="shipment-form"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_24px_rgba(79,15,31,0.18)]"
                style={{ color: '#ffffff' }}
              >
                <Send size={15} color="#ffffff" />
                Crear y asignar ruta
              </button>
            </div>
          }
        >
          <form
            id="shipment-form"
            onSubmit={createShipment}
            className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(310px,0.8fr)]"
          >
            <section className="rounded-[1.1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Datos del embarque
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="Cliente"
                  value={shipmentForm.customer}
                  onChange={(value) =>
                    setShipmentForm((current) => ({
                      ...current,
                      customer: value,
                    }))
                  }
                />

                <label className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Destino
                  </span>

                  <select
                    value={shipmentForm.destination}
                    onChange={(event) => {
                      const destination = event.target.value

                      setShipmentForm((current) => ({
                        ...current,
                        destination,
                        state:
                          destinationStates[destination] ??
                          current.state,
                      }))
                    }}
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
                  >
                    {Object.keys(destinationCoordinates).map(
                      (destination) => (
                        <option
                          key={destination}
                          value={destination}
                        >
                          {destination}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <Field
                  label="Estado"
                  value={shipmentForm.state}
                  onChange={(value) =>
                    setShipmentForm((current) => ({
                      ...current,
                      state: value,
                    }))
                  }
                />

                <label className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Proveedor
                  </span>

                  <select
                    value={shipmentForm.providerId}
                    onChange={(event) =>
                      setShipmentForm((current) => ({
                        ...current,
                        providerId: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
                  >
                    {providers.map((provider) => (
                      <option
                        key={provider.id}
                        value={provider.id}
                      >
                        {provider.name} · {provider.type}
                      </option>
                    ))}
                  </select>
                </label>

                <Field
                  label="Cajas"
                  type="number"
                  min="0"
                  value={shipmentForm.packages}
                  onChange={(value) =>
                    setShipmentForm((current) => ({
                      ...current,
                      packages: value,
                    }))
                  }
                />

                <Field
                  label="Botellas"
                  type="number"
                  min="0"
                  value={shipmentForm.bottles}
                  onChange={(value) =>
                    setShipmentForm((current) => ({
                      ...current,
                      bottles: value,
                    }))
                  }
                />

                <Field
                  label="Valor del pedido"
                  type="number"
                  min="0"
                  value={shipmentForm.value}
                  onChange={(value) =>
                    setShipmentForm((current) => ({
                      ...current,
                      value,
                    }))
                  }
                />

                <Field
                  label="Costo logístico"
                  type="number"
                  min="0"
                  value={shipmentForm.cost}
                  onChange={(value) =>
                    setShipmentForm((current) => ({
                      ...current,
                      cost: value,
                    }))
                  }
                />

                <Field
                  label="Salida"
                  type="datetime-local"
                  value={shipmentForm.departure}
                  onChange={(value) =>
                    setShipmentForm((current) => ({
                      ...current,
                      departure: value,
                    }))
                  }
                />

                <Field
                  label="Entrega estimada"
                  type="datetime-local"
                  value={shipmentForm.eta}
                  onChange={(value) =>
                    setShipmentForm((current) => ({
                      ...current,
                      eta: value,
                    }))
                  }
                />

                <label className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Prioridad
                  </span>

                  <select
                    value={shipmentForm.priority}
                    onChange={(event) =>
                      setShipmentForm((current) => ({
                        ...current,
                        priority: event.target
                          .value as ShipmentPriority,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
                  >
                    <option>Normal</option>
                    <option>Alta</option>
                    <option>Crítica</option>
                  </select>
                </label>

                <Field
                  label="Número de rastreo"
                  value={shipmentForm.tracking}
                  onChange={(value) =>
                    setShipmentForm((current) => ({
                      ...current,
                      tracking: value,
                    }))
                  }
                />
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-[1.1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  Resumen de asignación
                </p>

                <div className="mt-5 space-y-3">
                  <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Proveedor
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                      {getProvider(
                        providers,
                        shipmentForm.providerId,
                      )?.name ?? 'Sin asignar'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Destino
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                      {shipmentForm.destination},{' '}
                      {shipmentForm.state}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
                      <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                        Carga
                      </p>
                      <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                        {shipmentForm.packages} cajas
                      </p>
                    </div>

                    <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
                      <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                        Costo
                      </p>
                      <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                        {formatCurrency(
                          Number(shipmentForm.cost) || 0,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.1rem] border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-5">
                <div className="flex items-start gap-3">
                  <Sparkles
                    size={17}
                    className="mt-0.5 shrink-0 text-[var(--color-burgundy)]"
                  />

                  <p className="text-[11px] leading-6 text-[var(--color-muted-strong)]">
                    El sistema conservará la misma trazabilidad aunque
                    la entrega la realice un tercero. La ruta aparecerá
                    inmediatamente en el mapa operativo.
                  </p>
                </div>
              </section>
            </aside>
          </form>
        </ModalShell>
      ) : null}

      {modal === 'provider' ? (
        <ModalShell
          eyebrow="Red logística"
          title="Agregar proveedor"
          onClose={() => setModal(null)}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-5 text-sm font-semibold text-[var(--color-muted-strong)]"
              >
                Cancelar
              </button>

              <button
                type="submit"
                form="provider-form"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_24px_rgba(79,15,31,0.18)]"
                style={{ color: '#ffffff' }}
              >
                <Check size={15} color="#ffffff" />
                Guardar proveedor
              </button>
            </div>
          }
        >
          <form
            id="provider-form"
            onSubmit={createProvider}
            className="space-y-5"
          >
            <section className="rounded-[1.1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Perfil del proveedor
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="Nombre comercial"
                  value={providerForm.name}
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                />

                <Field
                  label="Tipo de servicio"
                  value={providerForm.type}
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      type: value,
                    }))
                  }
                />

                <Field
                  label="Cobertura"
                  value={providerForm.coverage}
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      coverage: value,
                    }))
                  }
                />

                <Field
                  label="Costo promedio"
                  type="number"
                  min="0"
                  value={providerForm.averageCost}
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      averageCost: value,
                    }))
                  }
                />

                <Field
                  label="Tiempo de entrega"
                  value={providerForm.leadTime}
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      leadTime: value,
                    }))
                  }
                />

                <Field
                  label="Especialidad"
                  value={providerForm.specialty}
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      specialty: value,
                    }))
                  }
                />
              </div>
            </section>

            <div className="flex items-start gap-3 rounded-[1rem] border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-4">
              <ShieldCheck
                size={17}
                className="mt-0.5 shrink-0 text-[var(--color-burgundy)]"
              />

              <p className="text-[11px] leading-5 text-[var(--color-muted-strong)]">
                El proveedor quedará disponible para asignación. En la
                versión productiva podrán agregarse documentos, pólizas,
                tarifas por zona, SLA y evaluación histórica.
              </p>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[150] flex max-w-md items-start gap-3 rounded-[1rem] border border-[#cfddca] bg-white p-4 shadow-[0_22px_50px_rgba(45,22,14,0.18)]">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7efe6] text-[#5f7d63]">
            <Check size={16} />
          </span>

          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              Operación actualizada
            </p>

            <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
              {toast}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setToast('')}
            className="ml-auto text-[var(--color-muted)]"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
