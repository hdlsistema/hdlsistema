import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Building2, Check, ChevronDown, KeyRound, Loader2, MapPin, Save, Search, ShieldCheck, Store, UserPlus, X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  adminUsersClient,
  type AdminUserRecord,
  type ControlPermission,
  type ControlScope,
  type CreateStaffUserPayload,
} from '../../../services/adminUsers.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalSelect } from '../../components/shared/CrystalSelect'

type Preset = {
  id: string
  label: string
  role: string
  permissions: string[]
  scopeCodes?: string[]
}

type Draft = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: string
  permissions: string[]
  financialAccess: boolean
  scopeCodes: string[]
}

const ROLE_OPTIONS = [
  { value: 'operations', label: 'Operación' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Administración sin dinero' },
  { value: 'viewer', label: 'Sólo lectura' },
]

const STAFF_DIRECTORY_ROLES = new Set(['operations', 'marketing', 'finance', 'viewer'])
const ADMIN_DIRECTORY_ROLES = new Set(['super_admin', 'admin'])

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
    scopeCodes: ['hacienda_teodoro'],
  },
  {
    id: 'restaurante_teodoro',
    label: 'Rest. Teodoro',
    role: 'operations',
    permissions: [
      'reservations.view',
      'reservations.manage',
      'orders.view',
      'orders.manage',
      'logistics.view',
      'logistics.manage',
      'entries.view',
      'entries.scan',
      'customers.view',
    ],
    scopeCodes: ['restaurante_teodoro'],
  },
  {
    id: 'restaurante_nieto',
    label: 'Rest. Nieto',
    role: 'operations',
    permissions: [
      'reservations.view',
      'reservations.manage',
      'orders.view',
      'orders.manage',
      'logistics.view',
      'logistics.manage',
      'entries.view',
      'entries.scan',
      'customers.view',
    ],
    scopeCodes: ['restaurante_nieto'],
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
  scopeCodes: [],
}

const FALLBACK_SCOPE_CATALOG: ControlScope[] = [
  {
    code: 'all_sites',
    label: 'Todas las sedes',
    type: 'site',
    description: 'Acceso operativo a Hacienda, restaurantes y puntos de servicio.',
    sortOrder: 0,
  },
  {
    code: 'hacienda_teodoro',
    label: 'Hacienda en Teodoro',
    type: 'estate',
    description: 'Viñedo, bodega, boutique y operación general en Teodoro Olivares.',
    sortOrder: 10,
  },
  {
    code: 'restaurante_teodoro',
    label: 'Restaurante Teodoro',
    type: 'restaurant',
    description: 'Restaurante dentro de Hacienda de Letras en Teodoro Olivares.',
    sortOrder: 20,
  },
  {
    code: 'restaurante_nieto',
    label: 'Restaurante Nieto',
    type: 'restaurant',
    description: 'Restaurante Hacienda de Letras en Calle Nieto 106.',
    sortOrder: 30,
  },
]

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

function toggleScope(current: string[], code: string) {
  if (code === 'all_sites') return current.includes(code) ? [] : ['all_sites']
  const withoutAllSites = current.filter((item) => item !== 'all_sites')
  return withoutAllSites.includes(code) ? withoutAllSites.filter((item) => item !== code) : [...withoutAllSites, code]
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

function normalizeIdentity(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function userEmail(user: AdminUserRecord) {
  return user.email?.trim() ?? ''
}

function isEmailValue(value: string) {
  return value.includes('@')
}

function userFullName(user: AdminUserRecord) {
  const email = userEmail(user).toLowerCase()
  const displayName = user.displayName?.trim()
  if (displayName && displayName.toLowerCase() !== email && !isEmailValue(displayName)) return displayName
  return [user.firstName, user.lastName]
    .map((value) => value?.trim() ?? '')
    .filter((value) => value && value.toLowerCase() !== email && !isEmailValue(value))
    .join(' ')
    .trim()
}

function userDisplayName(user: AdminUserRecord) {
  return userFullName(user) || userEmail(user) || 'Cuenta sin correo'
}

function hasStaffRole(user: AdminUserRecord) {
  return Boolean(user.roles?.some((role) => STAFF_DIRECTORY_ROLES.has(role)))
}

function hasAdminRole(user: AdminUserRecord) {
  return Boolean(user.roles?.some((role) => ADMIN_DIRECTORY_ROLES.has(role)))
}

function isStaffDirectoryUser(user: AdminUserRecord) {
  if (user.accountType === 'staff' || user.accountType === 'customer_staff') return true
  if (user.accountType === 'admin') return true
  if (hasStaffRole(user)) return true
  if (user.managedPasswordLocked && !user.roles?.every((role) => role === 'customer')) return true
  return hasAdminRole(user)
}

function userAccountLabel(user: AdminUserRecord) {
  if (user.roles?.includes('super_admin')) return 'Super administrador'
  if (user.accountType === 'customer_staff') return 'Cliente + staff'
  if (user.accountType === 'admin') return 'Administrador'
  if (user.accountLabel && user.accountLabel !== 'customer') return user.accountLabel
  if (user.roles?.includes('customer') && hasStaffRole(user)) return 'Cliente + staff'
  if (hasAdminRole(user)) return 'Administrador'
  if (hasStaffRole(user) || user.managedPasswordLocked) return 'Staff'
  return roleLabel(user.roles?.[0])
}

function userOptionLabel(user: AdminUserRecord) {
  return userFullName(user) || userEmail(user) || 'Cuenta sin correo'
}

function scopeSummary(catalog: ControlScope[], scopeCodes: string[]) {
  if (!scopeCodes.length) return 'Sin sede'
  if (scopeCodes.includes('all_sites')) return 'Todas las sedes'
  const labels = scopeCodes
    .map((code) => catalog.find((scope) => scope.code === code)?.label)
    .filter(Boolean)
  return labels.length ? labels.join(', ') : `${scopeCodes.length} sedes`
}

function matchesUserSearch(user: AdminUserRecord, search: string) {
  const normalizedSearch = normalizeIdentity(search.trim())
  if (!normalizedSearch) return true
  return normalizeIdentity([
    userFullName(user),
    userEmail(user),
    userAccountLabel(user),
    ...(user.scopes ?? []).map((scope) => scope.label),
  ].filter(Boolean).join(' ')).includes(normalizedSearch)
}

function sortAdminUsers(records: AdminUserRecord[]) {
  return [...records].sort((a, b) => userOptionLabel(a).localeCompare(userOptionLabel(b), 'es-MX', { sensitivity: 'base' }))
}

export function UserPermissionsPage() {
  const { session, financialAccess } = useAuth()
  const token = session?.access_token
  const [catalog, setCatalog] = useState<ControlPermission[]>([])
  const [scopeCatalog, setScopeCatalog] = useState<ControlScope[]>(FALLBACK_SCOPE_CATALOG)
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['operations'])
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [selectedScopeCodes, setSelectedScopeCodes] = useState<string[]>([])
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
        adminUsersClient.list(token, { perPage: 100 }),
      ])
      setCatalog(catalogResponse.data)
      setScopeCatalog(catalogResponse.scopes?.length ? catalogResponse.scopes : FALLBACK_SCOPE_CATALOG)
      const orderedUsers = sortAdminUsers(usersResponse.users)
        .filter(isStaffDirectoryUser)
        .filter((user) => matchesUserSearch(user, search))
      setUsers(orderedUsers)
      setSelectedId((current) => current && orderedUsers.some((user) => user.id === current) ? current : orderedUsers[0]?.id ?? null)
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
      setSelectedScopeCodes([])
      setSelectedFinancialAccess(false)
      return
    }
    adminUsersClient.getPermissions(token, selected.id)
      .then((response) => {
        setSelectedRoles(response.data.roles.length ? response.data.roles : ['operations'])
        setSelectedPermissions(response.data.permissions)
        setSelectedScopeCodes(response.data.scopeCodes ?? selected.scopeCodes ?? [])
        setSelectedFinancialAccess(response.data.financialAccess)
      })
      .catch(() => {
        setSelectedRoles(selected.roles?.length ? selected.roles : ['operations'])
        setSelectedPermissions([])
        setSelectedScopeCodes(selected.scopeCodes ?? [])
        setSelectedFinancialAccess(Boolean(selected.financialAccess))
      })
  }, [selected, token])

  const applyPresetToDraft = (preset: Preset) => {
    setDraft((current) => ({
      ...current,
      role: preset.role,
      permissions: preset.permissions.filter((code) => catalog.some((permission) => permission.code === code)),
      financialAccess: false,
      scopeCodes: preset.scopeCodes ?? current.scopeCodes,
    }))
  }

  const applyPresetToSelected = (preset: Preset) => {
    setSelectedRoles([preset.role])
    setSelectedPermissions(preset.permissions.filter((code) => catalog.some((permission) => permission.code === code)))
    if (preset.scopeCodes) setSelectedScopeCodes(preset.scopeCodes)
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
        scopeCodes: draft.scopeCodes,
      }
      const response = await adminUsersClient.create(token, payload)
      setDraft(emptyDraft)
      setToast(response.accountType === 'customer_staff' ? 'Cliente convertido a staff.' : 'Usuario creado con credenciales administradas.')
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
        scopeCodes: selectedScopeCodes,
      })
      setSelectedRoles(response.data.roles.length ? response.data.roles : selectedRoles)
      setSelectedPermissions(response.data.permissions)
      setSelectedScopeCodes(response.data.scopeCodes ?? selectedScopeCodes)
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
    <div className="control-page control-page--users-permissions control-users-page min-w-0 space-y-5">
      <header className="control-users-hero">
        <SectionTitle eyebrow="Administración" title="Usuarios y permisos" subtitle="Alta de staff, módulos visibles y acceso financiero reservado." />
        <button type="button" onClick={load} className="control-users-sync">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
          Sincronizar
        </button>
      </header>

      {error ? <div className="rounded-xl border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="control-users-overview" aria-label="Resumen de usuarios y permisos">
        <Metric label="Staff" value={String(users.length)} />
        <Metric label="Seleccionado" value={selected ? userDisplayName(selected) : 'Sin cuenta'} />
        <Metric label="Permisos activos" value={String(selectedPermissionSet.size)} />
        <Metric label="Sedes" value={scopeSummary(scopeCatalog, selectedScopeCodes)} />
        <Metric label="Finanzas" value={selectedFinancialAccess ? 'Permitido' : 'Restringido'} />
      </section>

      <section className="control-users-workspace">
        <form onSubmit={createUser} className="control-users-card control-users-card--create">
          <header className="control-users-card-header">
            <div>
              <p className="control-users-eyebrow">Nuevo staff</p>
              <h2>Crear acceso</h2>
              <span>Credenciales fijas administradas desde el centro de control.</span>
            </div>
            <span className="control-users-icon"><UserPlus size={17} /></span>
          </header>

          <div className="control-users-form-grid">
            <div className="control-users-two-col">
              <Field label="Nombre" value={draft.firstName} onChange={(firstName) => setDraft((current) => ({ ...current, firstName }))} />
              <Field label="Apellido" value={draft.lastName} onChange={(lastName) => setDraft((current) => ({ ...current, lastName }))} />
            </div>
            <Field label="Correo" type="email" value={draft.email} onChange={(email) => setDraft((current) => ({ ...current, email }))} required />
            <div className="control-users-password-row">
              <Field label="Contraseña" value={draft.password} onChange={(password) => setDraft((current) => ({ ...current, password }))} required />
              <button type="button" onClick={() => setDraft((current) => ({ ...current, password: generatedPassword() }))} className="control-users-secondary-button">
                <KeyRound size={14} />
                Generar
              </button>
            </div>
            <label className="control-users-field">
              <span className="control-users-label">Rol base</span>
              <CrystalSelect value={draft.role} onChange={(role) => setDraft((current) => ({ ...current, role }))}>
                {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </CrystalSelect>
            </label>

            <ScopeSelector
              label="Sedes asignadas"
              scopes={scopeCatalog}
              selected={draft.scopeCodes}
              onToggle={(code) => setDraft((current) => ({ ...current, scopeCodes: toggleScope(current.scopeCodes, code) }))}
              compact
            />

            <div>
              <p className="control-users-label">Plantilla</p>
              <div className="control-users-preset-grid">
                {PRESETS.map((preset) => (
                  <button key={preset.id} type="button" onClick={() => applyPresetToDraft(preset)} className="control-users-preset">
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {financialAccess ? (
              <label className="control-users-finance-toggle">
                <span>
                  <strong>Acceso financiero</strong>
                  <small>Sólo para perfiles autorizados.</small>
                </span>
                <input type="checkbox" checked={draft.financialAccess} onChange={(event) => setDraft((current) => ({ ...current, financialAccess: event.target.checked }))} className="h-4 w-4 accent-[var(--color-burgundy)]" />
              </label>
            ) : null}

            <details className="control-users-details">
              <summary>
                <span>Permisos personalizados</span>
                <strong>{draft.permissions.length} activos</strong>
              </summary>
              <PermissionSelector
                catalog={catalog}
                selected={draft.permissions}
                onToggle={(code) => setDraft((current) => ({ ...current, permissions: togglePermission(current.permissions, code) }))}
                compact
              />
            </details>

            <button type="submit" disabled={saving || !draft.email || draft.password.length < 8} className="control-users-primary-button">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Crear usuario
            </button>
          </div>
        </form>

        <section className="control-users-card control-users-card--selected">
          <header className="control-users-card-header control-users-selected-header">
            <div>
              <p className="control-users-eyebrow">Edición de permisos</p>
              <h2>{selected ? userDisplayName(selected) : 'Selecciona un usuario'}</h2>
              <span>{selected ? `${userEmail(selected) || 'Sin correo'} · ${userAccountLabel(selected)} · ${selected.managedPasswordLocked ? 'Credencial administrada' : 'Cuenta administrativa existente'}` : 'Elige una cuenta del listado cristal.'}</span>
            </div>
            <button type="button" onClick={saveSelected} disabled={saving || !selected} className="control-users-primary-button control-users-primary-button--inline">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Guardar permisos
            </button>
          </header>

          <div className="control-users-selector-panel">
            <label className="control-users-search">
              <Search size={15} className="text-[var(--color-muted)]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filtrar por nombre o correo..." />
            </label>
            <label className="control-users-field">
              <span className="control-users-label">Usuario para editar</span>
              <CrystalSelect value={selected?.id ?? ''} onChange={setSelectedId} disabled={loading || users.length === 0}>
                {users.length === 0 ? <option value="">Sin usuarios disponibles</option> : null}
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {userOptionLabel(user)}
                  </option>
                ))}
              </CrystalSelect>
            </label>
          </div>

          {selected ? (
            <div className="control-users-selected-grid">
              <aside className="control-users-side-panel">
                <label className="control-users-field">
                  <span className="control-users-label">Rol base</span>
                  <CrystalSelect value={selectedRoles[0] ?? 'operations'} onChange={(role) => setSelectedRoles([role])} disabled={selectedIsElevatedAdmin}>
                    {selectedRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </CrystalSelect>
                </label>

                <div>
                  <p className="control-users-label">Plantillas</p>
                  <div className="control-users-selected-presets">
                    {PRESETS.map((preset) => (
                      <button key={preset.id} type="button" onClick={() => applyPresetToSelected(preset)} className="control-users-preset">
                        <span>{preset.label}</span>
                        <Check size={13} />
                      </button>
                    ))}
                  </div>
                </div>

                <ScopeSelector
                  label="Sedes asignadas"
                  scopes={scopeCatalog}
                  selected={selectedScopeCodes}
                  onToggle={(code) => setSelectedScopeCodes((current) => toggleScope(current, code))}
                />

                {financialAccess ? (
                  <label className="control-users-finance-toggle">
                    <span>
                      <strong>Acceso financiero</strong>
                      <small>{selectedFinancialAccess ? 'Permitido' : 'Restringido'}</small>
                    </span>
                    <input type="checkbox" checked={selectedFinancialAccess} onChange={(event) => setSelectedFinancialAccess(event.target.checked)} className="h-4 w-4 accent-[var(--color-burgundy)]" />
                  </label>
                ) : null}

                <form onSubmit={rotatePassword} className="control-users-password-card">
                  <Field label="Nueva contraseña" value={passwordDraft} onChange={setPasswordDraft} />
                  <div className="control-users-password-actions">
                    <button type="button" onClick={() => setPasswordDraft(generatedPassword())} className="control-users-secondary-button">
                      <KeyRound size={13} />
                      Generar
                    </button>
                    <button type="submit" disabled={saving || passwordDraft.length < 8} className="control-users-primary-button control-users-primary-button--small">
                      Actualizar
                    </button>
                  </div>
                </form>
              </aside>

              <div className="control-users-permissions-panel">
                <div className="control-users-permissions-heading">
                  <div>
                    <p className="control-users-eyebrow">Módulos y páginas</p>
                    <h3>Permisos operativos</h3>
                  </div>
                  <span>{selectedPermissionSet.size} activos</span>
                </div>
                <PermissionSelector
                  catalog={catalog}
                  selected={selectedPermissions}
                  onToggle={(code) => setSelectedPermissions((current) => togglePermission(current, code))}
                />
              </div>
            </div>
          ) : (
            <State text="Selecciona una cuenta para configurar permisos." />
          )}
        </section>
      </section>

      {toast ? <div className="fixed bottom-6 right-6 z-[180] inline-flex items-center gap-3 rounded-xl border border-[rgba(37,47,55,0.24)] bg-white px-4 py-3 text-sm font-semibold text-[#252F37] shadow-xl">{toast}<button type="button" aria-label="Cerrar" onClick={() => setToast('')}><X size={14} /></button></div> : null}
    </div>
  )
}

function PermissionSelector({ catalog, selected, onToggle, compact = false }: { catalog: ControlPermission[]; selected: string[]; onToggle: (code: string) => void; compact?: boolean }) {
  const groups = groupedPermissions(catalog)
  const selectedSet = new Set(selected)

  if (catalog.length === 0) return <State text="Catálogo de permisos pendiente de sincronizar." />

  return (
    <div className={`control-users-permission-grid ${compact ? 'is-compact' : ''}`}>
      {Object.entries(groups).map(([module, pages]) => {
        const modulePermissions = Object.values(pages).flat()
        const activeCount = modulePermissions.filter((permission) => selectedSet.has(permission.code)).length
        return (
          <details key={module} className="control-users-permission-module" open={activeCount > 0}>
            <summary className="control-users-module-header">
              <span>
                <h3>{module}</h3>
                <small>{Object.keys(pages).length} páginas</small>
              </span>
              <strong>{activeCount}/{modulePermissions.length}</strong>
              <ChevronDown size={15} className="control-users-module-chevron" />
            </summary>
            <div className="control-users-page-list">
            {Object.entries(pages).map(([page, permissions]) => (
              <div key={`${module}-${page}`} className="control-users-page-block">
                <p>{page}</p>
                <div className="control-users-permission-list">
                  {permissions.map((permission) => (
                    <label key={permission.code} className="control-users-permission-row">
                      <span>
                        {permission.action}
                        {permission.financial ? <em>Finanzas</em> : null}
                      </span>
                      <input type="checkbox" checked={selectedSet.has(permission.code)} onChange={() => onToggle(permission.code)} className="h-4 w-4 accent-[var(--color-burgundy)]" />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}

function ScopeSelector({
  label,
  scopes,
  selected,
  onToggle,
  compact = false,
}: {
  label: string
  scopes: ControlScope[]
  selected: string[]
  onToggle: (code: string) => void
  compact?: boolean
}) {
  const selectedSet = new Set(selected)

  if (scopes.length === 0) return <State text="Catálogo de sedes pendiente de sincronizar." />

  return (
    <section className={`control-users-scope-panel ${compact ? 'is-compact' : ''}`} aria-label={label}>
      <header className="control-users-scope-header">
        <span>{label}</span>
        <strong>{selected.includes('all_sites') ? 'Todas' : selected.length ? `${selected.length} activas` : 'Sin sede'}</strong>
      </header>
      <div className="control-users-scope-grid">
        {scopes.map((scope) => {
          const checked = selectedSet.has(scope.code)
          const Icon = scope.type === 'restaurant' ? Store : scope.type === 'estate' ? Building2 : MapPin
          return (
            <button
              key={scope.code}
              type="button"
              onClick={() => onToggle(scope.code)}
              className={`control-users-scope-option ${checked ? 'is-selected' : ''}`}
              aria-pressed={checked}
            >
              <Icon size={15} />
              <span>
                <strong>{scope.label}</strong>
                {compact ? null : <small>{scope.description}</small>}
              </span>
              {checked ? <Check size={14} /> : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Field({ label, value, onChange, type = 'text', required = false, className = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; className?: string }) {
  return (
    <label className={`control-users-field ${className}`}>
      <span className="control-users-label">{label}{required ? ' *' : ''}</span>
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="control-users-input" />
    </label>
  )
}

function State({ text }: { text: string }) {
  return <div className="control-users-state">{text}</div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="control-users-metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}
