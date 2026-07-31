import {
  Bell,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Gift,
  ImageUp,
  LogOut,
  Settings2,
  ShoppingBag,
  Ticket,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import {
  getCurrentCustomer,
  getCurrentPreferences,
  type Customer,
  type UserPreferences,
} from '../../../services/auth.service'
import { SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function ProfileScreen() {
  const { isEnglish } = useAppPreferences()
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const displayName = profile?.display_name || user?.email || 'Mi cuenta'
  const initials = useMemo(() => {
    const source = displayName.split(' ').filter(Boolean)
    return source.slice(0, 2).map((item) => item[0]).join('').toUpperCase() || 'HD'
  }, [displayName])

  useEffect(() => {
    if (!user) return

    Promise.all([getCurrentPreferences(user.id), getCurrentCustomer(user.id)]).then(
      ([nextPreferences, nextCustomer]) => {
        setPreferences(nextPreferences)
        setCustomer(nextCustomer)
      },
    )
  }, [user])

  useEffect(() => {
    let active = true
    async function loadAvatar() {
      if (!profile?.avatar_url) {
        setAvatarUrl('')
        return
      }
      const { data } = await supabase.storage
        .from('avatars')
        .createSignedUrl(profile.avatar_url, 60 * 15)
      if (active) setAvatarUrl(data?.signedUrl ?? '')
    }
    loadAvatar()
    return () => {
      active = false
    }
  }, [profile?.avatar_url])

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || isSaving) return
    const form = new FormData(event.currentTarget)
    setIsSaving(true)
    setMessage('')
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: String(form.get('firstName') ?? ''),
          last_name: String(form.get('lastName') ?? ''),
          display_name: String(form.get('displayName') ?? ''),
          phone: String(form.get('phone') ?? ''),
          preferred_language: String(form.get('language') ?? 'es'),
        })
        .eq('id', user.id)
      if (profileError) throw profileError

      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .update({ language: String(form.get('language') ?? 'es') })
        .eq('user_id', user.id)
      if (preferencesError) throw preferencesError

      await refreshProfile()
      setMessage(isEnglish ? 'Profile updated.' : 'Perfil actualizado.')
    } catch {
      setMessage(isEnglish ? 'Could not update profile.' : 'No fue posible actualizar el perfil.')
    } finally {
      setIsSaving(false)
    }
  }

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage(isEnglish ? 'Invalid avatar file.' : 'Archivo de avatar inválido.')
      return
    }
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/avatar.${extension}`
    setMessage('')
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      setMessage(isEnglish ? 'Could not upload avatar.' : 'No fue posible subir el avatar.')
      return
    }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: path })
      .eq('id', user.id)
    if (updateError) {
      setMessage(isEnglish ? 'Could not update avatar.' : 'No fue posible actualizar el avatar.')
      return
    }
    await refreshProfile()
    setMessage(isEnglish ? 'Avatar updated.' : 'Avatar actualizado.')
  }

  const menuGroups = [
    {
      title: isEnglish ? 'My activity' : 'Mi actividad',
      items: [
        { label: isEnglish ? 'My bookings' : 'Mis reservaciones', detail: isEnglish ? '3 upcoming' : '3 próximas', icon: CalendarDays },
        { label: isEnglish ? 'My purchases' : 'Mis compras', detail: isEnglish ? '12 orders' : '12 pedidos', icon: ShoppingBag },
        { label: isEnglish ? 'My tickets' : 'Mis boletos', detail: isEnglish ? '4 available' : '4 disponibles', icon: Ticket },
        { label: isEnglish ? 'My benefits' : 'Mis beneficios', detail: 'Wine Club Oro', icon: Gift },
      ],
    },
    {
      title: isEnglish ? 'My account' : 'Mi cuenta',
      items: [
        { label: isEnglish ? 'Personal data' : 'Datos personales', detail: isEnglish ? 'Verified profile' : 'Perfil verificado', icon: UserRound },
        { label: isEnglish ? 'Payment methods' : 'Métodos de pago', detail: 'Visa · 1845', icon: CreditCard },
        { label: isEnglish ? 'Notifications' : 'Notificaciones', detail: isEnglish ? 'Enabled' : 'Activadas', icon: Bell },
        { label: isEnglish ? 'Settings' : 'Configuración', detail: isEnglish ? 'Privacy and access' : 'Privacidad y acceso', icon: Settings2 },
      ],
    },
  ]

  return (
    <div className="space-y-6 pb-3">
      <section className="overflow-hidden rounded-[1.45rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#6a1028,#a34452)] text-[1.7rem] text-white shadow-[0_12px_28px_rgba(104,13,36,0.2)]" style={{ fontFamily: 'var(--font-display)' }}>
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
            <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#d2aa61] text-white">
              <WalletCards size={13} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{isEnglish ? 'My account' : 'Mi cuenta'}</p>
            <h1 className="mt-1 break-words text-[2rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {displayName}
            </h1>
            <p className="mt-2 text-[12px] text-[var(--color-muted)]">{customer?.customer_number ?? (isEnglish ? 'Verified profile' : 'Perfil verificado')}</p>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-[1rem] border border-[rgba(104,13,36,0.2)] bg-white px-4 py-3 text-[12px] font-semibold text-[var(--color-burgundy)]">
          <ImageUp size={15} />
          {isEnglish ? 'Update avatar' : 'Actualizar avatar'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadAvatar} />
        </label>

        <form className="mt-5 grid gap-3" onSubmit={saveProfile}>
          <input name="firstName" defaultValue={profile?.first_name ?? ''} placeholder={isEnglish ? 'First name' : 'Nombre'} className="rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[13px] outline-none" />
          <input name="lastName" defaultValue={profile?.last_name ?? ''} placeholder={isEnglish ? 'Last name' : 'Apellido'} className="rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[13px] outline-none" />
          <input name="displayName" defaultValue={profile?.display_name ?? ''} placeholder={isEnglish ? 'Display name' : 'Nombre visible'} className="rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[13px] outline-none" />
          <input name="phone" defaultValue={profile?.phone ?? ''} placeholder={isEnglish ? 'Phone' : 'Teléfono'} className="rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[13px] outline-none" />
          <select name="language" defaultValue={preferences?.language ?? profile?.preferred_language ?? 'es'} className="rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[13px] outline-none">
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
          <button disabled={isSaving} type="submit" className="rounded-[1rem] bg-[var(--color-burgundy)] px-4 py-3 text-[13px] font-semibold text-white disabled:opacity-60">
            {isSaving ? (isEnglish ? 'Saving...' : 'Guardando...') : (isEnglish ? 'Save profile' : 'Guardar perfil')}
          </button>
          {message ? <p className="text-[11px] text-[var(--color-muted)]">{message}</p> : null}
        </form>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            ['3', isEnglish ? 'Bookings' : 'Reservaciones'],
            ['12', isEnglish ? 'Purchases' : 'Compras'],
            ['4', isEnglish ? 'Tickets' : 'Boletos'],
            ['850', isEnglish ? 'Points' : 'Puntos'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-[1rem] bg-[#fff8f1] p-3">
              <p className="text-[1.55rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
              <p className="mt-1 text-[10px] text-[var(--color-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.3rem] bg-[linear-gradient(135deg,#5b0e22,#8d2038)] p-5 text-white shadow-[0_18px_38px_rgba(93,15,35,0.2)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#efcf93]">{isEnglish ? 'Gold Reserve' : 'Reserva Oro'}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-[1.8rem] leading-none" style={{ fontFamily: 'var(--font-display)' }}>{isEnglish ? 'Active membership' : 'Membresía activa'}</p>
            <p className="mt-2 text-[11px] text-white/75">{isEnglish ? 'Renewal: December 18, 2026' : 'Renovación: 18 de diciembre de 2026'}</p>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px]">{isEnglish ? 'View club' : 'Ver club'}</span>
        </div>
      </section>

      {menuGroups.map((group) => (
        <section key={group.title} className="space-y-3">
          <SectionHeading title={group.title} />
          <div className="overflow-hidden rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
            {group.items.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-3 px-4 py-4 text-left ${index > 0 ? 'border-t border-[rgba(220,202,181,0.52)]' : ''}`}
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[var(--color-ink)]">{item.label}</span>
                    <span className="mt-1 block truncate text-[10px] text-[var(--color-muted)]">{item.detail}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-[var(--color-muted)]" />
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <button type="button" onClick={() => signOut()} className="flex w-full items-center justify-center gap-2 rounded-[1rem] border border-[rgba(104,13,36,0.2)] bg-white px-4 py-3 text-[13px] font-semibold text-[var(--color-burgundy)]">
        <LogOut size={16} />
        {isEnglish ? 'Sign out' : 'Cerrar sesión'}
      </button>
    </div>
  )
}
