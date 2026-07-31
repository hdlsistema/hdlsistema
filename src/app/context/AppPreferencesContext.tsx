import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AppLanguage = 'es' | 'en'

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
  locale: string
  isEnglish: boolean
}

const STORAGE_KEY = 'hdl-os-preferences-v1'

const defaultPreferences: AppPreferencesState = {
  adminName: 'Director General',
  adminRole: 'Administrador',
  adminEmail: 'direccion@haciendadeletras.mx',
  language: 'es',
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
      language:
        parsed.language === 'en' ? 'en' : defaultPreferences.language,
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
    document.documentElement.lang = preferences.language
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

    return {
      ...preferences,
      setAdminName: (adminName) => updatePreferences({ adminName }),
      setAdminRole: (adminRole) => updatePreferences({ adminRole }),
      setAdminEmail: (adminEmail) => updatePreferences({ adminEmail }),
      setLanguage: (language) => updatePreferences({ language }),
      updatePreferences,
      locale:
        preferences.language === 'en' ? 'en-US' : 'es-MX',
      isEnglish: preferences.language === 'en',
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
