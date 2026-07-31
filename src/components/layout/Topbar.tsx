export function Topbar() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Hacienda de Letras</p>
          <h1 className="text-lg font-semibold text-stone-900">Maqueta navegable</h1>
        </div>
        <p className="text-sm text-stone-500">React + Vite + Tailwind</p>
      </div>
    </header>
  )
}
