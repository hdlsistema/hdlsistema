import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { publicCommercialClient } from '../services/commercial.service'
import { publicContentClient, type ContentRecord } from '../services/content.service'
import { imageField, numberField, textField } from '../app/utils/publicContent'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers: { 'Content-Type': 'application/json' },
  })
}

const requiredWineNames = [
  'Ruby Amor Eterno',
  'Precioso Regalo',
  '3 Mosqueteros',
  'El Greco',
  'Muscat',
  'D’Artagnan',
  'Phortos',
  'Athos',
  'Dulce Apapacho',
]

const requiredExperienceNames = [
  'Cata de vinos',
  'Recorrido por los viñedos',
  'Degustación de 5 vinos',
  'Picnic entre viñedos',
  'Cena romántica en la Cava',
]

function wineRecord(name: string, index: number): ContentRecord {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .toLocaleLowerCase('es-MX')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return {
    id: `wine-${index + 1}`,
    slug,
    name,
    price: index === 3 ? 350 : 300,
    cover_image_url: `https://sjixkireayiwunabhttq.supabase.co/storage/v1/object/public/wines/catalog/${slug}-cover.webp`,
    visible_in_app: true,
    status: 'published',
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('mobile runtime server-driven content', () => {
  it('consume vinos publicos sin Authorization y transforma 9 cards con imagen y precio', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: requiredWineNames.map(wineRecord),
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await publicContentClient.list('wines', { locale: 'es-MX' })
    const cards = response.data.map((wine) => ({
      name: textField(wine, 'name'),
      price: numberField(wine, 'price'),
      image: imageField(wine, ''),
    }))

    expect(cards).toHaveLength(9)
    expect(cards.map((card) => card.name)).toEqual(requiredWineNames)
    expect(cards.every((card) => card.price > 0)).toBe(true)
    expect(cards.every((card) => card.image.startsWith('https://sjixkireayiwunabhttq.supabase.co/storage/v1/object/public/wines/catalog/'))).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/public/wines?locale=es-MX',
      expect.not.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    )
  })

  it('consume experiencias publicas con 5 registros e imagen desde Storage', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: requiredExperienceNames.map((title, index) => ({
          id: `experience-${index + 1}`,
          slug: title.toLocaleLowerCase('es-MX').replace(/\s+/g, '-'),
          title,
          base_price: index === 4 ? 4000 : 300,
          cover_image_url: `https://sjixkireayiwunabhttq.supabase.co/storage/v1/object/public/services/experiences/experience-${index + 1}.webp`,
          visible_in_app: true,
          status: 'published',
        })),
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await publicContentClient.list('experiences', { locale: 'es-MX' })

    expect(response.data).toHaveLength(5)
    expect(response.data.map((item) => textField(item, 'title'))).toEqual(requiredExperienceNames)
    expect(response.data.every((item) => imageField(item, '').includes('/services/experiences/'))).toBe(true)
  })

  it('consume servicios comerciales publicos para cabañas, restaurante y espacios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          experiences: [],
          cabins: ['Paquete Cabaña', 'Paquete Vino', 'Paquete Romántico'].map((name, index) => ({
            id: `cabin-${index + 1}`,
            slug: name.toLocaleLowerCase('es-MX').replace(/\s+/g, '-'),
            name,
            title: name,
            price: 5100,
            currency: 'MXN',
            description: 'Paquete publicado',
            coverImageUrl: `https://sjixkireayiwunabhttq.supabase.co/storage/v1/object/public/services/cabins/cabin-${index + 1}.webp`,
          })),
          restaurants: [{
            id: 'restaurant-1',
            slug: 'restaurante-hacienda-de-letras',
            name: 'Restaurante Hacienda de Letras',
            title: 'Restaurante Hacienda de Letras',
            price: 0,
            currency: 'MXN',
            coverImageUrl: 'https://sjixkireayiwunabhttq.supabase.co/storage/v1/object/public/services/restaurants/restaurante-hacienda-de-letras-cover.webp',
          }],
          venueSpaces: [{ id: 'space-1', slug: 'cava', name: 'Cava', title: 'Cava', price: 0, currency: 'MXN' }],
        },
      }),
    ))

    const response = await publicCommercialClient.services()

    expect(response.data.cabins.map((item) => item.name)).toEqual(['Paquete Cabaña', 'Paquete Vino', 'Paquete Romántico'])
    expect(response.data.restaurants.map((item) => item.name)).toEqual(['Restaurante Hacienda de Letras'])
    expect(response.data.venueSpaces).toHaveLength(1)
    expect(response.data.cabins.every((item) => item.coverImageUrl?.includes('/services/cabins/'))).toBe(true)
  })

  it('no deja campañas ni promociones como contenido visible en Home mobile', () => {
    const home = readFileSync(resolve(__dirname, '../app/pages/mobile/HomeScreen.tsx'), 'utf8')

    expect(home).not.toContain("usePublicContent('campaigns')")
    expect(home).not.toContain("usePublicContent('promotions')")
    expect(home).not.toMatch(/campaign[A-Z]|featuredPromotion|liveCampaigns/)
  })

  it('propaga errores API y los hooks mobile no los convierten en vacio silencioso', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: { code: 'INTERNAL' } }, { status: 500, statusText: 'Internal Server Error' }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await expect(publicContentClient.list('wines', { locale: 'es-MX' })).rejects.toMatchObject({ status: 500 })

    const publicHook = readFileSync(resolve(__dirname, '../app/hooks/usePublicContent.ts'), 'utf8')
    const commercialHook = readFileSync(resolve(__dirname, '../app/hooks/usePublicCommercialServices.ts'), 'utf8')
    expect(publicHook).toContain("setError(t('app.publishedContentError'))")
    expect(commercialHook).toContain("setError(t('app.publishedContentError'))")
    expect(publicHook).not.toContain('Failed to fetch')
    expect(commercialHook).not.toContain('commercial-services')
  })
})
