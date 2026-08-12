import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { EditorialConfirmDialog } from '../app/pages/control/editorial/EditorialConfirmDialog'
import {
  actionErrorMessage,
  buildEditorialConfirmState,
  cancelConfirmedEditorialAction,
  editorialConfirmCopies,
  runConfirmedEditorialAction,
  validateEditorialSchedule,
  type EditorialConfirmAction,
} from '../app/pages/control/editorial/EditorialConfirmDialog.logic'

const criticalActions: EditorialConfirmAction[] = [
  'publish',
  'unpublish',
  'archive',
  'restore',
  'restoreVersion',
  'duplicate',
  'schedule',
  'retire',
]

describe('confirmaciones editoriales críticas', () => {
  it('abre confirmación antes de publicar con visibilidad pública clara', () => {
    const state = buildEditorialConfirmState({
      action: 'publish',
      contentLabel: 'Reserva Especial',
      currentStatus: 'Borrador',
      afterStatus: 'Publicado',
      visibleAfter: true,
    })
    const html = renderToStaticMarkup(
      <EditorialConfirmDialog
        state={state}
        loading={false}
        error={null}
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    )

    expect(html).toContain('Confirmar publicación')
    expect(html).toContain('Al publicar este contenido')
    expect(html).toContain('Reserva Especial')
    expect(html).toContain('Ahora')
    expect(html).toContain('Publicado')
    expect(html).toContain('Visible para clientes')
    expect(html).toContain('Sí')
  })

  it('cancelar publicación no llama API', () => {
    const apiCall = vi.fn()
    const onCancel = vi.fn()

    cancelConfirmedEditorialAction(onCancel)

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(apiCall).not.toHaveBeenCalled()
  })

  it('confirmar publicación llama API real del cliente editorial', async () => {
    const apiCall = vi.fn().mockResolvedValue(undefined)

    await runConfirmedEditorialAction(apiCall)

    expect(apiCall).toHaveBeenCalledTimes(1)
  })

  it('error al publicar mantiene diálogo abierto con mensaje humano', () => {
    const state = buildEditorialConfirmState({
      action: 'publish',
      contentLabel: 'Reserva Especial',
      currentStatus: 'Borrador',
    })
    const html = renderToStaticMarkup(
      <EditorialConfirmDialog
        state={state}
        loading={false}
        error="No tienes permisos para realizar esta acción."
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    )

    expect(html).toContain('No tienes permisos para realizar esta acción.')
    expect(html).toContain('Publicar contenido')
  })

  it.each(criticalActions)('%s requiere confirmación con microcopy humano', (action) => {
    const state = buildEditorialConfirmState({
      action,
      contentLabel: 'Contenido editorial',
      currentStatus: 'Borrador',
    })

    expect(state.title).toBeTruthy()
    expect(state.message).toBe(editorialConfirmCopies[action].message)
    expect(state.confirmLabel).toBe(editorialConfirmCopies[action].confirmLabel)
    expect(state.currentStatus).toBe('Borrador')
  })

  it('programar valida fecha futura', () => {
    expect(validateEditorialSchedule('')).toBe('Selecciona una fecha para programar.')
    expect(validateEditorialSchedule('fecha')).toBe('Selecciona una fecha válida para programar.')
    expect(validateEditorialSchedule('2026-01-01T10:00', new Date('2026-01-01T11:00').getTime())).toBe('La programación debe ser futura.')
    expect(validateEditorialSchedule('2026-01-01T12:00', new Date('2026-01-01T11:00').getTime())).toBeNull()
  })

  it('restaurar versión usa advertencia sobria y confirmación explícita', () => {
    const state = buildEditorialConfirmState({
      action: 'restoreVersion',
      contentLabel: 'Reserva Especial · Versión 2',
      currentStatus: 'Publicado',
    })

    expect(state.tone).toBe('warning')
    expect(state.confirmLabel).toBe('Restaurar esta versión')
    expect(state.message).toContain('Se reemplazará la versión actual')
  })

  it('401 y 403 muestran mensajes seguros', () => {
    expect(actionErrorMessage({ status: 401 })).toBe('Tu sesión expiró. Vuelve a iniciar sesión.')
    expect(actionErrorMessage({ status: 403 })).toBe('No tienes permisos para realizar esta acción.')
  })
})
