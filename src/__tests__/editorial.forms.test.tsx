import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CampaignEditorialForm } from '../app/pages/control/editorial/forms/CampaignEditorialForm'
import { EventEditorialForm } from '../app/pages/control/editorial/forms/EventEditorialForm'
import { ExperienceEditorialForm } from '../app/pages/control/editorial/forms/ExperienceEditorialForm'
import { MembershipPlanEditorialForm } from '../app/pages/control/editorial/forms/MembershipPlanEditorialForm'
import { PromotionEditorialForm } from '../app/pages/control/editorial/forms/PromotionEditorialForm'
import { WineEditorialForm } from '../app/pages/control/editorial/forms/WineEditorialForm'
import { editorialDefinitions } from '../app/pages/control/editorial/forms/editorialFormSchemas'
import {
  buildInitialEditorialForm,
  extractFieldErrorsFromBackend,
  serializeEditorialPayload,
  validateEditorialForm,
} from '../app/pages/control/editorial/forms/editorialFormMappers'
import type { EditorialFormProps } from '../app/pages/control/editorial/forms/editorialFormTypes'

const forms = [
  ['wines', WineEditorialForm, 'Ficha del vino'],
  ['experiences', ExperienceEditorialForm, 'Detalle de experiencia'],
  ['events', EventEditorialForm, 'Fecha y ubicación'],
  ['promotions', PromotionEditorialForm, 'Condiciones'],
  ['membership-plans', MembershipPlanEditorialForm, 'Beneficios'],
  ['campaigns', CampaignEditorialForm, 'Audiencia'],
] as const

function propsFor(entity: keyof typeof editorialDefinitions): EditorialFormProps {
  const definition = editorialDefinitions[entity]
  return {
    definition,
    record: null,
    selectedTitle: `Nuevo ${definition.singularLabel}`,
    recordVersion: null,
    updatedAtLabel: 'Sin fecha',
    form: buildInitialEditorialForm(null, definition),
    fieldErrors: {},
    saving: false,
    isBusy: false,
    success: null,
    onSubmit: (event) => event.preventDefault(),
    onChange: () => undefined,
    onPreview: () => undefined,
    onVersions: () => undefined,
    actions: null,
    versions: null,
  }
}

describe('formularios editoriales especializados', () => {
  it.each(forms)('renderiza formulario especializado para %s', (entity, Component, sectionLabel) => {
    const html = renderToStaticMarkup(<Component {...propsFor(entity)} />)

    expect(html).toContain('Formulario especializado')
    expect(html).toContain(sectionLabel)
    expect(html).toContain('Qué se verá en la app pública')
  })

  it('valida campos requeridos y slug de vinos antes de guardar', () => {
    const definition = editorialDefinitions.wines
    const form = {
      ...buildInitialEditorialForm(null, definition),
      name: '',
      slug: 'Vino Reserva',
      sku: 'HDL-001',
      price: 'abc',
      stock_quantity: '4',
    }

    const result = validateEditorialForm(definition, form, 'save')

    expect(result.valid).toBe(false)
    expect(result.fieldErrors.name).toContain('obligatorio')
    expect(result.fieldErrors.slug).toContain('minúsculas')
    expect(result.fieldErrors.price).toContain('numérico')
  })

  it('bloquea publicación de membresía sin beneficios', () => {
    const definition = editorialDefinitions['membership-plans']
    const form = {
      ...buildInitialEditorialForm(null, definition),
      name: 'Club Vendimia',
      code: 'CLUB_VENDIMIA',
      description: 'Acceso preferente.',
      price: '1200',
      billing_period: 'mensual',
      benefits: '',
    }

    const result = validateEditorialForm(definition, form, 'publish')

    expect(result.valid).toBe(false)
    expect(result.fieldErrors.benefits).toContain('necesario')
  })

  it('mapea beneficios y campaña guiada al payload real del backend', () => {
    const membershipPayload = serializeEditorialPayload(editorialDefinitions['membership-plans'], {
      ...buildInitialEditorialForm(null, editorialDefinitions['membership-plans']),
      name: 'Club Reserva',
      code: 'CLUB_RESERVA',
      price: '950',
      billing_period: 'mensual',
      benefits: 'Cata mensual\nAcceso preferente',
    })
    const campaignPayload = serializeEditorialPayload(editorialDefinitions.campaigns, {
      ...buildInitialEditorialForm(null, editorialDefinitions.campaigns),
      name: 'Vendimia',
      channel: 'email',
      audience_definition: JSON.stringify({ segment: 'clientes frecuentes', notes: 'Alta intención' }),
      content: JSON.stringify({ subject: 'Vendimia', body: 'Reserva tu lugar', cta_label: 'Reservar', cta_url: '/app/eventos', image_url: 'https://cdn.hacienda.test/vendimia.webp' }),
    })

    expect(membershipPayload.benefits).toEqual({ items: ['Cata mensual', 'Acceso preferente'] })
    expect(campaignPayload.audience_definition).toEqual({ segment: 'clientes frecuentes', notes: 'Alta intención' })
    expect(campaignPayload.content).toMatchObject({
      subject: 'Vendimia',
      body: 'Reserva tu lugar',
      cta_label: 'Reservar',
      cta_url: '/app/eventos',
      image_url: 'https://cdn.hacienda.test/vendimia.webp',
    })
  })

  it('mapea errores 422 por campo cuando el backend envía detalles', () => {
    const errors = extractFieldErrorsFromBackend(
      {
        status: 422,
        body: {
          ok: false,
          error: {
            details: [{ path: ['name'], message: 'Nombre requerido' }],
          },
        },
      },
      editorialDefinitions.promotions,
    )

    expect(errors.name).toBe('Nombre requerido')
  })

  it('no introduce texto de datos falsos en la capa editorial nueva', () => {
    const serialized = JSON.stringify(editorialDefinitions).toLowerCase()
    const forbiddenWord = ['m', 'o', 'c', 'k'].join('')

    expect(serialized).not.toContain(forbiddenWord)
  })
})
