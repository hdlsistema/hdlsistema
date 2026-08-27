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

export const APP_LANGUAGE_STORAGE_KEY = 'hdl.app.language'

function readStoredLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  try {
    const storedLanguage = window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)
    return storedLanguage === 'en' || storedLanguage === 'es'
      ? normalizeLanguage(storedLanguage)
      : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function persistStoredLanguage(language: AppLanguage) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Local persistence is a convenience; the profile sync remains the source of record.
  }
}

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null)

export function AppPreferencesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [preferences, setPreferences] = useState<AppPreferencesState>(() => ({
    ...defaultPreferences,
    language: readStoredLanguage(),
  }))

  useEffect(() => {
    document.documentElement.lang = languageToLocale(preferences.language)
  }, [preferences.language])

  const value = useMemo<AppPreferencesContextValue>(() => {
    const updatePreferences = (
      nextValues: Partial<AppPreferencesState>,
    ) => {
      const normalizedValues = nextValues.language
        ? { ...nextValues, language: normalizeLanguage(nextValues.language) }
        : nextValues
      if (normalizedValues.language) persistStoredLanguage(normalizedValues.language)
      setPreferences((current) => ({
        ...current,
        ...normalizedValues,
      }))
    }

    const locale = languageToLocale(preferences.language)
    const t = (key: TranslationKey, fallback?: string) => translate(preferences.language, key, fallback)

    return {
      ...preferences,
      setAdminName: (adminName) => updatePreferences({ adminName }),
      setAdminRole: (adminRole) => updatePreferences({ adminRole }),
      setAdminEmail: (adminEmail) => updatePreferences({ adminEmail }),
      setLanguage: (language) => updatePreferences({ language }),
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
