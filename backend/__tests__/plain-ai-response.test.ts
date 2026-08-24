import { describe, expect, it } from 'vitest'
import { plainAiResponse, plainAiResponseInstruction } from '../src/modules/ai/plainText'

describe('plain AI response contract', () => {
  it('removes Markdown asterisks before returning assistant answers', () => {
    const value = plainAiResponse('**Corte ejecutivo**\n* Ingresaron **8 personas**\nConsulta `checkins`.')

    expect(value).toBe('Corte ejecutivo\n- Ingresaron 8 personas\nConsulta checkins.')
    expect(value).not.toContain('*')
    expect(value).not.toContain('`')
  })

  it('instructs AI services to answer in plain text', () => {
    expect(plainAiResponseInstruction).toContain('No uses Markdown')
    expect(plainAiResponseInstruction).toContain('Responde en texto plano')
    expect(plainAiResponseInstruction).not.toContain('*')
  })
})
