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
      buttonClassName="min-h-11 rounded-[1rem] border-[rgba(180,138,85,0.34)] bg-[#fffaf3] px-3.5 text-[12px] font-semibold leading-tight text-[var(--color-ink)] shadow-[0_10px_22px_rgba(37,47,55,0.07)]"
      menuClassName="rounded-[1rem] border-[rgba(184,138,74,0.26)] bg-[#fffaf3] shadow-[0_18px_34px_rgba(45,18,12,0.18)]"
    />
  )
}
