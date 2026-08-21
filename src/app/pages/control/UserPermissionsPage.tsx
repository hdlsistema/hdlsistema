import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, KeyRound, Loader2, Save, Search, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  adminUsersClient,
  type AdminUserRecord,
  type ControlPermission,
  type CreateStaffUserPayload,
} from '../../../services/adminUsers.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { CrystalSelect } from '../../components/shared/CrystalSelect'

type Preset = {
  id: string
  label: string
  role: string
  permissions: string[]
}

type Draft = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: string
  permissions: string[]
  financialAccess: boolean
}

const ROLE_OPTIONS = [
  { value: 'operations', label: 'Operación' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Administración sin dinero' },
  { value: 'viewer', label: 'Sólo lectura' },
]

const PRESETS: Preset[] = [
  {
    id: 'boutique',
    label: 'Boutique',
    role: 'operations',
    permissions: [
      'inventory.view',
      'inventory.manage',
      'reservations.view',
      'availability.view',
      'entries.view',
      'entries.scan',
      'entries.counts',
      'orders.view',
      'orders.manage',
      'logistics.view',
    ],
  },
  {
    id: 'puerta',
    label: 'Puerta/Eventos',
    role: 'operations',
    permissions: ['entries.view', 'entries.scan', 'entries.counts'],
  },
  {
    id: 'reservas',
    label: 'Reservaciones',
    role: 'operations',
    permissions: [
      'reservations.view',
      'reservations.manage',
      'availability.view',
      'availability.manage',
      'customers.view',
      'quotes.view',
    ],
  },
  {
    id: 'logistica',
    label: 'Logística',
    role: 'operations',
    permissions: ['orders.view', 'orders.manage', 'logistics.view', 'logistics.manage', 'inventory.view'],
  },
  {
    id: 'contenido',
    label: 'Contenido',
    role: 'marketing',
    permissions: [
      'content.wines.manage',
      'content.experiences.manage',
      'content.events.manage',
      'content.services.manage',
      'content.promotions.manage',
      'content.campaigns.manage',
    ],
  },
]

const emptyDraft: Draft = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'operations',
  permissions: [],
  financialAccess: false,
}

function groupedPermissions(catalog: ControlPermission[]) {
  return catalog.reduce<Record<string, Record<string, ControlPermission[]>>>((groups, permission) => {
    groups[permission.module] ??= {}
    groups[permission.module][permission.page] ??= []
    groups[permission.module][permission.page].push(permission)
    return groups
  }, {})
}

function togglePermission(current: string[], code: string) {
  return current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
}

function generatedPassword() {
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const body = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
  return `Hdl-${body}!26`
}

function roleLabel(value?: string) {
  if (value === 'super_admin') return 'Super administrador'
  if (value === 'admin') return 'Administrador'
  return ROLE_OPTIONS.find((option) => option.value === value)?.label ?? value ?? 'Sin rol'
}

export function UserPermissionsPage() {
  const { session, financialAccess } = useAuth()
  const token = session?.access_token
  const [catalog, setCatalog] = useState<ControlPermission[]>([])
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['operations'])
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [selectedFinancialAccess, setSelectedFinancialAccess] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [passwordDraft, setPasswordDraft] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const selected = useMemo(
    () => users.find((user) => user.id === selectedId) ?? users[0] ?? null,
    [selectedId, users],
  )

  const selectedPermissionSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions])
  const selectedIsElevatedAdmin = selectedRoles.some((role) => role === 'super_admin' || role === 'admin')
  const selectedRoleOptions = useMemo(() => {
    const current = selectedRoles[0]
    if (current === 'super_admin' || current === 'admin') return [{ value: current, label: roleLabel(current) }, ...ROLE_OPTIONS]
    return ROLE_OPTIONS
  }, [selectedRoles])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [catalogResponse, usersResponse] = await Promise.all([
        adminUsersClient.catalog(token),
        adminUsersClient.list(token, { perPage: 100, search: search || undefined }),
      ])
      setCatalog(catalogResponse.data)
      setUsers(usersResponse.users)
      setSelectedId((current) => current ?? usersResponse.users[0]?.id ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar usuarios y permisos.')
    } finally {
      setLoading(false)
    }
  }, [search, token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selected?.id) {
      setSelectedRoles(['operations'])
      setSelectedPermissions([])
      setSelectedFinancialAccess(false)
      return
    }
    adminUsersClient.getPermissions(token, selected.id)
      .then((response) => {
        setSelectedRoles(response.data.roles.length ? response.data.roles : ['operations'])
        setSelectedPermissions(response.data.permissions)
        setSelectedFinancialAccess(response.data.financialAccess)
      })
      .catch(() => {
        setSelectedRoles(selected.roles?.length ? selected.roles : ['operations'])
        setSelectedPermissions([])
        setSelectedFinancialAccess(Boolean(selected.financialAccess))
      })
  }, [selected, token])

  const applyPresetToDraft = (preset: Preset) => {
    setDraft((current) => ({
      ...current,
      role: preset.role,
      permissions: preset.permissions.filter((code) => catalog.some((permission) => permission.code === code)),
      financialAccess: false,
    }))
  }

  const applyPresetToSelected = (preset: Preset) => {
    setSelectedRoles([preset.role])
    setSelectedPermissions(preset.permissions.filter((code) => catalog.some((permission) => permission.code === code)))
    setSelectedFinancialAccess(false)
  }

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const payload: CreateStaffUserPayload = {
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        password: draft.password,
        roles: [draft.role],
        permissions: draft.permissions,
        financialAccess: financialAccess && draft.financialAccess,
      }
      const response = await adminUsersClient.create(token, payload)
      setDraft(emptyDraft)
      setToast('Usuario creado con credenciales administradas.')
      await load()
      setSelectedId(response.id)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No fue posible crear el usuario.')
    } finally {
      setSaving(false)
    }
  }

  const saveSelected = async () => {
    if (!selected || saving) return
    setSaving(true)
    setError('')
    try {
      const response = await adminUsersClient.updatePermissions(token, selected.id, {
        roles: selectedRoles,
        permissions: selectedPermissions,
        financialAccess: financialAccess ? selectedFinancialAccess : undefined,
      })
      setSelectedRoles(response.data.roles.length ? response.data.roles : selectedRoles)
      setSelectedPermissions(response.data.permissions)
      setSelectedFinancialAccess(response.data.financialAccess)
      setToast('Permisos guardados.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar permisos.')
    } finally {
      setSaving(false)
    }
  }

  const rotatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || passwordDraft.length < 8 || saving) return
    setSaving(true)
    setError('')
    try {
      await adminUsersClient.rotatePassword(token, selected.id, passwordDraft)
      setPasswordDraft('')
      setToast('Contraseña actualizada por administración.')
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'No fue posible actualizar contraseña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="control-page control-page--users-permissions min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Administración" title="Usuarios y permisos" subtitle="Alta de staff, módulos visibles y acceso financiero reservado." />
        <button type="button" onClick={load} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-xs font-semibold text-[var(--color-burgundy)]">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
          Sincronizar
        </button>
      </div>

      {error ? <div className="rounded-xl border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[410px_minmax(0,1fr)]">
        <div className="space-y-5">
          <form onSubmit={createUser} className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Nuevo staff</p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">Crear acceso</h2>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-soft)] text-[var(--color-burgundy)]"><UserPlus size={17} /></span>
            </header>

            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" value={draft.firstName} onChange={(firstName) => setDraft((current) => ({ ...current, firstName }))} />
                <Field label="Apellido" value={draft.lastName} onChange={(lastName) => setDraft((current) => ({ ...current, lastName }))} />
              </div>
              <Field label="Correo" type="email" value={draft.email} onChange={(email) => setDraft((current) => ({ ...current, email }))} required />
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Field label="Contraseña" value={draft.password} onChange={(password) => setDraft((current) => ({ ...current, password }))} required />
                <button type="button" onClick={() => setDraft((current) => ({ ...current, password: generatedPassword() }))} className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)]">
                  <KeyRound size={14} />
                  Generar
                </button>
              </div>
              <label>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Rol base</span>
                <CrystalSelect value={draft.role} onChange={(role) => setDraft((current) => ({ ...current, role }))}>
                  {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </CrystalSelect>
              </label>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Plantilla</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button key={preset.id} type="button" onClick={() => applyPresetToDraft(preset)} className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-[11px] font-semibold text-[var(--color-burgundy)]">
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {financialAccess ? (
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-soft)] px-3">
                  <span className="text-xs font-semibold text-[var(--color-ink)]">Acceso financiero</span>
                  <input type="checkbox" checked={draft.financialAccess} onChange={(event) => setDraft((current) => ({ ...current, financialAccess: event.target.checked }))} className="h-4 w-4 accent-[var(--color-burgundy)]" />
                </label>
              ) : null}

              <PermissionSelector
                catalog={catalog}
                selected={draft.permissions}
                onToggle={(code) => setDraft((current) => ({ ...current, permissions: togglePermission(current.permissions, code) }))}
                compact
              />

              <button type="submit" disabled={saving || !draft.email || draft.password.length < 8} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Crear usuario
              </button>
            </div>
          </form>

          <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
            <div className="border-b border-[var(--color-line)] p-4">
              <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3">
                <Search size={15} className="text-[var(--color-muted)]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
            </div>
            {loading ? <State text="Cargando usuarios..." /> : users.length === 0 ? <State text="Sin usuarios administrativos." /> : (
              <div className="max-h-[560px] overflow-auto">
                {users.map((user) => (
                  <button key={user.id} type="button" onClick={() => setSelectedId(user.id)} className={`grid w-full gap-2 border-b border-[var(--color-line)] px-4 py-3 text-left ${selected?.id === user.id ? 'bg-[var(--color-soft)]' : 'bg-transparent'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-[var(--color-ink)]">{user.email ?? 'Usuario sin correo'}</p>
                      {user.financialAccess ? <StatusBadge label="Finanzas" /> : null}
                    </div>
                    <p className="text-xs text-[var(--color-muted)]">{(user.roles ?? []).map(roleLabel).join(' · ') || 'Sin rol'}{user.managedPasswordLocked ? ' · Staff' : ''}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {selected ? (
          <section className="min-w-0 space-y-5">
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Cuenta seleccionada</p>
                  <h2 className="mt-1 truncate text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.email ?? 'Usuario sin correo'}</h2>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{selected.managedPasswordLocked ? 'Credencial administrada' : 'Cuenta administrativa existente'}</p>
                </div>
                <button type="button" onClick={saveSelected} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-50">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Guardar permisos
                </button>
              </header>

              <div className="mt-5 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <label>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Rol base</span>
                    <CrystalSelect value={selectedRoles[0] ?? 'operations'} onChange={(role) => setSelectedRoles([role])} disabled={selectedIsElevatedAdmin}>
                      {selectedRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </CrystalSelect>
                  </label>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Plantillas</p>
                    <div className="grid gap-2">
                      {PRESETS.map((preset) => (
                        <button key={preset.id} type="button" onClick={() => applyPresetToSelected(preset)} className="inline-flex min-h-9 items-center justify-between rounded-lg border border-[var(--color-line)] bg-white px-3 text-left text-xs font-semibold text-[var(--color-burgundy)]">
                          {preset.label}
                          <Check size={13} />
                        </button>
                      ))}
                    </div>
                  </div>
                  {financialAccess ? (
                    <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-soft)] px-3">
                      <span className="text-xs font-semibold text-[var(--color-ink)]">Acceso financiero</span>
                      <input type="checkbox" checked={selectedFinancialAccess} onChange={(event) => setSelectedFinancialAccess(event.target.checked)} className="h-4 w-4 accent-[var(--color-burgundy)]" />
                    </label>
                  ) : null}
                  <form onSubmit={rotatePassword} className="rounded-xl border border-[var(--color-line)] bg-white p-3">
                    <Field label="Nueva contraseña" value={passwordDraft} onChange={setPasswordDraft} />
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setPasswordDraft(generatedPassword())} className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)]">
                        <KeyRound size={13} />
                        Generar
                      </button>
                      <button type="submit" disabled={saving || passwordDraft.length < 8} className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-[var(--color-burgundy)] px-3 text-xs font-semibold text-white disabled:opacity-50">
                        Actualizar
                      </button>
                    </div>
                  </form>
                </div>

                <div className="min-w-0">
                  <PermissionSelector
                    catalog={catalog}
                    selected={selectedPermissions}
                    onToggle={(code) => setSelectedPermissions((current) => togglePermission(current, code))}
                  />
                </div>
              </div>
            </article>

            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric label="Permisos" value={String(selectedPermissionSet.size)} />
                <Metric label="Rol" value={roleLabel(selectedRoles[0])} />
                <Metric label="Dinero" value={selectedFinancialAccess ? 'Permitido' : 'Restringido'} />
              </div>
            </article>
          </section>
        ) : null}
      </section>

      {toast ? <div className="fixed bottom-6 right-6 z-[180] inline-flex items-center gap-3 rounded-xl border border-[#cfddca] bg-white px-4 py-3 text-sm font-semibold text-[#5f7d63] shadow-xl">{toast}<button type="button" aria-label="Cerrar" onClick={() => setToast('')}><X size={14} /></button></div> : null}
    </div>
  )
}

function PermissionSelector({ catalog, selected, onToggle, compact = false }: { catalog: ControlPermission[]; selected: string[]; onToggle: (code: string) => void; compact?: boolean }) {
  const groups = groupedPermissions(catalog)
  const selectedSet = new Set(selected)

  return (
    <div className={`grid gap-4 ${compact ? '' : 'xl:grid-cols-2'}`}>
      {Object.entries(groups).map(([module, pages]) => (
        <section key={module} className="rounded-xl border border-[var(--color-line)] bg-white/70 p-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{module}</h3>
          <div className="mt-3 space-y-3">
            {Object.entries(pages).map(([page, permissions]) => (
              <div key={`${module}-${page}`} className="rounded-lg bg-[var(--color-soft)] p-3">
                <p className="mb-2 text-xs font-semibold text-[var(--color-ink)]">{page}</p>
                <div className="grid gap-2">
                  {permissions.map((permission) => (
                    <label key={permission.code} className="flex min-h-9 items-center justify-between gap-3 rounded-md bg-white px-3">
                      <span className="min-w-0 text-xs text-[var(--color-muted-strong)]">
                        {permission.action}
                        {permission.financial ? <span className="ml-2 text-[10px] font-semibold uppercase text-[var(--color-burgundy)]">Finanzas</span> : null}
                      </span>
                      <input type="checkbox" checked={selectedSet.has(permission.code)} onChange={() => onToggle(permission.code)} className="h-4 w-4 accent-[var(--color-burgundy)]" />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}{required ? ' *' : ''}</span>
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm outline-none" />
    </label>
  )
}

function State({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-[var(--color-muted)]">{text}</div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-soft)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  )
}
