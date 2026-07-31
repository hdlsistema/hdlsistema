import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  Ban,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Edit3,
  Eye,
  Filter,
  Lock,
  MapPin,
  Plus,
  Save,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type SlotStatus =
  | 'Disponible'
  | 'Alta demanda'
  | 'Bloqueado'
  | 'Cerrado'

type SlotItem = {
  id: string
  dayId: string
  time: string
  capacity: number
  booked: number
  status: SlotStatus
}

type ExperienceAvailability = {
  id: string
  title: string
  category: string
  image: string
  location: string
  duration: string
  defaultCapacity: number
  active: boolean
  slots: SlotItem[]
}

type BlockItem = {
  id: string
  experienceId: string
  dayId: string
  time: string
  reason: string
  note: string
  status: 'Activo' | 'Liberado'
}

type ModalType = 'slot' | 'block' | null

type SlotForm = {
  experienceId: string
  dayId: string
  time: string
  capacity: string
  booked: string
  status: SlotStatus
}

type BlockForm = {
  experienceId: string
  dayId: string
  time: string
  reason: string
  note: string
}

const weekDays = [
  {
    id: '2026-07-01',
    short: 'Mié',
    day: '01',
    month: 'Jul',
  },
  {
    id: '2026-07-02',
    short: 'Jue',
    day: '02',
    month: 'Jul',
  },
  {
    id: '2026-07-03',
    short: 'Vie',
    day: '03',
    month: 'Jul',
  },
  {
    id: '2026-07-04',
    short: 'Sáb',
    day: '04',
    month: 'Jul',
  },
  {
    id: '2026-07-05',
    short: 'Dom',
    day: '05',
    month: 'Jul',
  },
  {
    id: '2026-07-06',
    short: 'Lun',
    day: '06',
    month: 'Jul',
  },
  {
    id: '2026-07-07',
    short: 'Mar',
    day: '07',
    month: 'Jul',
  },
]

const initialExperiences: ExperienceAvailability[] = [
  {
    id: 'cata',
    title: 'Cata de vino',
    category: 'Experiencia',
    image: '/viñedo 1.webp',
    location: 'Sala de Catas',
    duration: '90 min',
    defaultCapacity: 18,
    active: true,
    slots: [
      {
        id: 'cata-01-1200',
        dayId: '2026-07-01',
        time: '12:00',
        capacity: 18,
        booked: 12,
        status: 'Disponible',
      },
      {
        id: 'cata-01-1600',
        dayId: '2026-07-01',
        time: '16:00',
        capacity: 18,
        booked: 15,
        status: 'Alta demanda',
      },
      {
        id: 'cata-02-1200',
        dayId: '2026-07-02',
        time: '12:00',
        capacity: 18,
        booked: 11,
        status: 'Disponible',
      },
      {
        id: 'cata-02-1600',
        dayId: '2026-07-02',
        time: '16:00',
        capacity: 18,
        booked: 17,
        status: 'Alta demanda',
      },
      {
        id: 'cata-03-1200',
        dayId: '2026-07-03',
        time: '12:00',
        capacity: 18,
        booked: 14,
        status: 'Disponible',
      },
      {
        id: 'cata-03-1600',
        dayId: '2026-07-03',
        time: '16:00',
        capacity: 18,
        booked: 18,
        status: 'Alta demanda',
      },
      {
        id: 'cata-04-1200',
        dayId: '2026-07-04',
        time: '12:00',
        capacity: 18,
        booked: 18,
        status: 'Alta demanda',
      },
      {
        id: 'cata-04-1600',
        dayId: '2026-07-04',
        time: '16:00',
        capacity: 18,
        booked: 18,
        status: 'Alta demanda',
      },
      {
        id: 'cata-05-1200',
        dayId: '2026-07-05',
        time: '12:00',
        capacity: 18,
        booked: 9,
        status: 'Disponible',
      },
      {
        id: 'cata-05-1600',
        dayId: '2026-07-05',
        time: '16:00',
        capacity: 18,
        booked: 10,
        status: 'Disponible',
      },
    ],
  },
  {
    id: 'recorrido',
    title: 'Recorrido por viñedos',
    category: 'Experiencia',
    image: '/turismo.jpeg',
    location: 'Viñedo Principal',
    duration: '120 min',
    defaultCapacity: 24,
    active: true,
    slots: [
      {
        id: 'rec-01-0900',
        dayId: '2026-07-01',
        time: '09:00',
        capacity: 24,
        booked: 13,
        status: 'Disponible',
      },
      {
        id: 'rec-01-1300',
        dayId: '2026-07-01',
        time: '13:00',
        capacity: 24,
        booked: 18,
        status: 'Disponible',
      },
      {
        id: 'rec-02-0900',
        dayId: '2026-07-02',
        time: '09:00',
        capacity: 24,
        booked: 16,
        status: 'Disponible',
      },
      {
        id: 'rec-02-1300',
        dayId: '2026-07-02',
        time: '13:00',
        capacity: 24,
        booked: 21,
        status: 'Alta demanda',
      },
      {
        id: 'rec-03-0900',
        dayId: '2026-07-03',
        time: '09:00',
        capacity: 24,
        booked: 19,
        status: 'Disponible',
      },
      {
        id: 'rec-04-0900',
        dayId: '2026-07-04',
        time: '09:00',
        capacity: 24,
        booked: 24,
        status: 'Alta demanda',
      },
      {
        id: 'rec-04-1300',
        dayId: '2026-07-04',
        time: '13:00',
        capacity: 24,
        booked: 22,
        status: 'Alta demanda',
      },
      {
        id: 'rec-05-0900',
        dayId: '2026-07-05',
        time: '09:00',
        capacity: 24,
        booked: 8,
        status: 'Disponible',
      },
      {
        id: 'rec-05-1300',
        dayId: '2026-07-05',
        time: '13:00',
        capacity: 24,
        booked: 0,
        status: 'Bloqueado',
      },
    ],
  },
  {
    id: 'cena',
    title: 'Cena romántica',
    category: 'Gastronomía',
    image: '/romantic dinners evento.webp',
    location: 'Terraza Principal',
    duration: '150 min',
    defaultCapacity: 12,
    active: true,
    slots: [
      {
        id: 'cena-01-1900',
        dayId: '2026-07-01',
        time: '19:00',
        capacity: 12,
        booked: 8,
        status: 'Disponible',
      },
      {
        id: 'cena-02-1900',
        dayId: '2026-07-02',
        time: '19:00',
        capacity: 12,
        booked: 10,
        status: 'Alta demanda',
      },
      {
        id: 'cena-03-1900',
        dayId: '2026-07-03',
        time: '19:00',
        capacity: 12,
        booked: 12,
        status: 'Alta demanda',
      },
      {
        id: 'cena-04-1900',
        dayId: '2026-07-04',
        time: '19:00',
        capacity: 12,
        booked: 12,
        status: 'Alta demanda',
      },
      {
        id: 'cena-05-1900',
        dayId: '2026-07-05',
        time: '19:00',
        capacity: 12,
        booked: 7,
        status: 'Disponible',
      },
    ],
  },
  {
    id: 'picnic',
    title: 'Picnic entre viñedos',
    category: 'Experiencia',
    image: '/Picnic evento.webp',
    location: 'Jardín del Viñedo',
    duration: '120 min',
    defaultCapacity: 16,
    active: true,
    slots: [
      {
        id: 'picnic-01-1100',
        dayId: '2026-07-01',
        time: '11:00',
        capacity: 16,
        booked: 7,
        status: 'Disponible',
      },
      {
        id: 'picnic-01-1500',
        dayId: '2026-07-01',
        time: '15:00',
        capacity: 16,
        booked: 10,
        status: 'Disponible',
      },
      {
        id: 'picnic-02-1100',
        dayId: '2026-07-02',
        time: '11:00',
        capacity: 16,
        booked: 6,
        status: 'Disponible',
      },
      {
        id: 'picnic-03-1100',
        dayId: '2026-07-03',
        time: '11:00',
        capacity: 16,
        booked: 11,
        status: 'Disponible',
      },
      {
        id: 'picnic-04-1100',
        dayId: '2026-07-04',
        time: '11:00',
        capacity: 16,
        booked: 15,
        status: 'Alta demanda',
      },
      {
        id: 'picnic-04-1500',
        dayId: '2026-07-04',
        time: '15:00',
        capacity: 16,
        booked: 16,
        status: 'Alta demanda',
      },
      {
        id: 'picnic-05-1100',
        dayId: '2026-07-05',
        time: '11:00',
        capacity: 16,
        booked: 9,
        status: 'Disponible',
      },
    ],
  },
]

const initialBlocks: BlockItem[] = [
  {
    id: 'block-1',
    experienceId: 'recorrido',
    dayId: '2026-07-05',
    time: '13:00',
    reason: 'Mantenimiento',
    note: 'Revisión del sendero y señalética.',
    status: 'Activo',
  },
  {
    id: 'block-2',
    experienceId: 'cata',
    dayId: '2026-07-03',
    time: '12:00',
    reason: 'Grupo privado',
    note: 'Horario reservado para evento corporativo.',
    status: 'Activo',
  },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-MX').format(value)
}

function getDayShort(short: string, isEnglish: boolean): string {
  if (!isEnglish) return short
  const map: Record<string, string> = {
    'Mié': 'Wed', 'Jue': 'Thu', 'Vie': 'Fri',
    'Sáb': 'Sat', 'Dom': 'Sun', 'Lun': 'Mon', 'Mar': 'Tue',
  }
  return map[short] ?? short
}

function getStatusLabel(status: SlotStatus, isEnglish: boolean): string {
  if (!isEnglish) return status
  const labels: Record<SlotStatus, string> = {
    'Disponible': 'Available',
    'Alta demanda': 'High demand',
    'Bloqueado': 'Blocked',
    'Cerrado': 'Closed',
  }
  return labels[status]
}

function getSlotOccupancy(slot: SlotItem) {
  if (slot.capacity <= 0) {
    return 0
  }

  return Math.min(Math.round((slot.booked / slot.capacity) * 100), 100)
}

function getStatusStyles(status: SlotStatus) {
  const styles: Record<SlotStatus, string> = {
    Disponible:
      'border-[#d7e2d4] bg-[#edf4eb] text-[#5f7d63]',
    'Alta demanda':
      'border-[#ead8c5] bg-[#f8eee2] text-[#9a632e]',
    Bloqueado:
      'border-[#e2d5da] bg-[#f1e8eb] text-[#7b3950]',
    Cerrado:
      'border-[#ded9d3] bg-[#eeebe7] text-[#736a63]',
  }

  return styles[status]
}

function getExperienceMetrics(experience: ExperienceAvailability) {
  const openSlots = experience.slots.filter(
    (slot) =>
      slot.status === 'Disponible' ||
      slot.status === 'Alta demanda',
  )

  const capacity = openSlots.reduce(
    (sum, slot) => sum + slot.capacity,
    0,
  )

  const booked = openSlots.reduce(
    (sum, slot) => sum + slot.booked,
    0,
  )

  const occupancy =
    capacity > 0 ? Math.round((booked / capacity) * 100) : 0

  return {
    openSlots: openSlots.length,
    capacity,
    booked,
    available: Math.max(capacity - booked, 0),
    occupancy,
  }
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
          ? 'border-[rgba(104,17,38,0.17)] bg-[linear-gradient(145deg,#681126,#3b0816)]'
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
                ? 'text-white/64'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {label}
          </p>

          <p
            className={`mt-3 text-[2rem] leading-none ${
              highlighted
                ? 'text-white'
                : 'text-[var(--color-ink)]'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {value}
          </p>
        </div>

        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            highlighted
              ? 'bg-white/10 text-[#e5c58f]'
              : 'bg-[var(--color-soft)] text-[var(--color-burgundy)]'
          }`}
        >
          <Icon size={18} />
        </span>
      </div>

      <p
        className={`relative mt-4 truncate text-[11px] ${
          highlighted
            ? 'text-white/55'
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
}: {
  title: string
  eyebrow: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
}) {
  const { isEnglish } = useAppPreferences()
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label={isEnglish ? 'Close' : 'Cerrar'}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative z-10 max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-page)] shadow-[0_35px_90px_rgba(29,5,12,0.38)]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--color-line)] bg-[var(--color-page)] px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
              {eyebrow}
            </p>

            <h2
              className="mt-2 text-[1.8rem] leading-none text-[var(--color-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
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

        <div className="sticky bottom-0 border-t border-[var(--color-line)] bg-[var(--color-page)] px-6 py-4">
          {footer}
        </div>
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

export function AvailabilityPage() {
  const { isEnglish } = useAppPreferences()
  const [experiences, setExperiences] =
    useState<ExperienceAvailability[]>(initialExperiences)
  const [blocks, setBlocks] = useState<BlockItem[]>(initialBlocks)
  const [selectedExperienceId, setSelectedExperienceId] =
    useState(initialExperiences[0].id)
  const [selectedDayId, setSelectedDayId] = useState(
    weekDays[0].id,
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [modal, setModal] = useState<ModalType>(null)
  const [editingSlotId, setEditingSlotId] = useState<string | null>(
    null,
  )
  const [toast, setToast] = useState('')

  const selectedExperience =
    experiences.find(
      (experience) => experience.id === selectedExperienceId,
    ) ?? experiences[0]

  const [slotForm, setSlotForm] = useState<SlotForm>({
    experienceId: initialExperiences[0].id,
    dayId: weekDays[0].id,
    time: '12:00',
    capacity: String(initialExperiences[0].defaultCapacity),
    booked: '0',
    status: 'Disponible',
  })

  const [blockForm, setBlockForm] = useState<BlockForm>({
    experienceId: initialExperiences[0].id,
    dayId: weekDays[0].id,
    time: 'Todo el día',
    reason: 'Mantenimiento',
    note: '',
  })

  const filteredExperiences = useMemo(() => {
    const query = searchTerm.toLocaleLowerCase('es-MX').trim()

    if (!query) {
      return experiences
    }

    return experiences.filter((experience) =>
      [
        experience.title,
        experience.category,
        experience.location,
      ]
        .join(' ')
        .toLocaleLowerCase('es-MX')
        .includes(query),
    )
  }, [experiences, searchTerm])

  const globalMetrics = useMemo(() => {
    const openSlots = experiences.flatMap((experience) =>
      experience.slots.filter(
        (slot) =>
          slot.status === 'Disponible' ||
          slot.status === 'Alta demanda',
      ),
    )

    const capacity = openSlots.reduce(
      (sum, slot) => sum + slot.capacity,
      0,
    )

    const booked = openSlots.reduce(
      (sum, slot) => sum + slot.booked,
      0,
    )

    const activeBlocks = blocks.filter(
      (block) => block.status === 'Activo',
    ).length

    return {
      openSlots: openSlots.length,
      capacity,
      booked,
      available: Math.max(capacity - booked, 0),
      occupancy:
        capacity > 0 ? Math.round((booked / capacity) * 100) : 0,
      activeBlocks,
    }
  }, [experiences, blocks])

  const selectedMetrics = getExperienceMetrics(selectedExperience)

  const selectedDaySlots = selectedExperience.slots.filter(
    (slot) => slot.dayId === selectedDayId,
  )

  const activeBlocks = blocks.filter(
    (block) => block.status === 'Activo',
  )

  const openNewSlotModal = () => {
    setEditingSlotId(null)
    setSlotForm({
      experienceId: selectedExperience.id,
      dayId: selectedDayId,
      time: '12:00',
      capacity: String(selectedExperience.defaultCapacity),
      booked: '0',
      status: 'Disponible',
    })
    setModal('slot')
  }

  const openEditSlotModal = (slot: SlotItem) => {
    setEditingSlotId(slot.id)
    setSlotForm({
      experienceId: selectedExperience.id,
      dayId: slot.dayId,
      time: slot.time,
      capacity: String(slot.capacity),
      booked: String(slot.booked),
      status: slot.status,
    })
    setModal('slot')
  }

  const openBlockModal = () => {
    setBlockForm({
      experienceId: selectedExperience.id,
      dayId: selectedDayId,
      time: 'Todo el día',
      reason: 'Mantenimiento',
      note: '',
    })
    setModal('block')
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4200)
  }

  const saveSlot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const capacity = Math.max(Number(slotForm.capacity) || 0, 0)
    const booked = Math.max(
      Math.min(Number(slotForm.booked) || 0, capacity),
      0,
    )

    setExperiences((current) =>
      current.map((experience) => {
        if (experience.id !== slotForm.experienceId) {
          return experience
        }

        if (editingSlotId) {
          return {
            ...experience,
            slots: experience.slots.map((slot) =>
              slot.id === editingSlotId
                ? {
                    ...slot,
                    dayId: slotForm.dayId,
                    time: slotForm.time,
                    capacity,
                    booked,
                    status: slotForm.status,
                  }
                : slot,
            ),
          }
        }

        return {
          ...experience,
          slots: [
            ...experience.slots,
            {
              id: `slot-${Date.now()}`,
              dayId: slotForm.dayId,
              time: slotForm.time,
              capacity,
              booked,
              status: slotForm.status,
            },
          ],
        }
      }),
    )

    setSelectedExperienceId(slotForm.experienceId)
    setSelectedDayId(slotForm.dayId)
    setModal(null)

    showToast(
      editingSlotId
        ? (isEnglish ? 'Schedule updated. App availability has been synced.' : 'Horario actualizado. La disponibilidad de la app fue sincronizada.')
        : (isEnglish ? 'New schedule created and visible in the app availability.' : 'Nuevo horario creado y visible en la disponibilidad de la app.'),
    )
  }

  const saveBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const newBlock: BlockItem = {
      id: `block-${Date.now()}`,
      experienceId: blockForm.experienceId,
      dayId: blockForm.dayId,
      time: blockForm.time,
      reason: blockForm.reason,
      note: blockForm.note,
      status: 'Activo',
    }

    setBlocks((current) => [newBlock, ...current])

    setExperiences((current) =>
      current.map((experience) => {
        if (experience.id !== blockForm.experienceId) {
          return experience
        }

        return {
          ...experience,
          slots: experience.slots.map((slot) => {
            const matchesDay = slot.dayId === blockForm.dayId
            const matchesTime =
              blockForm.time === 'Todo el día' ||
              slot.time === blockForm.time

            if (matchesDay && matchesTime) {
              return {
                ...slot,
                status: 'Bloqueado',
              }
            }

            return slot
          }),
        }
      }),
    )

    setSelectedExperienceId(blockForm.experienceId)
    setSelectedDayId(blockForm.dayId)
    setModal(null)

    showToast(
      isEnglish
        ? 'Block applied. The schedule is no longer shown as available in the app.'
        : 'Bloqueo aplicado. El horario dejó de mostrarse como disponible en la app.',
    )
  }

  const releaseBlock = (block: BlockItem) => {
    setBlocks((current) =>
      current.map((item) =>
        item.id === block.id
          ? {
              ...item,
              status: 'Liberado',
            }
          : item,
      ),
    )

    setExperiences((current) =>
      current.map((experience) => {
        if (experience.id !== block.experienceId) {
          return experience
        }

        return {
          ...experience,
          slots: experience.slots.map((slot) => {
            const matchesDay = slot.dayId === block.dayId
            const matchesTime =
              block.time === 'Todo el día' ||
              slot.time === block.time

            if (
              matchesDay &&
              matchesTime &&
              slot.status === 'Bloqueado'
            ) {
              return {
                ...slot,
                status: 'Disponible',
              }
            }

            return slot
          }),
        }
      }),
    )

    showToast(
      isEnglish
        ? 'Block released. Availability is published again in the app.'
        : 'Bloqueo liberado. La disponibilidad volvió a publicarse en la app.',
    )
  }

  const exportAvailability = () => {
    const rows = [
      isEnglish
        ? ['Experience', 'Date', 'Time', 'Capacity', 'Booked', 'Available', 'Occupancy', 'Status']
        : ['Experiencia', 'Fecha', 'Hora', 'Capacidad', 'Reservados', 'Disponibles', 'Ocupación', 'Estado'],
      ...experiences.flatMap((experience) =>
        experience.slots.map((slot) => [
          experience.title,
          slot.dayId,
          slot.time,
          slot.capacity,
          slot.booked,
          Math.max(slot.capacity - slot.booked, 0),
          `${getSlotOccupancy(slot)}%`,
          slot.status,
        ]),
      ),
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
    link.download = 'disponibilidad-hacienda-de-letras.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="min-w-0 space-y-6"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow={isEnglish ? 'Slot management in the app' : 'Control de cupos en la app'}
          title={isEnglish ? 'Availability' : 'Disponibilidad'}
          subtitle={isEnglish ? 'Manage schedules, capacities and blocks that customers can book from the app.' : 'Administra horarios, cupos y bloqueos que el cliente puede reservar desde la app.'}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportAvailability}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:-translate-y-0.5"
          >
            <Download size={16} />
            {isEnglish ? 'Export' : 'Exportar'}
          </button>

          <button
            type="button"
            onClick={openBlockModal}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-burgundy)] shadow-sm transition hover:-translate-y-0.5"
          >
            <Ban size={16} />
            {isEnglish ? 'Create block' : 'Crear bloqueo'}
          </button>

          <button
            type="button"
            onClick={openNewSlotModal}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_25px_rgba(79,15,31,0.18)] transition hover:-translate-y-0.5"
            style={{ color: '#ffffff' }}
          >
            <Plus size={16} color="#ffffff" />
            {isEnglish ? 'New schedule' : 'Nuevo horario'}
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={isEnglish ? 'Open schedules' : 'Horarios abiertos'}
          value={formatNumber(globalMetrics.openSlots)}
          note={isEnglish ? 'Currently published in the app' : 'Publicados actualmente en la app'}
          icon={Clock3}
        />

        <MetricCard
          label={isEnglish ? 'Available spots' : 'Cupos disponibles'}
          value={formatNumber(globalMetrics.available)}
          note={isEnglish ? `${formatNumber(globalMetrics.booked)} spots booked` : `${formatNumber(globalMetrics.booked)} lugares reservados`}
          icon={Users}
        />

        <MetricCard
          label={isEnglish ? 'Average occupancy' : 'Ocupación promedio'}
          value={`${globalMetrics.occupancy}%`}
          note={isEnglish ? 'Consolidated weekly availability' : 'Disponibilidad consolidada de la semana'}
          icon={TrendingUp}
          highlighted
        />

        <MetricCard
          label={isEnglish ? 'Active blocks' : 'Bloqueos activos'}
          value={formatNumber(globalMetrics.activeBlocks)}
          note={isEnglish ? 'Maintenance, private groups and adjustments' : 'Mantenimiento, grupos privados y ajustes'}
          icon={Lock}
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
                {isEnglish ? 'Availability insights' : 'Lectura de disponibilidad'}
              </p>

              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted-strong)]">
                {isEnglish
                  ? 'Saturday concentrates the highest demand. Wine tastings and dinners are near capacity, while Sunday tours still have space. Opening an additional time slot is advisable before increasing promotion.'
                  : 'El sábado concentra la mayor demanda. Catas y cenas están cerca del límite, mientras que recorridos del domingo aún tienen espacio. Conviene abrir un horario adicional antes de aumentar promoción.'}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-[10px] font-semibold text-[var(--color-burgundy)]">
            <BellRing size={13} />
            Cambios sincronizados con la app
          </span>
        </div>
      </section>

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <Filter size={17} />
            </span>

            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'Experiences' : 'Experiencias'}
              </p>
              <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                {isEnglish ? 'Select to manage' : 'Selecciona para administrar'}
              </p>
            </div>
          </div>

          <label className="mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
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
              placeholder={isEnglish ? 'Search experience...' : 'Buscar experiencia...'}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none"
            />
          </label>

          <div className="mt-4 space-y-3">
            {filteredExperiences.map((experience) => {
              const metrics = getExperienceMetrics(experience)
              const selected =
                selectedExperienceId === experience.id

              return (
                <button
                  key={experience.id}
                  type="button"
                  onClick={() =>
                    setSelectedExperienceId(experience.id)
                  }
                  className="w-full overflow-hidden rounded-[1rem] border text-left transition hover:-translate-y-0.5"
                  style={{
                    borderColor: selected
                      ? 'var(--color-burgundy)'
                      : 'var(--color-line)',
                    backgroundColor: selected
                      ? 'rgba(104,17,38,0.04)'
                      : 'var(--color-panel-strong)',
                    outline: 'none',
                    boxShadow: selected
                      ? '0 12px 24px rgba(79,15,31,0.09)'
                      : 'none',
                  }}
                >
                  <div className="grid grid-cols-[78px_minmax(0,1fr)]">
                    <img
                      src={encodeURI(experience.image)}
                      alt={experience.title}
                      className="h-full min-h-[96px] w-full object-cover"
                      onError={(imageEvent) => {
                        imageEvent.currentTarget.src =
                          '/Hacienda-de-Letras hacienda.jpg'
                      }}
                    />

                    <div className="min-w-0 p-3">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        {experience.title}
                      </p>

                      <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">
                        {metrics.openSlots} {isEnglish ? 'schedules' : 'horarios'} ·{' '}
                        {metrics.available} {isEnglish ? 'spots' : 'lugares'}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-[10px] text-[var(--color-muted)]">
                          {isEnglish ? 'Occupancy' : 'Ocupación'}
                        </span>

                        <span className="text-xs font-bold text-[var(--color-burgundy)]">
                          {metrics.occupancy}%
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                          style={{
                            width: `${metrics.occupancy}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <article className="overflow-hidden rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
            <div className="grid gap-0 xl:grid-cols-[270px_minmax(0,1fr)]">
              <div className="relative min-h-[220px] overflow-hidden">
                <img
                  src={encodeURI(selectedExperience.image)}
                  alt={selectedExperience.title}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(imageEvent) => {
                    imageEvent.currentTarget.src =
                      '/Hacienda-de-Letras hacienda.jpg'
                  }}
                />

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(31,8,13,0.02),rgba(31,8,13,0.64))]" />

                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#e5c58f]">
                    {selectedExperience.category}
                  </p>

                  <h2
                    className="mt-2 text-[1.7rem] leading-tight text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {selectedExperience.title}
                  </h2>
                </div>
              </div>

              <div className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                      <MapPin size={14} />
                      {selectedExperience.location}
                    </p>

                    <p className="mt-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                      <Clock3 size={14} />
                      {selectedExperience.duration}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openNewSlotModal}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-xs font-semibold text-[var(--color-burgundy)]"
                  >
                    <Plus size={14} />
                    {isEnglish ? 'Add schedule' : 'Agregar horario'}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {[
                    [
                      isEnglish ? 'Schedules' : 'Horarios',
                      String(selectedMetrics.openSlots),
                    ],
                    [
                      isEnglish ? 'Capacity' : 'Capacidad',
                      String(selectedMetrics.capacity),
                    ],
                    [
                      isEnglish ? 'Booked' : 'Reservados',
                      String(selectedMetrics.booked),
                    ],
                    [
                      isEnglish ? 'Available' : 'Disponibles',
                      String(selectedMetrics.available),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-[var(--color-panel-strong)] p-4"
                    >
                      <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                        {label}
                      </p>

                      <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                      {isEnglish ? 'Weekly occupancy' : 'Ocupación semanal'}
                    </p>

                    <span className="text-xs font-bold text-[var(--color-burgundy)]">
                      {selectedMetrics.occupancy}%
                    </span>
                  </div>

                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--color-soft)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                      style={{
                        width: `${selectedMetrics.occupancy}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
                  {isEnglish ? 'Operational week' : 'Semana operativa'}
                </p>

                <h3
                  className="mt-2 text-[1.5rem] text-[var(--color-ink)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {isEnglish ? 'July 1–7, 2026' : '1 al 7 de julio de 2026'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] text-[var(--color-muted)]"
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] text-[var(--color-muted)]"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {weekDays.map((day) => {
                const daySlots = selectedExperience.slots.filter(
                  (slot) => slot.dayId === day.id,
                )
                const dayCapacity = daySlots.reduce(
                  (sum, slot) =>
                    slot.status === 'Bloqueado' ||
                    slot.status === 'Cerrado'
                      ? sum
                      : sum + slot.capacity,
                  0,
                )
                const dayBooked = daySlots.reduce(
                  (sum, slot) =>
                    slot.status === 'Bloqueado' ||
                    slot.status === 'Cerrado'
                      ? sum
                      : sum + slot.booked,
                  0,
                )
                const dayOccupancy =
                  dayCapacity > 0
                    ? Math.round(
                        (dayBooked / dayCapacity) * 100,
                      )
                    : 0
                const selected = selectedDayId === day.id

                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setSelectedDayId(day.id)}
                    className="rounded-[1rem] border p-3 text-left transition hover:-translate-y-0.5"
                    style={{
                      borderColor: selected
                        ? 'var(--color-burgundy)'
                        : 'var(--color-line)',
                      backgroundColor: selected
                        ? 'rgba(104,17,38,0.045)'
                        : 'var(--color-panel-strong)',
                      outline: 'none',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                        {getDayShort(day.short, isEnglish)}
                      </span>

                      <span className="text-[9px] text-[var(--color-muted)]">
                        {day.month}
                      </span>
                    </div>

                    <p
                      className="mt-2 text-[1.7rem] leading-none text-[var(--color-ink)]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {day.day}
                    </p>

                    <p className="mt-3 text-[10px] text-[var(--color-muted)]">
                      {daySlots.length} {isEnglish ? 'schedules' : 'horarios'}
                    </p>

                    <p className="mt-1 text-xs font-bold text-[var(--color-burgundy)]">
                      {dayOccupancy}%
                    </p>
                  </button>
                )
              })}
            </div>
          </article>

          <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
                  {isEnglish ? 'Day schedules' : 'Horarios del día'}
                </p>

                <h3
                  className="mt-2 text-[1.45rem] text-[var(--color-ink)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {selectedExperience.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={openNewSlotModal}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold"
                style={{ color: '#ffffff' }}
              >
                <Plus size={14} color="#ffffff" />
                {isEnglish ? 'New schedule' : 'Nuevo horario'}
              </button>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {selectedDaySlots.map((slot) => {
                const occupancy = getSlotOccupancy(slot)
                const available = Math.max(
                  slot.capacity - slot.booked,
                  0,
                )

                return (
                  <article
                    key={slot.id}
                    className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="flex items-center gap-2 text-lg font-bold text-[var(--color-ink)]">
                          <Clock3
                            size={16}
                            className="text-[var(--color-burgundy)]"
                          />
                          {slot.time}
                        </p>

                        <p className="mt-2 text-[10px] text-[var(--color-muted)]">
                          {available} {isEnglish ? 'spots available' : 'lugares disponibles'}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold ${getStatusStyles(
                          slot.status,
                        )}`}
                      >
                        {getStatusLabel(slot.status, isEnglish)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                          {isEnglish ? 'Capacity' : 'Capacidad'}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                          {slot.capacity}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                          {isEnglish ? 'Booked' : 'Reservados'}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                          {slot.booked}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                          {isEnglish ? 'Occupancy' : 'Ocupación'}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[var(--color-burgundy)]">
                          {occupancy}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => openEditSlotModal(slot)}
                        className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 text-[10px] font-semibold text-[var(--color-burgundy)]"
                      >
                        <Edit3 size={13} />
                        {isEnglish ? 'Edit' : 'Editar'}
                      </button>
                    </div>
                  </article>
                )
              })}

              {selectedDaySlots.length === 0 ? (
                <div className="col-span-full rounded-[1rem] border border-dashed border-[var(--color-line)] bg-[var(--color-panel-strong)] px-6 py-10 text-center">
                  <CalendarDays
                    size={24}
                    className="mx-auto text-[var(--color-muted)]"
                  />

                  <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
                    {isEnglish ? 'No schedules published for this day.' : 'No hay horarios publicados para este día.'}
                  </p>

                  <button
                    type="button"
                    onClick={openNewSlotModal}
                    className="mt-3 text-xs font-semibold text-[var(--color-burgundy)]"
                  >
                    {isEnglish ? 'Create the first schedule' : 'Crear el primer horario'}
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
                Reglas y excepciones
              </p>

              <h3
                className="mt-2 text-[1.45rem] text-[var(--color-ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Bloqueos activos
              </h3>
            </div>

            <button
              type="button"
              onClick={openBlockModal}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-xs font-semibold text-[var(--color-burgundy)]"
            >
              <Ban size={14} />
              {isEnglish ? 'Create block' : 'Crear bloqueo'}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {activeBlocks.map((block) => {
              const experience = experiences.find(
                (item) => item.id === block.experienceId,
              )
              const day = weekDays.find(
                (item) => item.id === block.dayId,
              )

              return (
                <article
                  key={block.id}
                  className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0e6e9] text-[var(--color-burgundy)]">
                        <Lock size={16} />
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                          {experience?.title ?? (isEnglish ? 'Experience' : 'Experiencia')}
                        </p>

                        <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                          {getDayShort(day?.short ?? '', isEnglish)} {day?.day} {day?.month} ·{' '}
                          {block.time}
                        </p>

                        <p className="mt-3 text-xs font-semibold text-[var(--color-muted-strong)]">
                          {block.reason}
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
                          {block.note || (isEnglish ? 'No additional note.' : 'Sin nota adicional.')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => releaseBlock(block)}
                      className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 text-[10px] font-semibold text-[#5f7d63]"
                    >
                      <CheckCircle2 size={13} />
                      {isEnglish ? 'Release' : 'Liberar'}
                    </button>
                  </div>
                </article>
              )
            })}

            {activeBlocks.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-[var(--color-line)] bg-[var(--color-panel-strong)] px-6 py-9 text-center">
                <CheckCircle2
                  size={22}
                  className="mx-auto text-[#5f7d63]"
                />
                <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">
                  {isEnglish ? 'No active blocks.' : 'No hay bloqueos activos.'}
                </p>
              </div>
            ) : null}
          </div>
        </article>

        <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <Eye size={18} />
            </span>

            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'What the customer sees' : 'Lo que ve el cliente'}
              </p>

              <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                {isEnglish ? 'Published availability summary' : 'Resumen de disponibilidad publicada'}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1rem] border border-[var(--color-line)] bg-white">
            <img
              src={encodeURI(selectedExperience.image)}
              alt={selectedExperience.title}
              className="h-40 w-full object-cover"
              onError={(imageEvent) => {
                imageEvent.currentTarget.src =
                  '/Hacienda-de-Letras hacienda.jpg'
              }}
            />

            <div className="p-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">
                {isEnglish ? 'Book your experience' : 'Reserva tu experiencia'}
              </p>

              <h4
                className="mt-2 text-[1.45rem] text-[var(--color-burgundy)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {selectedExperience.title}
              </h4>

              <p className="mt-2 text-xs text-[var(--color-muted)]">
                {selectedExperience.location} ·{' '}
                {selectedExperience.duration}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedDaySlots
                  .filter(
                    (slot) =>
                      slot.status === 'Disponible' ||
                      slot.status === 'Alta demanda',
                  )
                  .map((slot) => (
                    <span
                      key={slot.id}
                      className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 py-2 text-[10px] font-semibold text-[var(--color-burgundy)]"
                    >
                      {slot.time} ·{' '}
                      {Math.max(
                        slot.capacity - slot.booked,
                        0,
                      )}{' '}
                      {isEnglish ? 'spots' : 'lugares'}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#fbf6ee] p-4">
            <CircleAlert
              size={16}
              className="mt-0.5 shrink-0 text-[var(--color-gold)]"
            />

            <p className="text-[11px] leading-5 text-[var(--color-muted-strong)]">
              {isEnglish
                ? 'Blocked or closed time slots do not appear in the app. Every adjustment made here updates the availability that customers can book.'
                : 'Los horarios bloqueados o cerrados no aparecen en la app. Cada ajuste realizado aquí actualiza la disponibilidad que puede reservar el cliente.'}
            </p>
          </div>
        </article>
      </section>

      {modal === 'slot' ? (
        <ModalShell
          eyebrow={
            editingSlotId
              ? (isEnglish ? 'Availability edit' : 'Edición de disponibilidad')
              : (isEnglish ? 'New availability' : 'Nueva disponibilidad')
          }
          title={
            editingSlotId
              ? (isEnglish ? 'Edit schedule' : 'Editar horario')
              : (isEnglish ? 'Create schedule' : 'Crear horario')
          }
          onClose={() => setModal(null)}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-5 text-sm font-semibold text-[var(--color-muted-strong)]"
              >
                {isEnglish ? 'Cancel' : 'Cancelar'}
              </button>

              <button
                type="submit"
                form="slot-form"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_24px_rgba(79,15,31,0.18)]"
                style={{ color: '#ffffff' }}
              >
                <Save size={15} color="#ffffff" />
                {isEnglish ? 'Save and publish' : 'Guardar y publicar'}
              </button>
            </div>
          }
        >
          <form
            id="slot-form"
            onSubmit={saveSlot}
            className="space-y-5"
          >
            <section className="rounded-[1.1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'Schedule configuration' : 'Configuración del horario'}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Experience' : 'Experiencia'}
                  </span>

                  <select
                    value={slotForm.experienceId}
                    onChange={(event) => {
                      const experience = experiences.find(
                        (item) => item.id === event.target.value,
                      )

                      setSlotForm((current) => ({
                        ...current,
                        experienceId: event.target.value,
                        capacity: String(
                          experience?.defaultCapacity ??
                            current.capacity,
                        ),
                      }))
                    }}
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
                  >
                    {experiences.map((experience) => (
                      <option
                        key={experience.id}
                        value={experience.id}
                      >
                        {experience.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Date' : 'Fecha'}
                  </span>

                  <select
                    value={slotForm.dayId}
                    onChange={(event) =>
                      setSlotForm((current) => ({
                        ...current,
                        dayId: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
                  >
                    {weekDays.map((day) => (
                      <option key={day.id} value={day.id}>
                        {getDayShort(day.short, isEnglish)} {day.day} {day.month}
                      </option>
                    ))}
                  </select>
                </label>

                <Field
                  label={isEnglish ? 'Time' : 'Hora'}
                  type="time"
                  value={slotForm.time}
                  onChange={(value) =>
                    setSlotForm((current) => ({
                      ...current,
                      time: value,
                    }))
                  }
                />

                <label className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Status' : 'Estado'}
                  </span>

                  <select
                    value={slotForm.status}
                    onChange={(event) =>
                      setSlotForm((current) => ({
                        ...current,
                        status: event.target.value as SlotStatus,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
                  >
                    {([
                      'Disponible',
                      'Alta demanda',
                      'Bloqueado',
                      'Cerrado',
                    ] as SlotStatus[]).map((status) => (
                      <option key={status} value={status}>{getStatusLabel(status, isEnglish)}</option>
                    ))}
                  </select>
                </label>

                <Field
                  label={isEnglish ? 'Capacity' : 'Capacidad'}
                  type="number"
                  min="0"
                  value={slotForm.capacity}
                  onChange={(value) =>
                    setSlotForm((current) => ({
                      ...current,
                      capacity: value,
                    }))
                  }
                />

                <Field
                  label={isEnglish ? 'Booked spots' : 'Lugares reservados'}
                  type="number"
                  min="0"
                  value={slotForm.booked}
                  onChange={(value) =>
                    setSlotForm((current) => ({
                      ...current,
                      booked: value,
                    }))
                  }
                />
              </div>
            </section>

            <div className="flex items-start gap-3 rounded-[1rem] border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-4">
              <Sparkles
                size={17}
                className="mt-0.5 shrink-0 text-[var(--color-burgundy)]"
              />

              <p className="text-[11px] leading-5 text-[var(--color-muted-strong)]">
                {isEnglish
                  ? 'Once saved, the schedule will be available in the app preview. Blocked and closed statuses will hide it from new bookings.'
                  : 'Al guardar, el horario quedará disponible en la maqueta de la app. Los estados bloqueado y cerrado lo ocultarán para nuevas reservaciones.'}
              </p>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modal === 'block' ? (
        <ModalShell
          eyebrow={isEnglish ? 'Rules and exceptions' : 'Reglas y excepciones'}
          title={isEnglish ? 'Create block' : 'Crear bloqueo'}
          onClose={() => setModal(null)}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-5 text-sm font-semibold text-[var(--color-muted-strong)]"
              >
                {isEnglish ? 'Cancel' : 'Cancelar'}
              </button>

              <button
                type="submit"
                form="block-form"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_24px_rgba(79,15,31,0.18)]"
                style={{ color: '#ffffff' }}
              >
                <Lock size={15} color="#ffffff" />
                {isEnglish ? 'Apply block' : 'Aplicar bloqueo'}
              </button>
            </div>
          }
        >
          <form
            id="block-form"
            onSubmit={saveBlock}
            className="space-y-5"
          >
            <section className="rounded-[1.1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'Block configuration' : 'Configuración del bloqueo'}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Experience' : 'Experiencia'}
                  </span>

                  <select
                    value={blockForm.experienceId}
                    onChange={(event) =>
                      setBlockForm((current) => ({
                        ...current,
                        experienceId: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
                  >
                    {experiences.map((experience) => (
                      <option
                        key={experience.id}
                        value={experience.id}
                      >
                        {experience.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Date' : 'Fecha'}
                  </span>

                  <select
                    value={blockForm.dayId}
                    onChange={(event) =>
                      setBlockForm((current) => ({
                        ...current,
                        dayId: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
                  >
                    {weekDays.map((day) => (
                      <option key={day.id} value={day.id}>
                        {getDayShort(day.short, isEnglish)} {day.day} {day.month}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Time' : 'Horario'}
                  </span>

                  <select
                    value={blockForm.time}
                    onChange={(event) =>
                      setBlockForm((current) => ({
                        ...current,
                        time: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
                  >
                    <option value="Todo el día">{isEnglish ? 'All day' : 'Todo el día'}</option>
                    <option>09:00</option>
                    <option>11:00</option>
                    <option>12:00</option>
                    <option>13:00</option>
                    <option>15:00</option>
                    <option>16:00</option>
                    <option>19:00</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Reason' : 'Motivo'}
                  </span>

                  <select
                    value={blockForm.reason}
                    onChange={(event) =>
                      setBlockForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
                  >
                    <option value="Mantenimiento">{isEnglish ? 'Maintenance' : 'Mantenimiento'}</option>
                    <option value="Grupo privado">{isEnglish ? 'Private group' : 'Grupo privado'}</option>
                    <option value="Clima">{isEnglish ? 'Weather' : 'Clima'}</option>
                    <option value="Montaje de evento">{isEnglish ? 'Event setup' : 'Montaje de evento'}</option>
                    <option value="Operación interna">{isEnglish ? 'Internal operation' : 'Operación interna'}</option>
                    <option value="Otro">{isEnglish ? 'Other' : 'Otro'}</option>
                  </select>
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Internal note' : 'Nota interna'}
                  </span>

                  <textarea
                    value={blockForm.note}
                    onChange={(event) =>
                      setBlockForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder={isEnglish ? 'Explain why it is blocked and what the team should review...' : 'Explica por qué se bloquea y qué debe revisar el equipo...'}
                    className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-3 text-sm leading-6 text-[var(--color-ink)] outline-none"
                  />
                </label>
              </div>
            </section>

            <div className="flex items-start gap-3 rounded-[1rem] border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-4">
              <CircleAlert
                size={17}
                className="mt-0.5 shrink-0 text-[var(--color-gold)]"
              />

              <p className="text-[11px] leading-5 text-[var(--color-muted-strong)]">
                {isEnglish
                  ? 'The block will be applied to matching time slots and will stop showing them as bookable in the app.'
                  : 'El bloqueo se aplicará a los horarios coincidentes y dejará de mostrarlos como reservables en la app.'}
              </p>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[140] flex max-w-md items-start gap-3 rounded-[1rem] border border-[#cfddca] bg-white p-4 shadow-[0_22px_50px_rgba(45,22,14,0.18)]">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7efe6] text-[#5f7d63]">
            <Check size={16} />
          </span>

          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              {isEnglish ? 'Availability updated' : 'Disponibilidad actualizada'}
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
