import { CrystalSelect } from '../shared/CrystalSelect'

type AppSelectOption = {
  value: string
  label: string
}

type AppSelectProps = {
  value: string
  onChange: (value: string) => void
  options: AppSelectOption[]
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

export function AppSelect({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
  className,
}: AppSelectProps) {
  return (
    <CrystalSelect
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      disabled={disabled}
      className={className}
      buttonClassName="min-h-12 rounded-[1.25rem] border-[rgba(180,138,85,0.34)] bg-[linear-gradient(135deg,rgba(247,242,234,0.92),rgba(232,216,200,0.72))] px-4 text-[15px] text-[var(--color-ink)] shadow-[0_18px_35px_rgba(37,47,55,0.1)]"
      menuClassName="rounded-[1.3rem] border-[rgba(184,138,74,0.26)] bg-[linear-gradient(180deg,rgba(255,250,243,0.98),rgba(246,235,221,0.98))] shadow-[0_24px_50px_rgba(45,18,12,0.22)]"
    />
  )
}
