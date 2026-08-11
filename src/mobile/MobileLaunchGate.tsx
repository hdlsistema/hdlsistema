import { ArrowRight } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

const MINIMUM_SPLASH_MS = 850
const ONBOARDING_KEY = 'hdl-mobile-onboarding-v3'

const slides = [
  {
    title: 'Momentos inolvidables',
    copy: 'Vinos con historia, experiencias que perduran.',
    image: '/hacienda 2.jpg',
  },
  {
    title: 'La hacienda te espera',
    copy: 'Reserva, descubre y guarda cada momento desde un solo lugar.',
    image: '/Hacienda-de-Letras hacienda.jpg',
  },
]

function onboardingComplete() {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === 'complete'
  } catch {
    return false
  }
}

function completeOnboarding() {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, 'complete')
  } catch {
    // The app can continue when local storage is not available.
  }
}

export function MobileLaunchGate({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth()
  const [minimumElapsed, setMinimumElapsed] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimumElapsed(true)
      setShowOnboarding(!onboardingComplete())
    }, MINIMUM_SPLASH_MS)
    return () => window.clearTimeout(timer)
  }, [])

  if (isLoading || !minimumElapsed) return <MobileBrandSplash />
  if (showOnboarding) return <MobileOnboarding onComplete={() => { completeOnboarding(); setShowOnboarding(false) }} />

  return <>{children}</>
}

function MobileOnboarding({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0)
  const slide = slides[index]
  const isLast = index === slides.length - 1

  const advance = () => {
    if (isLast) onComplete()
    else setIndex((current) => current + 1)
  }

  return (
    <main className="mobile-onboarding" style={{ backgroundImage: `url(${slide.image})` }}>
      <div className="mobile-onboarding__veil" aria-hidden="true" />
      <div className="mobile-onboarding__content">
        <img src="/hacienda de letras logo 2.png" alt="Hacienda de Letras" className="mobile-onboarding__logo" />
        <div className="mobile-onboarding__copy">
          <p>Hacienda de Letras</p>
          <h1>{slide.title}</h1>
          <span className="mobile-onboarding__line" aria-hidden="true" />
          <p>{slide.copy}</p>
        </div>
        <div className="mobile-onboarding__actions">
          <button type="button" onClick={onComplete} className="mobile-onboarding__skip">Omitir</button>
          <div className="mobile-onboarding__dots" aria-label={`Paso ${index + 1} de ${slides.length}`}>
            {slides.map((item, itemIndex) => <span key={item.title} className={itemIndex === index ? 'is-active' : ''} />)}
          </div>
          <button type="button" onClick={advance} className="mobile-onboarding__next">
            {isLast ? 'Comenzar' : 'Siguiente'} <ArrowRight size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </main>
  )
}

export function MobileBrandSplash() {
  return (
    <main className="mobile-launch-screen" aria-label="Hacienda de Letras">
      <img
        src="/hacienda de letras logo 2.png"
        alt="Hacienda de Letras"
        className="mobile-launch-screen__logo"
      />
      <span className="mobile-launch-screen__line" aria-hidden="true" />
      <span className="mobile-launch-screen__loader" aria-label="Cargando" />
    </main>
  )
}
