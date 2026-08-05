import { Languages } from 'lucide-react'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import type { AppLanguage } from '../../i18n'

type LanguageSelectorProps = {
  variant?: 'light' | 'dark'
  compact?: boolean
}

export function LanguageSelector({ variant = 'light', compact = false }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useAppPreferences()
  const options: Array<{ value: AppLanguage; label: string; shortLabel: string }> = [
    { value: 'es', label: t('common.spanish'), shortLabel: 'ES' },
    { value: 'en', label: t('common.english'), shortLabel: 'EN' },
  ]
  const dark = variant === 'dark'

  return (
    <div
      className={[
        'inline-flex items-center gap-1 rounded-full border p-1',
        dark
          ? 'border-white/25 bg-white/12 text-white'
          : 'border-white/45 bg-[rgba(255,255,255,0.36)] text-[var(--color-burgundy)] shadow-[0_12px_28px_rgba(89,45,26,0.08)] backdrop-blur-2xl',
      ].join(' ')}
      aria-label={t('common.language')}
    >
      {!compact ? <Languages size={15} aria-hidden="true" /> : null}
      {options.map((option) => {
        const active = option.value === language
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            className={[
              'min-h-8 rounded-full px-3 text-[11px] font-bold transition',
              active
                ? dark
                  ? 'bg-white text-[var(--color-burgundy)]'
                  : 'bg-[var(--color-burgundy)] text-white'
                : dark
                  ? 'text-white/78 hover:bg-white/10'
                  : 'text-[var(--color-muted)] hover:bg-white/50',
            ].join(' ')}
            aria-pressed={active}
          >
            {compact ? option.shortLabel : option.label}
          </button>
        )
      })}
    </div>
  )
}
