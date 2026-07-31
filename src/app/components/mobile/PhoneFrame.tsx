import type { ReactNode } from 'react'

type PhoneFrameProps = {
  children: ReactNode
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="mx-auto h-[900px] w-full max-w-[430px] rounded-[2.75rem] border border-[rgba(90,70,54,0.18)] bg-[linear-gradient(180deg,#f7f1e7,#f0e2d2)] p-3 shadow-[0_24px_70px_rgba(43,29,24,0.18)] max-md:h-auto max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none">
      <div className="mx-auto mb-3 h-1.5 w-28 rounded-full bg-[rgba(43,29,24,0.12)] max-md:hidden" />
      <div className="h-[870px] overflow-hidden rounded-[2.2rem] border border-[rgba(90,70,54,0.14)] bg-white max-md:h-auto max-md:rounded-none max-md:border-0">
        {children}
      </div>
    </div>
  )
}
