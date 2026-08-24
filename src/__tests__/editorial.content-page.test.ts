import { describe, expect, it } from 'vitest'
import { keepPublishedStateForSave } from '../app/pages/control/EditorialContentPage'

describe('EditorialContentPage published saves', () => {
  it('keeps a published record visible when saving editorial changes', () => {
    const payload = keepPublishedStateForSave(
      { publishStatus: 'published' },
      {
        id: 'wine-1',
        status: 'published',
        visible_in_app: true,
        name: 'Reserva Antigua',
        price: 500,
      },
      {
        name: 'Reserva Actualizada',
        price: 550,
        cover_image_url: 'https://cdn.hacienda.test/wines/reserva.webp',
      },
    )

    expect(payload).toMatchObject({
      status: 'published',
      visible_in_app: true,
      name: 'Reserva Actualizada',
      price: 550,
      cover_image_url: 'https://cdn.hacienda.test/wines/reserva.webp',
    })
  })
})
