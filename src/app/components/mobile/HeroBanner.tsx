type HeroBannerProps = {
  title: string
  subtitle: string
  image: string
}

export function HeroBanner({ title, subtitle, image }: HeroBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-[1.55rem] border border-[rgba(220,202,181,0.78)] shadow-[var(--shadow-card)]">
      <img src={image} alt={title} className="h-[286px] w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(63,24,14,0.05)_0%,rgba(53,20,12,0.12)_28%,rgba(33,15,12,0.66)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,rgba(20,10,6,0)_0%,rgba(20,10,6,0.22)_30%,rgba(20,10,6,0.78)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <div className="max-w-[238px]">
          <h3 className="text-[1.7rem] font-medium leading-[1] text-white">{title}</h3>
          <p className="mt-3 text-[12px] leading-5 text-[rgba(255,243,229,0.94)]">{subtitle}</p>
          <button
            type="button"
            className="mt-5 rounded-full border border-white/20 bg-[rgba(105,13,43,.82)] px-5 py-3 text-[12px] font-semibold text-white shadow-[0_10px_20px_rgba(79,15,31,0.2)] backdrop-blur-xl"
          >
            Descubre la experiencia
          </button>
        </div>
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 justify-center gap-2">
        <span className="h-3 w-3 rounded-full bg-white" />
        <span className="h-3 w-3 rounded-full bg-[rgba(221,189,109,0.95)]" />
      </div>
    </section>
  )
}
