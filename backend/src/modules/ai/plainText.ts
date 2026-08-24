export const plainAiResponseInstruction = 'No uses Markdown, asteriscos, negritas o cursivas de Markdown, encabezados, tablas ni bloques de código. Responde en texto plano; si necesitas enlistar, usa frases cortas separadas por saltos de línea.'

export function plainAiResponse(value: string) {
  return String(value ?? '')
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s([{])\*([^*\n]+)\*(?=$|[\s.,;:!?)}\]])/g, '$1$2')
    .replace(/\*/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
