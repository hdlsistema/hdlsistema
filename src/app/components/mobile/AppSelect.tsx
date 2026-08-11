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
      buttonClassName="min-h-12 rounded-[1.25rem] border-[rgba(184,138,74,0.28)] bg-[rgba(255,249,241,0.82)] px-4 text-[15px] text-[#2D1811] shadow-[0_18px_35px_rgba(70,34,18,0.12)]"
      menuClassName="rounded-[1.3rem] border-[rgba(184,138,74,0.26)] bg-[linear-gradient(180deg,rgba(255,250,243,0.98),rgba(246,235,221,0.98))] shadow-[0_24px_50px_rgba(45,18,12,0.22)]"
    />
  )
}
