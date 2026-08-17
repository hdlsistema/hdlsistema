import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_LANGUAGE,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatTimeRange,
  languageToLocale,
  normalizeLanguage,
  translate,
  type AppLanguage,
  type AppLocale,
  type TranslationKey,
} from '../i18n'

export type { AppLanguage }

export type AppPreferencesState = {
  adminName: string
  adminRole: string
  adminEmail: string
  language: AppLanguage
}

type AppPreferencesContextValue = AppPreferencesState & {
  setAdminName: (value: string) => void
  setAdminRole: (value: string) => void
  setAdminEmail: (value: string) => void
  setLanguage: (value: AppLanguage) => void
  updatePreferences: (value: Partial<AppPreferencesState>) => void
  locale: AppLocale
  isEnglish: boolean
  t: (key: TranslationKey, fallback?: string) => string
  formatCurrency: (value: number | string | null | undefined, currency?: string) => string
  formatDate: (value: unknown, fallback?: string) => string
  formatDateTime: (value: unknown, fallback?: string) => string
  formatTimeRange: (startValue: unknown, endValue: unknown) => string
  formatNumber: (value: number | string | null | undefined) => string
}

const defaultPreferences: AppPreferencesState = {
  adminName: 'Director General',
  adminRole: 'Administrador',
  adminEmail: 'direccion@haciendadeletras.mx',
  language: DEFAULT_LANGUAGE,
}

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null)

export function AppPreferencesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [preferences, setPreferences] = useState<AppPreferencesState>(defaultPreferences)

  useEffect(() => {
    document.documentElement.lang = languageToLocale(preferences.language)
  }, [preferences.language])

  const value = useMemo<AppPreferencesContextValue>(() => {
    const updatePreferences = (
      nextValues: Partial<AppPreferencesState>,
    ) => {
      setPreferences((current) => ({
        ...current,
        ...nextValues,
      }))
    }

    const locale = languageToLocale(preferences.language)
    const t = (key: TranslationKey, fallback?: string) => translate(preferences.language, key, fallback)

    return {
      ...preferences,
      setAdminName: (adminName) => updatePreferences({ adminName }),
      setAdminRole: (adminRole) => updatePreferences({ adminRole }),
      setAdminEmail: (adminEmail) => updatePreferences({ adminEmail }),
      setLanguage: (language) => updatePreferences({ language: normalizeLanguage(language) }),
      updatePreferences,
      locale,
      isEnglish: preferences.language === 'en',
      t,
      formatCurrency: (value, currency = 'MXN') => formatCurrency(value, locale, currency),
      formatDate: (value, fallback) => formatDate(value, locale, fallback),
      formatDateTime: (value, fallback) => formatDateTime(value, locale, fallback),
      formatTimeRange: (startValue, endValue) => formatTimeRange(startValue, endValue, locale),
      formatNumber: (value) => formatNumber(value, locale),
    }
  }, [preferences])

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  )
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext)

  if (!context) {
    throw new Error(
      'useAppPreferences must be used within AppPreferencesProvider',
    )
  }

  return context
}
