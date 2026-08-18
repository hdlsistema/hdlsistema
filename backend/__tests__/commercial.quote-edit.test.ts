import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { patchQuoteRequestSchema } from '../src/modules/commercial/commercial.schemas'

const commercialService = readFileSync(new URL('../src/modules/commercial/commercial.service.ts', import.meta.url), 'utf8')
const executiveService = readFileSync(new URL('../src/modules/executiveAssistant/executiveAssistant.service.ts', import.meta.url), 'utf8')

describe('edición integral de cotizaciones', () => {
  it('acepta todos los campos editables de una cotización manual o recibida desde la app', () => {
    const payload = patchQuoteRequestSchema.parse({
      customerId: null,
      eventCategory: 'business',
      eventType: 'Cena empresarial',
      preferredDate: '2026-10-12',
      alternativeDate: '2026-10-19',
      preferredStartTime: '18:30',
      preferredEndTime: '23:00',
      guestCount: 120,
      venueSpaceId: null,
      venueSpaceName: 'Jardín Central',
      foodRequired: 'yes',
      foodType: 'Menú de tres tiempos',
      wineRequired: 'yes',
      wineOption: 'Maridaje Hacienda',
      requestedServices: ['Mobiliario', 'Música'],
      contactFirstName: 'Carlos',
      contactLastName: 'Salas',
      contactEmail: 'direccion@example.com',
      contactPhone: '4490000000',
      companyName: 'Hacienda de Letras',
      notes: 'Solicitud recibida desde la app',
      source: 'mobile_app',
      status: 'in_progress',
      adminNotes: 'Dar seguimiento hoy',
    })

    expect(payload.eventType).toBe('Cena empresarial')
    expect(payload.requestedServices).toEqual(['Mobiliario', 'Música'])
    expect(payload.source).toBe('mobile_app')
  })

  it('rechaza parches vacíos y valores operativos inválidos', () => {
    expect(() => patchQuoteRequestSchema.parse({})).toThrow()
    expect(() => patchQuoteRequestSchema.parse({ guestCount: 0 })).toThrow()
    expect(() => patchQuoteRequestSchema.parse({ preferredStartTime: '7pm' })).toThrow()
    expect(() => patchQuoteRequestSchema.parse({ unexpected: true })).toThrow()
  })

  it('persiste cada campo en su columna real y no consulta request_type inexistente', () => {
    for (const column of [
      'customer_id', 'event_category', 'event_type', 'preferred_date', 'alternative_date',
      'preferred_start_time', 'preferred_end_time', 'guest_count', 'venue_space_id',
      'venue_space_name', 'food_required', 'food_type', 'wine_required', 'wine_option',
      'requested_services', 'contact_first_name', 'contact_last_name', 'contact_email',
      'contact_phone', 'company_name', 'notes', 'source',
    ]) {
      expect(commercialService).toContain(`patch.${column}`)
    }
    expect(executiveService).not.toContain("select('status,request_type,guest_count,created_at')")
    expect(executiveService).toContain("select('status,event_category,source,guest_count,created_at')")
  })
})
