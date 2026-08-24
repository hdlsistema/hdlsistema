import { Link } from 'react-router-dom'

type LegalPageProps = {
  type: 'privacy' | 'terms'
}

const updatedAt = '10 de agosto de 2026'
const supportEmail = 'soporte@admhaciendadeletras.com'

const sections = {
  privacy: {
    eyebrow: 'Aviso legal',
    title: 'Política de Privacidad',
    intro:
      'Esta Política de Privacidad explica cómo Hacienda de Letras trata la información de las personas que usan la app, el sitio web y las experiencias digitales asociadas al Centro Operativo.',
    items: [
      {
        title: '1. Información que podemos recopilar',
        body:
          'Podemos tratar datos de identificación y contacto, datos de cuenta, reservaciones, compras, preferencias, membresías, interacciones con la app, dispositivos registrados para notificaciones y comunicaciones transaccionales.',
      },
      {
        title: '2. Datos recibidos mediante Google Sign-In',
        body:
          'Si eliges iniciar sesión con Google, recibimos únicamente la información básica autorizada por Google para identificar tu cuenta, como nombre, correo electrónico e identificador de cuenta. No solicitamos acceso a contactos, Gmail, Drive, Calendar, ubicación de Google ni otros datos adicionales desde Google Sign-In.',
      },
      {
        title: '3. Finalidades de uso',
        body:
          'Usamos la información para crear y proteger cuentas, gestionar reservaciones, compras, boletos digitales, pagos, acceso por QR, Wine Club, atención al cliente, comunicaciones operativas y mejora de la experiencia.',
      },
      {
        title: '4. Autenticación y servicios autorizados',
        body:
          'La app puede permitir inicio de sesión con correo, Google o Apple. Para operar la plataforma podemos apoyarnos en servicios autorizados de acceso, alojamiento seguro, pagos, correo transaccional, notificaciones y analítica operativa, siempre limitados a las finalidades descritas.',
      },
      {
        title: '5. Pagos y datos financieros',
        body:
          'Los pagos con tarjeta se procesan mediante servicios especializados de pago seguro. Hacienda de Letras no almacena PAN, CVV ni datos sensibles completos de tarjeta en sus sistemas.',
      },
      {
        title: '6. Notificaciones',
        body:
          'Si la persona usuaria autoriza notificaciones, podemos registrar identificadores técnicos del dispositivo para enviar avisos transaccionales, recordatorios de reservación, boletos, cambios de estado y comunicaciones autorizadas.',
      },
      {
        title: '7. Almacenamiento, conservación y seguridad',
        body:
          'La información se almacena en servicios técnicos administrados para operar la app y se conserva durante el tiempo necesario para cumplir las finalidades descritas, obligaciones operativas, fiscales, de seguridad y atención. Aplicamos controles técnicos y de acceso para reducir riesgos.',
      },
      {
        title: '8. Derechos, eliminación de cuenta y contacto',
        body:
          'Para solicitar acceso, rectificación, cancelación, oposición, aclaraciones o eliminación de cuenta o datos cuando proceda, escribe al correo de contacto indicado en esta página. Atenderemos la solicitud conforme a los requisitos de identificación y conservación aplicables.',
      },
    ],
  },
  terms: {
    eyebrow: 'Condiciones de uso',
    title: 'Términos y Condiciones',
    intro:
      'Estos Términos y Condiciones regulan el uso de la app, el sitio web, el Centro Operativo y los servicios digitales de Hacienda de Letras.',
    items: [
      {
        title: '1. Uso de la plataforma',
        body:
          'La persona usuaria acepta usar la plataforma de forma lícita, proporcionar información veraz y mantener la confidencialidad de sus credenciales de acceso.',
      },
      {
        title: '2. Cuentas y autenticación',
        body:
          'El acceso puede realizarse con correo y contraseña o métodos autorizados. Hacienda de Letras puede bloquear o limitar cuentas ante uso indebido, fraude o riesgo de seguridad.',
      },
      {
        title: '3. Reservaciones, eventos y boletos',
        body:
          'Las reservaciones, eventos, cupos, horarios, precios y boletos digitales quedan sujetos a disponibilidad, confirmación de pago, reglas operativas y políticas vigentes de Hacienda de Letras.',
      },
      {
        title: '4. Pagos',
        body:
          'Los montos finales son calculados y validados por Hacienda de Letras. El pago se confirma mediante el procesador autorizado y sus mecanismos de verificación.',
      },
      {
        title: '5. Cambios, cancelaciones y reembolsos',
        body:
          'Las solicitudes de cambio, cancelación o reembolso se evaluarán conforme a la política aplicable a cada producto, reservación, experiencia, evento o membresía.',
      },
      {
        title: '6. Contenido y disponibilidad',
        body:
          'Hacienda de Letras puede actualizar catálogo, precios, imágenes, horarios, beneficios, promociones y campañas sin requerir una actualización de la app cuando se trate de contenido remoto.',
      },
      {
        title: '7. Responsabilidad de la persona usuaria',
        body:
          'La persona usuaria debe respetar las reglas de acceso, edad mínima aplicable, consumo responsable, seguridad en instalaciones y cualquier indicación operativa durante su visita.',
      },
    ],
  },
} as const

export function LegalPage({ type }: LegalPageProps) {
  const content = sections[type]

  return (
    <main className="min-h-screen bg-[#f8f1e7] text-[#2b1712]">
      <section className="border-b border-[#e3d1ba] bg-[linear-gradient(135deg,#fffaf2,#efe1cf)] px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-5">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src="/Logo-HDL-2.svg" alt="Hacienda de Letras" className="h-16 w-auto" />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7d1328] sm:inline">
              Hacienda de Letras
            </span>
          </Link>
          <Link
            to="/"
            className="rounded-full border border-[#d8bf9c] bg-white/55 px-4 py-2 text-[12px] font-semibold text-[#5B0B1F] shadow-[0_12px_30px_rgba(57,26,18,0.08)]"
          >
            Volver al inicio
          </Link>
        </div>
      </section>

      <section className="px-6 py-12 md:px-10 md:py-16">
        <article className="mx-auto max-w-[900px] rounded-[1.5rem] border border-[#dfcbb2] bg-white/72 p-6 shadow-[0_24px_70px_rgba(57,26,18,0.08)] backdrop-blur-xl md:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b48a55]">
            {content.eyebrow}
          </p>
          <h1
            className="mt-3 text-[2.6rem] leading-none text-[#5B0B1F] md:text-[4rem]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {content.title}
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#6f5a4d] md:text-base">
            {content.intro}
          </p>
          <p className="mt-3 text-[12px] text-[#8a6c59]">
            Última actualización: {updatedAt}
          </p>

          <div className="mt-9 space-y-6">
            {content.items.map((item) => (
              <section key={item.title} className="rounded-[1rem] border border-[#eadbc9] bg-[#fffaf4] p-5">
                <h2 className="text-[1.2rem] text-[#2b1712]" style={{ fontFamily: 'var(--font-display)' }}>
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#6f5a4d]">{item.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-9 rounded-[1rem] border border-[#d8bf9c] bg-[#f7efe4] p-5 text-sm leading-7 text-[#5f463a]">
            <p className="font-semibold text-[#5B0B1F]">Contacto</p>
            <p>
              Para dudas sobre estos documentos escribe a{' '}
              <a className="font-semibold text-[#5B0B1F] underline" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
              .
            </p>
            {type === 'privacy' ? (
              <Link to="/eliminar-cuenta" className="mt-3 inline-flex rounded-full border border-[#d8bf9c] bg-white px-4 py-2 text-xs font-semibold text-[#5B0B1F]">
                Solicitar eliminación de cuenta
              </Link>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  )
}
