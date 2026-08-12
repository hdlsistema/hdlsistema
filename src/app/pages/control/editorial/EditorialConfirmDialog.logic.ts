export type EditorialConfirmAction =
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'restore'
  | 'restoreVersion'
  | 'duplicate'
  | 'schedule'
  | 'retire'

export type EditorialConfirmCopy = {
  title: string
  message: string
  confirmLabel: string
  impact: string
  tone: 'default' | 'warning'
  afterStatus: string
  visibleAfter: boolean
}

export type EditorialConfirmState = {
  action: EditorialConfirmAction
  title: string
  contentLabel: string
  message: string
  confirmLabel: string
  impact: string
  tone: 'default' | 'warning'
  currentStatus: string
  afterStatus: string
  visibleAfter: boolean
}

export const editorialConfirmCopies: Record<EditorialConfirmAction, EditorialConfirmCopy> = {
  publish: {
    title: 'Confirmar publicación',
    message: 'Al publicar este contenido, será visible para clientes en la app si cumple las reglas de publicación.',
    confirmLabel: 'Publicar contenido',
    impact: 'El contenido podrá aparecer para clientes cuando también esté marcado como visible en app.',
    tone: 'default',
    afterStatus: 'Publicado',
    visibleAfter: true,
  },
  unpublish: {
    title: 'Confirmar despublicación',
    message: 'Este contenido dejará de estar visible para clientes, pero seguirá disponible en el Centro de Control.',
    confirmLabel: 'Despublicar',
    impact: 'La app del cliente dejará de mostrar este contenido.',
    tone: 'default',
    afterStatus: 'Despublicado',
    visibleAfter: false,
  },
  archive: {
    title: 'Confirmar archivo',
    message: 'Este contenido se ocultará y quedará fuera de operación. Podrás restaurarlo después si es necesario.',
    confirmLabel: 'Archivar contenido',
    impact: 'El contenido quedará fuera de uso operativo y no será visible para clientes.',
    tone: 'warning',
    afterStatus: 'Archivado',
    visibleAfter: false,
  },
  restore: {
    title: 'Confirmar restauración',
    message: 'Este contenido volverá a estar disponible para edición y gestión editorial.',
    confirmLabel: 'Restaurar',
    impact: 'El contenido volverá al flujo editorial sin publicarse automáticamente.',
    tone: 'default',
    afterStatus: 'Borrador',
    visibleAfter: false,
  },
  restoreVersion: {
    title: 'Confirmar restauración de versión',
    message: 'Se reemplazará la versión actual con una versión anterior. Revisa que sea la versión correcta antes de continuar.',
    confirmLabel: 'Restaurar esta versión',
    impact: 'La versión actual será reemplazada por el contenido histórico seleccionado.',
    tone: 'warning',
    afterStatus: 'Versión restaurada',
    visibleAfter: false,
  },
  duplicate: {
    title: 'Confirmar duplicado',
    message: 'Se creará una copia editable como borrador. La copia no se publicará automáticamente.',
    confirmLabel: 'Duplicar como borrador',
    impact: 'El duplicado quedará oculto para clientes hasta que se publique.',
    tone: 'default',
    afterStatus: 'Borrador',
    visibleAfter: false,
  },
  schedule: {
    title: 'Confirmar programación',
    message: 'El contenido se publicará automáticamente en la fecha y hora indicada.',
    confirmLabel: 'Programar publicación',
    impact: 'Las fechas se programan usando el horario local configurado para Hacienda.',
    tone: 'default',
    afterStatus: 'Programado',
    visibleAfter: true,
  },
  retire: {
    title: 'Confirmar retiro',
    message: 'Este contenido será retirado de la vista editorial principal. Permanecerá disponible en el historial interno.',
    confirmLabel: 'Retirar contenido',
    impact: 'El contenido saldrá del listado principal y quedará oculto para clientes.',
    tone: 'warning',
    afterStatus: 'Retirado',
    visibleAfter: false,
  },
}

export function buildEditorialConfirmState(input: {
  action: EditorialConfirmAction
  contentLabel: string
  currentStatus: string
  afterStatus?: string
  visibleAfter?: boolean
}): EditorialConfirmState {
  const copy = editorialConfirmCopies[input.action]
  return {
    action: input.action,
    title: copy.title,
    contentLabel: input.contentLabel,
    message: copy.message,
    confirmLabel: copy.confirmLabel,
    impact: copy.impact,
    tone: copy.tone,
    currentStatus: input.currentStatus,
    afterStatus: input.afterStatus ?? copy.afterStatus,
    visibleAfter: input.visibleAfter ?? copy.visibleAfter,
  }
}

export function actionErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status)
    if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    if (status === 403) return 'No tienes permisos para realizar esta acción.'
    if (status === 422) return 'Revisa los datos antes de continuar.'
    if (status >= 500) return 'No fue posible completar la acción. Intenta nuevamente.'
  }

  if (error instanceof TypeError || (error instanceof Error && error.message.toLowerCase().includes('network'))) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.'
  }

  return 'No fue posible completar la acción. Intenta nuevamente.'
}

export async function runConfirmedEditorialAction(action: () => Promise<void>) {
  await action()
}

export function cancelConfirmedEditorialAction(onCancel: () => void) {
  onCancel()
}

export function validateEditorialSchedule(runAt: string, now = Date.now()) {
  if (!runAt) return 'Selecciona una fecha para programar.'
  const timestamp = new Date(runAt).getTime()
  if (Number.isNaN(timestamp)) return 'Selecciona una fecha válida para programar.'
  if (timestamp <= now) return 'La programación debe ser futura.'
  return null
}
