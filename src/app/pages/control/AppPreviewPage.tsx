import { Navigate } from 'react-router-dom'
import { PhoneFrame } from '../../components/mobile/PhoneFrame'
import { SectionTitle } from '../../components/shared/SectionTitle'

export function AppPreviewPage() {
  return (
    <>
      <div className="hidden space-y-6 md:block">
        <SectionTitle
          eyebrow="Vista integrada"
          title="Hacienda de Letras App"
          subtitle="Experiencia cliente premium dentro del sistema operativo, conectada a la misma identidad editorial."
        />
        <div className="mx-auto max-w-[470px]">
          <PhoneFrame>
            <iframe
              src="/app/home"
              title="Hacienda de Letras App"
              className="h-full w-full border-0"
            />
          </PhoneFrame>
        </div>
      </div>
      <div className="md:hidden">
        <Navigate to="/app/home" replace />
      </div>
    </>
  )
}
