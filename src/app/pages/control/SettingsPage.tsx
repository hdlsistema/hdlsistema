import { CheckCircle2, Globe2, Save, ShieldCheck, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'
import {
  useAppPreferences,
  type AppLanguage,
} from '../../context/AppPreferencesContext'

const languageOptions = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
]

export function SettingsPage() {
  const {
    adminName,
    adminRole,
    adminEmail,
    language,
    updatePreferences,
    isEnglish,
  } = useAppPreferences()

  const [formValues, setFormValues] = useState({
    adminName,
    adminRole,
    adminEmail,
    language,
  })
  const [saved, setSaved] = useState(false)

  const copy = useMemo(
    () =>
      isEnglish
        ? {
            eyebrow: 'ADMIN PREFERENCES',
            title: 'Settings',
            subtitle:
              'Update admin profile, preferred language and the base identity used by the control center and the client app.',
            profile: 'Admin profile',
            profileNote:
              'These details are reflected across the operating header and the executive dashboard.',
            language: 'Language and experience',
            languageNote:
              'Choose the default language used across the control center, app preview and AI replies.',
            fullName: 'Full name',
            role: 'Role',
            email: 'Email',
            languageField: 'System language',
            save: 'Save changes',
            saved: 'Preferences updated successfully.',
            visibility: 'Live impact',
            visibilityNote:
              'Once saved, top navigation, mobile app labels and AI response tone will follow the selected language.',
            chipTitle: 'Active language',
            chipValue: formValues.language === 'en' ? 'English' : 'Spanish',
          }
        : {
            eyebrow: 'PREFERENCIAS ADMIN',
            title: 'Configuración',
            subtitle:
              'Actualiza el perfil del usuario administrador, el idioma preferido y la identidad base que usa el centro de control y la app cliente.',
            profile: 'Perfil administrador',
            profileNote:
              'Estos datos se reflejan en el header operativo y en el dashboard ejecutivo.',
            language: 'Idioma y experiencia',
            languageNote:
              'Elige el idioma base del centro de control, la app y las respuestas de IA.',
            fullName: 'Nombre completo',
            role: 'Rol',
            email: 'Correo',
            languageField: 'Idioma del sistema',
            save: 'Guardar cambios',
            saved: 'Preferencias actualizadas correctamente.',
            visibility: 'Impacto inmediato',
            visibilityNote:
              'Al guardar, la navegación superior, la app móvil y el tono de ALQIA seguirán el idioma seleccionado.',
            chipTitle: 'Idioma activo',
            chipValue:
              formValues.language === 'en' ? 'Inglés' : 'Español',
          },
    [formValues.language, isEnglish],
  )

  return (
    <div
      className="space-y-6 pb-8"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <SectionTitle
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-[1.4rem] border border-[var(--color-line)] bg-[rgba(255,251,246,0.82)] p-5 shadow-[var(--shadow-card)] backdrop-blur-xl">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[1.2rem] border border-[rgba(220,202,181,0.72)] bg-white/70 p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                  <UserRound size={18} />
                </span>
                <div>
                  <h2
                    className="text-[1.35rem] text-[var(--color-ink)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {copy.profile}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    {copy.profileNote}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
                    {copy.fullName}
                  </span>
                  <input
                    value={formValues.adminName}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        adminName: event.target.value,
                      }))
                    }
                    className="min-h-12 w-full rounded-xl border border-[rgba(220,202,181,0.9)] bg-white/80 px-4 text-sm text-[var(--color-ink)] outline-none"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
                    {copy.role}
                  </span>
                  <input
                    value={formValues.adminRole}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        adminRole: event.target.value,
                      }))
                    }
                    className="min-h-12 w-full rounded-xl border border-[rgba(220,202,181,0.9)] bg-white/80 px-4 text-sm text-[var(--color-ink)] outline-none"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
                    {copy.email}
                  </span>
                  <input
                    value={formValues.adminEmail}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        adminEmail: event.target.value,
                      }))
                    }
                    className="min-h-12 w-full rounded-xl border border-[rgba(220,202,181,0.9)] bg-white/80 px-4 text-sm text-[var(--color-ink)] outline-none"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-[1.2rem] border border-[rgba(220,202,181,0.72)] bg-white/70 p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                  <Globe2 size={18} />
                </span>
                <div>
                  <h2
                    className="text-[1.35rem] text-[var(--color-ink)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {copy.language}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    {copy.languageNote}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
                    {copy.languageField}
                  </span>
                  <CrystalSelect
                    value={formValues.language}
                    onChange={(value) =>
                      setFormValues((current) => ({
                        ...current,
                        language: value as AppLanguage,
                      }))
                    }
                    options={languageOptions}
                  />
                </div>

                <div className="rounded-[1.1rem] border border-[rgba(220,202,181,0.72)] bg-[rgba(255,248,240,0.88)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                    {copy.chipTitle}
                  </p>
                  <p
                    className="mt-2 text-[1.45rem] text-[var(--color-ink)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {copy.chipValue}
                  </p>
                </div>
              </div>
            </article>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                updatePreferences(formValues)
                setSaved(true)
                window.setTimeout(() => setSaved(false), 2400)
              }}
              className="inline-flex min-h-12 items-center gap-2 rounded-[1rem] bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(79,15,31,0.18)]"
            >
              <Save size={16} />
              {copy.save}
            </button>

            {saved ? (
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(98,142,105,0.24)] bg-[#edf6ee] px-4 text-sm font-medium text-[#47724b]">
                <CheckCircle2 size={16} />
                {copy.saved}
              </span>
            ) : null}
          </div>
        </section>

        <aside className="rounded-[1.4rem] border border-[var(--color-line)] bg-[linear-gradient(145deg,rgba(79,15,31,0.96),rgba(113,33,51,0.92))] p-5 text-white shadow-[0_18px_44px_rgba(49,10,20,0.18)]">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/14 bg-white/8 text-[#ecd1a2]">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ecd1a2]">
                {copy.visibility}
              </p>
              <p
                className="mt-2 text-[1.6rem] leading-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Hacienda de Letras OS
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-white/72">
            {copy.visibilityNote}
          </p>

          <div className="mt-6 space-y-3 rounded-[1.15rem] border border-white/12 bg-white/8 p-4">
            <InfoRow
              label={copy.fullName}
              value={formValues.adminName || '—'}
            />
            <InfoRow
              label={copy.role}
              value={formValues.adminRole || '—'}
            />
            <InfoRow
              label={copy.email}
              value={formValues.adminEmail || '—'}
            />
            <InfoRow
              label={copy.languageField}
              value={
                formValues.language === 'en' ? 'English' : 'Español'
              }
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-white/56">
        {label}
      </span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )
}
