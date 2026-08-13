import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Building2, CalendarCheck2, ShieldCheck } from 'lucide-react'

const operationalPillars = [
  {
    icon: CalendarCheck2,
    title: 'Operación coordinada',
    copy: 'Reservaciones, hospedaje, ventas y atención en un mismo entorno.',
  },
  {
    icon: Building2,
    title: 'Visión de la Hacienda',
    copy: 'Una lectura clara de lo que ocurre en cada canal y área operativa.',
  },
  {
    icon: ShieldCheck,
    title: 'Acceso protegido',
    copy: 'Información disponible únicamente para perfiles autorizados.',
  },
]

export function LandingPage() {
  useEffect(() => {
    document.title = 'Hacienda de Letras · Centro de Control'
  }, [])

  return (
    <main className="min-h-screen bg-[#14090c] text-white">
      <section className="relative isolate min-h-[92vh] overflow-hidden">
        <img
          src="/hacienda-portada-landing-hd.png"
          alt="Pasillo histórico de Hacienda de Letras"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(23,4,10,0.92)_0%,rgba(40,9,17,0.70)_43%,rgba(23,7,10,0.22)_75%,rgba(13,5,7,0.36)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,5,8,0.7)_0%,transparent_28%,transparent_66%,rgba(16,5,8,0.86)_100%)]" />

        <header className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-12">
          <Link to="/" className="inline-flex items-center gap-4" aria-label="Hacienda de Letras">
            <img src="/Logo-HDL-2.svg" alt="" className="h-12 w-16 object-contain brightness-0 invert sm:h-14 sm:w-20" />
            <span className="hidden border-l border-white/25 pl-4 sm:block">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-white/92">Hacienda de Letras</span>
              <span className="mt-1 block text-[10px] tracking-[0.12em] text-white/58">Centro de Control</span>
            </span>
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/28 bg-white/10 px-4 text-[12px] font-semibold text-white shadow-[0_14px_38px_rgba(12,2,5,0.22)] backdrop-blur-xl transition hover:border-white/55 hover:bg-white/17 sm:px-5"
          >
            Acceso al Centro de Control
            <ArrowUpRight size={15} strokeWidth={1.7} />
          </Link>
        </header>

        <div className="mx-auto flex min-h-[calc(92vh-104px)] w-full max-w-[1480px] items-end px-5 pb-10 sm:px-8 sm:pb-14 lg:items-center lg:px-12 lg:pb-24">
          <div className="w-full max-w-[760px]">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#d7b071]/35 bg-[#2e1018]/34 px-4 py-2 backdrop-blur-xl">
              <span className="h-px w-7 bg-[#ddb97d]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#ead1a4]">Fundada en 1854 · Aguascalientes</span>
            </div>
            <h1 className="mt-7 max-w-[720px] text-[clamp(48px,7.1vw,104px)] font-normal leading-[0.84] tracking-[-0.035em]" style={{ fontFamily: 'var(--font-display)' }}>
              Bienvenidos a la Hacienda.
            </h1>
            <p className="mt-7 max-w-[610px] text-[clamp(15px,1.45vw,20px)] font-light leading-8 text-white/76">
              El punto de entrada a una operación cuidada al detalle: hospitalidad, reservaciones, ventas y servicio reunidos para el equipo de Hacienda de Letras.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="inline-flex min-h-13 items-center gap-3 rounded-full border border-[#e8c996] bg-[#f5e7d5] px-6 text-[13px] font-bold !text-[#4c0b1d] shadow-[0_18px_46px_rgba(19,3,8,0.32)] transition hover:bg-white"
                style={{ color: '#4c0b1d' }}
              >
                Entrar al Centro de Control
                <ArrowUpRight size={17} strokeWidth={1.8} />
              </Link>
              <a href="#bienvenida" className="inline-flex min-h-13 items-center rounded-full border border-white/25 bg-black/10 px-6 text-[13px] font-medium text-white/88 backdrop-blur-lg transition hover:bg-white/10">
                Conocer el entorno
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="bienvenida" className="bg-[#f4ede4] px-5 py-16 text-[#2f211d] sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1360px]">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9a6d3f]">Una bienvenida con propósito</p>
              <h2 className="mt-4 max-w-[480px] text-[clamp(38px,5vw,68px)] font-normal leading-[0.94] tracking-[-0.025em] text-[#571024]" style={{ fontFamily: 'var(--font-display)' }}>
                Tradición al frente. Control detrás de cada experiencia.
              </h2>
            </div>
            <p className="max-w-[680px] text-[15px] leading-7 text-[#66544b] lg:justify-self-end">
              Este portal es la entrada oficial para el personal autorizado. La aplicación para visitantes funciona como un canal de venta y servicio conectado a la misma operación de Hacienda de Letras.
            </p>
          </div>

          <div className="mt-12 grid border-y border-[#cdb99e]/70 md:grid-cols-3">
            {operationalPillars.map(({ icon: Icon, title, copy }, index) => (
              <article key={title} className={`py-7 md:px-7 ${index > 0 ? 'border-t border-[#cdb99e]/70 md:border-l md:border-t-0' : ''}`}>
                <Icon size={21} strokeWidth={1.45} className="text-[#78162f]" />
                <h3 className="mt-5 text-[16px] font-semibold text-[#3c2821]">{title}</h3>
                <p className="mt-2 max-w-[340px] text-[13px] leading-6 text-[#75635a]">{copy}</p>
              </article>
            ))}
          </div>

          <footer className="mt-10 flex flex-col gap-5 text-[11px] text-[#7c6b61] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Hacienda de Letras. Todos los derechos reservados.</p>
            <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Información legal">
              <Link to="/politica-de-privacidad" className="hover:text-[#681126]">Política de Privacidad</Link>
              <Link to="/terminos-y-condiciones" className="hover:text-[#681126]">Términos y Condiciones</Link>
              <Link to="/eliminar-cuenta" className="hover:text-[#681126]">Eliminar cuenta</Link>
            </nav>
          </footer>
        </div>
      </section>
    </main>
  )
}
