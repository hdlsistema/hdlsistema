export type AppLanguage = 'es' | 'en'
export type AppLocale = 'es-MX' | 'en-US'

export const DEFAULT_LANGUAGE: AppLanguage = 'es'
export const DEFAULT_LOCALE: AppLocale = 'es-MX'
export const SUPPORTED_LOCALES: AppLocale[] = ['es-MX', 'en-US']

interface CopyTree {
  [key: string]: string | CopyTree
}

const dictionary = {
  es: {
    common: {
      language: 'Idioma',
      spanish: 'Español',
      english: 'English',
      loading: 'Cargando...',
      retry: 'Reintentar',
      unavailable: 'No disponible',
      datePending: 'Fecha por confirmar',
      timePending: 'Horario por confirmar',
      toBeConfirmed: 'Por confirmar',
      total: 'Total',
      status: {
        draft: 'Borrador',
        active: 'Activo',
        published: 'Publicado',
        pending: 'Pendiente',
        confirmed: 'Confirmada',
        cancelled: 'Cancelada',
        completed: 'Completada',
        pending_payment: 'Pendiente de pago',
        paid: 'Pagada',
        failed: 'Fallida',
        sent: 'Enviado',
        delivered: 'Entregado',
      },
      error: {
        session_required: 'Sesión requerida',
        invalid_credentials: 'Correo o contraseña incorrectos.',
        email_not_verified: 'Confirma tu correo antes de iniciar sesión.',
        rate_limited: 'Demasiados intentos. Intenta más tarde.',
        email_exists: 'Revisa tu correo para continuar el acceso.',
        auth_error: 'No fue posible completar la operación.',
        network_error: 'No fue posible conectar. Intenta de nuevo.',
        forbidden: 'No tienes permisos para esta acción.',
        not_found: 'No encontramos el registro solicitado.',
        unprocessable: 'Revisa la información capturada.',
        conflict: 'La acción no puede completarse con el estado actual.',
        internal: 'No fue posible completar la operación.',
      },
    },
    auth: {
      secureAccess: 'Acceso seguro',
      login: 'Iniciar sesión',
      loginNote: 'Entra con tu correo y contraseña. Los permisos se validan con roles reales.',
      email: 'Correo electrónico',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      forgotPassword: '¿Olvidaste tu contraseña?',
      noAccount: '¿Aún no tienes cuenta?',
      createAccount: 'Crear cuenta',
      customerAccount: 'Cuenta cliente',
      createAccountNote: 'Tu cuenta se crea con rol customer. No se aceptan permisos administrativos desde el registro.',
      firstName: 'Nombre',
      lastName: 'Apellido',
      phone: 'Teléfono',
      terms: 'Acepto términos, condiciones y aviso de privacidad.',
      verifyEmail: 'Verifica tu correo',
      accountCreated: 'Cuenta creada',
      verifyNote: 'Te enviamos un correo de verificación. Revisa tu bandeja antes de iniciar sesión.',
      resendVerification: 'Reenviar verificación',
      goToLogin: 'Ir a login',
      recovery: 'Recuperación',
      resetAccess: 'Restablecer acceso',
      recoveryNote: 'Te enviaremos un enlace seguro para definir una nueva contraseña.',
      recoverySent: 'Si el correo existe, recibirás un enlace de recuperación.',
      sendLink: 'Enviar enlace',
      newPassword: 'Nueva contraseña',
      definePassword: 'Define tu contraseña',
      resetNote: 'El enlace de Supabase abre esta pantalla y la sesión temporal se procesa sin mostrar tokens.',
      updatePassword: 'Actualizar contraseña',
      validatingSession: 'Validando sesión',
      validatingNote: 'Estamos verificando tu acceso sin mostrar tokens.',
      oneMoment: 'Un momento...',
      processing: 'Procesando...',
      showPassword: 'Mostrar contraseña',
      hidePassword: 'Ocultar contraseña',
      passwordMin: 'La contraseña debe tener al menos 8 caracteres.',
      passwordsMismatch: 'Las contraseñas no coinciden.',
      termsRequired: 'Debes aceptar términos y aviso de privacidad.',
    },
    app: {
      nav: {
        home: 'Inicio',
        store: 'Tienda',
        experiences: 'Reservación de experiencias',
        events: 'Eventos publicados',
        club: 'Wine Club',
        sommelier: 'Sommelier próximamente',
        map: 'Mapa de la hacienda',
        reservations: 'Mis reservaciones',
        profile: 'Perfil',
        account: 'Mi cuenta',
      },
      publishedContentError: 'No fue posible cargar el contenido publicado.',
      publishedExperience: 'Experiencia publicada',
      publishedDetails: 'Detalles publicados',
      liveAvailability: 'Disponibilidad en vivo',
      reserveLive: 'Reservar con disponibilidad real',
      loadingExperience: 'Cargando experiencia...',
      experienceNotFound: 'Experiencia no encontrada.',
      experienceUnavailable: 'Experiencia no disponible.',
      eventNotFound: 'Evento no encontrado.',
      wineNotFound: 'Vino no encontrado.',
      signInForAvailability: 'Inicia sesión para consultar disponibilidad customer y reservar.',
      loadingSlots: 'Cargando horarios...',
      noSlots: 'No hay horarios disponibles por ahora.',
      spots: 'lugares',
      spotsAvailable: 'lugares disponibles',
      from: 'Desde',
      duration: 'Duración',
      capacity: 'Cupo',
      location: 'Ubicación',
      minutes: 'minutos',
      people: 'personas',
      pickup: 'Recolección',
      createOrder: 'Crear orden',
      creatingOrder: 'Creando orden...',
      noCards: 'No se solicitan tarjetas y no se procesa pago en esta fase.',
      pickupOnly: 'La entrega se limita a recolección en Hacienda hasta aprobar reglas de envío.',
      backendTotals: 'Los totales se recalculan en backend antes de crear la orden.',
    },
    control: {
      groupMain: 'Centro de control app',
      groupAdditional: 'Funciones adicionales',
      dashboard: 'Dashboard',
      reservations: 'Reservaciones',
      wines: 'Vinos',
      experiences: 'Experiencias',
      events: 'Eventos',
      customers: 'Clientes',
      promotions: 'Promociones',
      memberships: 'Planes de membresía',
      campaigns: 'Campañas',
      availability: 'Disponibilidad',
      orders: 'Órdenes',
      payments: 'Pagos',
      inventory: 'Inventario',
      logistics: 'Logística',
      distributors: 'Distribuidores',
      appView: 'Vista App',
      reports: 'Reportes',
      settings: 'Configuración',
      operatingCenter: 'Centro de control operativo premium',
      alertCenter: 'Centro de alertas',
      notifications: 'Notificaciones y alertas',
      wineOfAguascalientes: 'El vino de Aguascalientes',
      tradition: 'Tradición que se vive, experiencia que permanece.',
    },
  },
  en: {
    common: {
      language: 'Language',
      spanish: 'Español',
      english: 'English',
      loading: 'Loading...',
      retry: 'Retry',
      unavailable: 'Unavailable',
      datePending: 'Date to be confirmed',
      timePending: 'Time to be confirmed',
      toBeConfirmed: 'To be confirmed',
      total: 'Total',
      status: {
        draft: 'Draft',
        active: 'Active',
        published: 'Published',
        pending: 'Pending',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        completed: 'Completed',
        pending_payment: 'Pending payment',
        paid: 'Paid',
        failed: 'Failed',
        sent: 'Sent',
        delivered: 'Delivered',
      },
      error: {
        session_required: 'Session required',
        invalid_credentials: 'Incorrect email or password.',
        email_not_verified: 'Confirm your email before signing in.',
        rate_limited: 'Too many attempts. Try again later.',
        email_exists: 'Check your email to continue access.',
        auth_error: 'The operation could not be completed.',
        network_error: 'Could not connect. Try again.',
        forbidden: 'You do not have permission for this action.',
        not_found: 'We could not find the requested record.',
        unprocessable: 'Review the submitted information.',
        conflict: 'The action cannot be completed in the current state.',
        internal: 'The operation could not be completed.',
      },
    },
    auth: {
      secureAccess: 'Secure access',
      login: 'Sign in',
      loginNote: 'Enter with your email and password. Permissions are validated with real roles.',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      forgotPassword: 'Forgot your password?',
      noAccount: 'Do not have an account yet?',
      createAccount: 'Create account',
      customerAccount: 'Customer account',
      createAccountNote: 'Your account is created with the customer role. Administrative permissions are not accepted from registration.',
      firstName: 'First name',
      lastName: 'Last name',
      phone: 'Phone',
      terms: 'I accept terms, conditions and privacy notice.',
      verifyEmail: 'Verify your email',
      accountCreated: 'Account created',
      verifyNote: 'We sent you a verification email. Check your inbox before signing in.',
      resendVerification: 'Resend verification',
      goToLogin: 'Go to login',
      recovery: 'Recovery',
      resetAccess: 'Reset access',
      recoveryNote: 'We will send you a secure link to define a new password.',
      recoverySent: 'If the email exists, you will receive a recovery link.',
      sendLink: 'Send link',
      newPassword: 'New password',
      definePassword: 'Define your password',
      resetNote: 'The Supabase link opens this screen and the temporary session is processed without showing tokens.',
      updatePassword: 'Update password',
      validatingSession: 'Validating session',
      validatingNote: 'We are verifying your access without showing tokens.',
      oneMoment: 'One moment...',
      processing: 'Processing...',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      passwordMin: 'Password must be at least 8 characters.',
      passwordsMismatch: 'Passwords do not match.',
      termsRequired: 'You must accept terms and privacy notice.',
    },
    app: {
      nav: {
        home: 'Home',
        store: 'Store',
        experiences: 'Experience booking',
        events: 'Published events',
        club: 'Wine Club',
        sommelier: 'Sommelier coming soon',
        map: 'Estate map',
        reservations: 'My bookings',
        profile: 'Profile',
        account: 'Account',
      },
      publishedContentError: 'Published content could not be loaded.',
      publishedExperience: 'Published experience',
      publishedDetails: 'Published details',
      liveAvailability: 'Live availability',
      reserveLive: 'Reserve with live availability',
      loadingExperience: 'Loading experience...',
      experienceNotFound: 'Experience not found.',
      experienceUnavailable: 'Experience not available.',
      eventNotFound: 'Event not found.',
      wineNotFound: 'Wine not found.',
      signInForAvailability: 'Sign in to see customer availability and reserve.',
      loadingSlots: 'Loading slots...',
      noSlots: 'No slots are available right now.',
      spots: 'spots',
      spotsAvailable: 'spots available',
      from: 'From',
      duration: 'Duration',
      capacity: 'Capacity',
      location: 'Location',
      minutes: 'minutes',
      people: 'people',
      pickup: 'Pickup',
      createOrder: 'Create order',
      creatingOrder: 'Creating order...',
      noCards: 'No cards are requested and no payment is processed in this phase.',
      pickupOnly: 'Fulfillment is limited to pickup at Hacienda until shipping rules are approved.',
      backendTotals: 'Totals are recalculated by the backend before creating the order.',
    },
    control: {
      groupMain: 'App control center',
      groupAdditional: 'Additional functions',
      dashboard: 'Dashboard',
      reservations: 'Reservations',
      wines: 'Wines',
      experiences: 'Experiences',
      events: 'Events',
      customers: 'Customers',
      promotions: 'Promotions',
      memberships: 'Membership Plans',
      campaigns: 'Campaigns',
      availability: 'Availability',
      orders: 'Orders',
      payments: 'Payments',
      inventory: 'Inventory',
      logistics: 'Logistics',
      distributors: 'Distributors',
      appView: 'App View',
      reports: 'Reports',
      settings: 'Settings',
      operatingCenter: 'Premium operational command center',
      alertCenter: 'Alert center',
      notifications: 'Notifications and alerts',
      wineOfAguascalientes: 'The wine of Aguascalientes',
      tradition: 'Tradition to live, experience to keep.',
    },
  },
} as const satisfies Record<AppLanguage, CopyTree>

export type TranslationKey = string

export function normalizeLanguage(value?: string | null): AppLanguage {
  if (value === 'en' || value === 'en-US') return 'en'
  return DEFAULT_LANGUAGE
}

export function languageToLocale(language: AppLanguage): AppLocale {
  return language === 'en' ? 'en-US' : 'es-MX'
}

export function normalizeLocale(value?: string | null): AppLocale {
  if (value === 'en' || value === 'en-US') return 'en-US'
  return DEFAULT_LOCALE
}

export function localeToLanguage(locale?: string | null): AppLanguage {
  return normalizeLocale(locale) === 'en-US' ? 'en' : 'es'
}

function readPath(source: CopyTree, key: string): string | null {
  let current: string | CopyTree | undefined = source
  for (const part of key.split('.')) {
    if (!current || typeof current !== 'object' || !(part in current)) return null
    current = current[part]
  }
  return typeof current === 'string' ? current : null
}

export function translate(language: AppLanguage, key: TranslationKey, fallback?: string): string {
  return readPath(dictionary[language], key) ?? readPath(dictionary.es, key) ?? fallback ?? key
}

export function formatCurrency(value: number | string | null | undefined, locale: AppLocale = DEFAULT_LOCALE, currency = 'MXN') {
  const amount = typeof value === 'string' ? Number(value) : Number(value ?? 0)
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
  if (currency !== 'MXN') return `${currency} ${formatted}`
  return locale === 'en-US' ? `MX$${formatted}` : `$${formatted} MXN`
}

export function formatNumber(value: number | string | null | undefined, locale: AppLocale = DEFAULT_LOCALE) {
  const amount = typeof value === 'string' ? Number(value) : Number(value ?? 0)
  return new Intl.NumberFormat(locale).format(Number.isFinite(amount) ? amount : 0)
}

export function formatDate(value: unknown, locale: AppLocale = DEFAULT_LOCALE, fallback?: string) {
  if (typeof value !== 'string' || !value) return fallback ?? translate(localeToLanguage(locale), 'common.datePending')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback ?? translate(localeToLanguage(locale), 'common.datePending')
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'America/Mexico_City' }).format(date)
}

export function formatDateTime(value: unknown, locale: AppLocale = DEFAULT_LOCALE, fallback?: string) {
  if (typeof value !== 'string' || !value) return fallback ?? translate(localeToLanguage(locale), 'common.toBeConfirmed')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback ?? translate(localeToLanguage(locale), 'common.toBeConfirmed')
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(date)
}

export function formatTimeRange(startValue: unknown, endValue: unknown, locale: AppLocale = DEFAULT_LOCALE) {
  if (typeof startValue !== 'string' || typeof endValue !== 'string') {
    return translate(localeToLanguage(locale), 'common.timePending')
  }
  const start = new Date(startValue)
  const end = new Date(endValue)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return translate(localeToLanguage(locale), 'common.timePending')
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })
  return `${formatter.format(start)} - ${formatter.format(end)}`
}

export function translateErrorCode(language: AppLanguage, code?: string | null, fallback?: string) {
  const normalized = String(code ?? '').toLowerCase()
  const keyMap: Record<string, string> = {
    invalid_credentials: 'common.error.invalid_credentials',
    email_not_verified: 'common.error.email_not_verified',
    rate_limited: 'common.error.rate_limited',
    email_exists: 'common.error.email_exists',
    auth_error: 'common.error.auth_error',
    unauthorized: 'common.error.session_required',
    forbidden: 'common.error.forbidden',
    not_found: 'common.error.not_found',
    unprocessable: 'common.error.unprocessable',
    conflict: 'common.error.conflict',
    internal_error: 'common.error.internal',
  }
  return translate(language, keyMap[normalized] ?? 'common.error.internal', fallback)
}
