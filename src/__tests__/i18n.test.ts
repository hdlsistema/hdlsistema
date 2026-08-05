import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  languageToLocale,
  localeToLanguage,
  normalizeLanguage,
  normalizeLocale,
  translate,
} from '../app/i18n'

describe('app i18n', () => {
  it('normaliza idioma y locale con fallback es-MX', () => {
    expect(normalizeLanguage('en-US')).toBe('en')
    expect(normalizeLanguage('fr-FR')).toBe('es')
    expect(normalizeLocale('en')).toBe('en-US')
    expect(normalizeLocale('fr-FR')).toBe('es-MX')
    expect(languageToLocale('en')).toBe('en-US')
    expect(localeToLanguage('es-MX')).toBe('es')
  })

  it('traduce con fallback a español y formatea MXN por idioma', () => {
    expect(translate('en', 'auth.login')).toBe('Sign in')
    expect(translate('en', 'missing.key', 'Fallback')).toBe('Fallback')
    expect(translate('en', 'control.tradition')).toBe('Tradition to live, experience to keep.')
    expect(formatCurrency(1250, 'es-MX')).toBe('$1,250.00 MXN')
    expect(formatCurrency(1250, 'en-US')).toBe('MX$1,250.00')
  })
})
