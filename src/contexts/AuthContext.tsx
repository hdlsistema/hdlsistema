import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  getCurrentProfile,
  getCurrentRoles,
  ensureCustomerWelcome,
  completeInitialPasswordChange as completeInitialPasswordChangeService,
  signIn as signInService,
  signOut as signOutService,
  type AuthProfile,
  type UserRole,
} from '../services/auth.service'
import { adminUsersClient } from '../services/adminUsers.service'
import { appActivityEventKey, trackAppActivity } from '../services/appActivity.service'

const ADMIN_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'operations',
  'marketing',
  'finance',
  'viewer',
]
const ELEVATED_ADMIN_ROLES: UserRole[] = ['super_admin', 'admin']

type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: AuthProfile | null
  roles: UserRole[]
  permissions: string[]
  financialAccess: boolean
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean
  mustChangePassword: boolean
  hasRole: (role: UserRole | UserRole[]) => boolean
  hasPermission: (permission: string | string[]) => boolean
  signIn: (email: string, password: string, options?: { rememberSession?: boolean }) => Promise<UserRole[]>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  completeInitialPasswordChange: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [financialAccess, setFinancialAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [passwordChangeCompletedFor, setPasswordChangeCompletedFor] = useState<string | null>(null)
  const mounted = useRef(true)

  const loadIdentity = useCallback(async (nextSession: Session | null): Promise<UserRole[]> => {
    setSession(nextSession)
    setUser(nextSession?.user ?? null)

    if (!nextSession?.user) {
      setProfile(null)
      setRoles([])
      setPermissions([])
      setFinancialAccess(false)
      setPasswordChangeCompletedFor(null)
      return []
    }

    const [nextProfile, nextRoles] = await Promise.all([
      getCurrentProfile(nextSession.user.id),
      getCurrentRoles(nextSession.user.id),
      ensureCustomerWelcome(nextSession.access_token).catch(() => undefined),
    ])

    const elevatedAdmin = nextRoles.some((role) => ELEVATED_ADMIN_ROLES.includes(role))
    let nextPermissions: string[] = []
    let nextFinancialAccess = elevatedAdmin
    if (nextRoles.some((role) => ADMIN_ROLES.includes(role))) {
      try {
        const access = await adminUsersClient.currentAccess(nextSession.access_token)
        nextPermissions = access.data.permissions
        nextFinancialAccess = access.data.financialAccess || elevatedAdmin
      } catch {
        nextPermissions = []
        nextFinancialAccess = elevatedAdmin
      }
    }

    if (mounted.current) {
      setProfile(nextProfile)
      setRoles(nextRoles)
      setPermissions(nextPermissions)
      setFinancialAccess(nextFinancialAccess)
    }
    return nextRoles
  }, [])

  useEffect(() => {
    mounted.current = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted.current) return
      loadIdentity(data.session).finally(() => {
        if (mounted.current) setIsLoading(false)
      })
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      loadIdentity(nextSession).finally(() => {
        if (mounted.current) setIsLoading(false)
      })
    })

    return () => {
      mounted.current = false
      data.subscription.unsubscribe()
    }
  }, [loadIdentity])

  const signIn = useCallback(
    async (email: string, password: string, options?: { rememberSession?: boolean }) => {
      setIsLoading(true)
      try {
        const data = await signInService(email, password, options)
        const nextRoles = await loadIdentity(data.session)
        if (data.session?.user) {
          trackAppActivity({
            eventName: 'customer_login',
            entityType: 'customer',
            entityId: data.session.user.id,
            accessToken: data.session.access_token,
            metadata: { result: 'succeeded' },
            eventKey: appActivityEventKey('customer_login', data.session.user.id, 'session'),
          })
        }
        return nextRoles
      } finally {
        if (mounted.current) setIsLoading(false)
      }
    },
    [loadIdentity],
  )

  const signOut = useCallback(async () => {
    if (session?.user) {
      trackAppActivity({
        eventName: 'customer_logout',
        entityType: 'customer',
        entityId: session.user.id,
        accessToken: session.access_token,
        metadata: { result: 'succeeded' },
        eventKey: appActivityEventKey('customer_logout', session.user.id, 'session'),
      })
    }
    await signOutService()
    setSession(null)
    setUser(null)
    setProfile(null)
    setRoles([])
    setPermissions([])
    setFinancialAccess(false)
  }, [session])

  const refreshProfile = useCallback(async () => {
    await loadIdentity(session)
  }, [loadIdentity, session])

  const completeInitialPasswordChange = useCallback(async (password: string) => {
    if (!session?.access_token || !user?.id || !user.email) throw new Error('Sesión requerida')
    const result = await completeInitialPasswordChangeService(session.access_token, user.email, password)
    setPasswordChangeCompletedFor(user.id)
    await loadIdentity(result.session)
  }, [loadIdentity, session?.access_token, user?.email, user?.id])

  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => {
      const required = Array.isArray(role) ? role : [role]
      return required.some((item) => roles.includes(item))
    },
    [roles],
  )

  const hasPermission = useCallback(
    (permission: string | string[]) => {
      if (ELEVATED_ADMIN_ROLES.some((role) => roles.includes(role))) return true
      const required = Array.isArray(permission) ? permission : [permission]
      return required.some((item) => permissions.includes(item))
    },
    [permissions, roles],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      roles,
      permissions,
      financialAccess,
      isAuthenticated: Boolean(session),
      isLoading,
      isAdmin: ADMIN_ROLES.some((role) => roles.includes(role)),
      mustChangePassword: Boolean(user?.app_metadata?.must_change_password) && passwordChangeCompletedFor !== user?.id,
      hasRole,
      hasPermission,
      signIn,
      signOut,
      refreshProfile,
      completeInitialPasswordChange,
    }),
    [completeInitialPasswordChange, financialAccess, hasPermission, hasRole, isLoading, passwordChangeCompletedFor, permissions, profile, roles, session, signIn, signOut, user, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const adminRoles = ADMIN_ROLES
