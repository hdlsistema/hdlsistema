import { FileCheck2, ShieldCheck } from 'lucide-react'
import { AppSectionHeader, BackButton } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'

type LegalKind = 'privacy' | 'terms'

const legalCopy = {
  es: {
    privacy: {
      eyebrow: 'Privacidad',
      title: 'Política de Privacidad',
      subtitle: 'Cómo cuidamos y utilizamos la información vinculada a tu experiencia en Hacienda de Letras.',
      sections: [
        ['Información que tratamos', 'Datos de cuenta y contacto, preferencias, reservaciones, compras, pagos, envíos, solicitudes de servicio y datos técnicos necesarios para proteger el acceso.'],
        ['Para qué la utilizamos', 'Para prestar los servicios solicitados, operar reservaciones y compras, dar seguimiento a entregas, atenderte, prevenir fraude y mejorar la experiencia.'],
        ['Tus preferencias', 'Puedes ajustar desde Mi cuenta las comunicaciones de mercadotecnia. Los avisos transaccionales necesarios para tus compras, pagos, reservaciones o seguridad se administran por separado.'],
        ['Conservación y seguridad', 'Protegemos la información con controles de acceso y la conservamos sólo durante el tiempo necesario. Ciertos datos podrán mantenerse cuando exista obligación legal, fiscal, de seguridad o prevención de fraude.'],
        ['Tus derechos', 'Puedes solicitar acceso o corrección de datos y puedes iniciar la eliminación de cuenta desde Privacidad y cuenta. El flujo requiere confirmación por correo y procesamiento operativo.'],
      ],
    },
    terms: {
      eyebrow: 'Información legal',
      title: 'Términos y condiciones',
      subtitle: 'Condiciones esenciales para utilizar la aplicación y los servicios digitales de Hacienda de Letras.',
      sections: [
        ['Uso de la cuenta', 'Debes proporcionar información correcta y proteger tus credenciales. Las acciones realizadas desde tu sesión se consideran vinculadas a tu cuenta.'],
        ['Reservaciones y compras', 'La disponibilidad, precios, políticas de cancelación, entrega y condiciones particulares se muestran antes de confirmar cada operación.'],
        ['Pagos y reembolsos', 'Los cobros y reembolsos se procesan conforme al estado de la orden, las condiciones mostradas y la legislación aplicable.'],
        ['Uso responsable', 'No está permitido intentar alterar el servicio, suplantar identidades, realizar operaciones fraudulentas o afectar la experiencia de otras personas.'],
        ['Atención', 'Para aclaraciones sobre una compra, reservación o servicio utiliza los canales de contacto disponibles en tu perfil.'],
      ],
    },
    back: 'Privacidad y cuenta',
    updated: 'Información vigente para la aplicación de Hacienda de Letras.',
  },
  en: {
    privacy: {
      eyebrow: 'Privacy',
      title: 'Privacy Policy',
      subtitle: 'How we protect and use information connected to your Hacienda de Letras experience.',
      sections: [
        ['Information we process', 'Account and contact details, preferences, bookings, purchases, payments, shipping, service requests and technical data required to protect access.'],
        ['How we use it', 'To provide requested services, operate bookings and purchases, track deliveries, support you, prevent fraud and improve the experience.'],
        ['Your preferences', 'You can adjust marketing communications from My account. Transactional notices required for purchases, payments, bookings or security are managed separately.'],
        ['Retention and security', 'We protect information with access controls and retain it only as needed. Certain records may be kept when required for legal, tax, security or fraud-prevention purposes.'],
        ['Your rights', 'You may request access, correction or deletion through Privacy and account. Deletion requests require confirmation and do not erase the account immediately.'],
      ],
    },
    terms: {
      eyebrow: 'Legal information',
      title: 'Terms and Conditions',
      subtitle: 'Essential conditions for using Hacienda de Letras digital services and application.',
      sections: [
        ['Account use', 'You must provide accurate information and protect your credentials. Actions completed through your session are linked to your account.'],
        ['Bookings and purchases', 'Availability, prices, cancellation, delivery and specific conditions are shown before each operation is confirmed.'],
        ['Payments and refunds', 'Charges and refunds are processed according to the order status, the displayed conditions and applicable law.'],
        ['Responsible use', 'Attempts to alter the service, impersonate others, conduct fraudulent operations or affect other guests are prohibited.'],
        ['Support', 'For questions about a purchase, booking or service, use the contact channels available in your profile.'],
      ],
    },
    back: 'Privacy and account',
    updated: 'Current information for the Hacienda de Letras application.',
  },
} as const

export function MobileLegalScreen({ kind }: { kind: LegalKind }) {
  const { language } = useAppPreferences()
  const copy = legalCopy[language]
  const page = copy[kind]

  return (
    <div className="app-page space-y-5">
      <BackButton to={appPath('/privacidad-cuenta')} label={copy.back} />

      <section className="rounded-[1.45rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8eee5] text-[var(--color-burgundy)]">
          {kind === 'privacy' ? <ShieldCheck size={21} /> : <FileCheck2 size={21} />}
        </span>
        <div className="mt-5"><AppSectionHeader eyebrow={page.eyebrow} title={page.title} subtitle={page.subtitle} /></div>
      </section>

      <section className="overflow-hidden rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        {page.sections.map(([title, body], index) => (
          <article key={title} className={`p-5 ${index ? 'border-t border-[rgba(220,202,181,0.52)]' : ''}`}>
            <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{title}</h2>
            <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted)]">{body}</p>
          </article>
        ))}
      </section>

      <p className="rounded-[1rem] bg-[#fff8f1] p-4 text-[10px] leading-5 text-[var(--color-muted)]">{copy.updated}</p>
    </div>
  )
}
