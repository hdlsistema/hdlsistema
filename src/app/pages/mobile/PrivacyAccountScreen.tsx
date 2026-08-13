import { ArrowLeft, ChevronRight, FileText, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppSectionHeader } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'

export function PrivacyAccountScreen() {
  const { language } = useAppPreferences()
  const en = language === 'en'
  return (
    <div className="app-page space-y-6">
      <Link to={appPath('/perfil')} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(104,13,36,0.18)] bg-white px-4 text-[12px] font-semibold text-[var(--color-burgundy)]">
        <ArrowLeft size={15} /> {en ? 'Profile' : 'Perfil'}
      </Link>

      <section className="rounded-[1.45rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8eee5] text-[var(--color-burgundy)]"><LockKeyhole size={21} /></span>
        <div className="mt-5">
          <AppSectionHeader eyebrow={en ? 'My account' : 'Mi cuenta'} title={en ? 'Privacy and account' : 'Privacidad y cuenta'} subtitle={en ? 'Review how we process your data and manage your account deletion request.' : 'Consulta cómo tratamos tus datos y administra la eliminación de tu cuenta.'} />
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        <Link to={appPath('/politica-de-privacidad')} className="flex items-center gap-3 px-4 py-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]"><FileText size={18} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-[var(--color-ink)]">{en ? 'Privacy Policy' : 'Política de Privacidad'}</span><span className="mt-1 block text-[11px] leading-4 text-[var(--color-muted)]">{en ? 'Learn how your information is used, protected and retained.' : 'Conoce el uso, protección y conservación de tus datos.'}</span></span>
          <ChevronRight size={16} className="shrink-0 text-[var(--color-muted)]" />
        </Link>
        <Link to={appPath('/terminos-y-condiciones')} className="flex items-center gap-3 border-t border-[rgba(220,202,181,0.52)] px-4 py-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]"><FileText size={18} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-[var(--color-ink)]">{en ? 'Terms and Conditions' : 'Términos y condiciones'}</span><span className="mt-1 block text-[11px] leading-4 text-[var(--color-muted)]">{en ? 'Review the conditions for using the application.' : 'Consulta las condiciones de uso de la aplicación.'}</span></span>
          <ChevronRight size={16} className="shrink-0 text-[var(--color-muted)]" />
        </Link>
        <div className="border-t border-[rgba(220,202,181,0.52)] px-4 py-4">
          <div className="flex items-start gap-3 rounded-[1rem] bg-[#fff8f1] p-4">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#a07845]" />
            <p className="text-[11px] leading-5 text-[var(--color-muted)]">{en ? 'Deletion requires confirmation and review. Certain information may be retained only when required for legal, tax, security or fraud-prevention purposes.' : 'La eliminación requiere confirmación y revisión. Cierta información podrá conservarse únicamente por obligación legal, fiscal, de seguridad o prevención de fraude.'}</p>
          </div>
        </div>
      </section>

      <Link to={appPath('/eliminar-cuenta')} className="flex min-h-14 items-center gap-3 rounded-[1.1rem] border border-[#e4bdb5] bg-[#fff4f1] px-4 text-[#963e32] shadow-[0_12px_24px_rgba(108,36,30,0.06)]">
        <Trash2 size={18} />
        <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">{en ? 'Delete my account' : 'Eliminar mi cuenta'}</span><span className="mt-1 block text-[11px] leading-4 text-[#8b625b]">{en ? 'Start a request; your account is not deleted immediately.' : 'Inicia una solicitud; tu cuenta no se elimina de inmediato.'}</span></span>
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}
