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

const STORAGE_KEY = 'hdl-os-preferences-v1'

const defaultPreferences: AppPreferencesState = {
  adminName: 'Director General',
  adminRole: 'Administrador',
  adminEmail: 'direccion@haciendadeletras.mx',
  language: DEFAULT_LANGUAGE,
}

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null)

function readStoredPreferences(): AppPreferencesState {
  if (typeof window === 'undefined') {
    return defaultPreferences
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return defaultPreferences
    }

    const parsed = JSON.parse(raw) as Partial<AppPreferencesState>

    return {
      adminName:
        typeof parsed.adminName === 'string' && parsed.adminName.trim()
          ? parsed.adminName
          : defaultPreferences.adminName,
      adminRole:
        typeof parsed.adminRole === 'string' && parsed.adminRole.trim()
          ? parsed.adminRole
          : defaultPreferences.adminRole,
      adminEmail:
        typeof parsed.adminEmail === 'string' && parsed.adminEmail.trim()
          ? parsed.adminEmail
          : defaultPreferences.adminEmail,
      language: normalizeLanguage(parsed.language),
    }
  } catch {
    return defaultPreferences
  }
}

export function AppPreferencesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [preferences, setPreferences] = useState<AppPreferencesState>(
    () => readStoredPreferences(),
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(preferences),
    )
    document.documentElement.lang = languageToLocale(preferences.language)
  }, [preferences])

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
