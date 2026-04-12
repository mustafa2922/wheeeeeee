import en from './locales/en.js'
import ur from './locales/ur.js'
import ar from './locales/ar.js'

/** All supported locales. Add a new language by adding one entry here. */
export const LOCALES = { en, ur, ar }

export const DEFAULT_LANG = 'en'

/**
 * Resolves a dot-notation key like "prayers.fajr" against a locale object.
 * Returns the key itself if not found so missing translations are visible.
 */
export function resolve(locale, key) {
  return key.split('.').reduce((obj, part) => obj?.[part], locale) ?? key
}

/**
 * Interpolates {{variable}} placeholders in a translated string.
 * Usage: interpolate("{{count}} subscribers", { count: 42 })
 *        → "42 subscribers"
 */
export function interpolate(str, vars = {}) {
  if (!vars || typeof str !== 'string') return str
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v),
    str
  )
}

/**
 * Returns a bound t() function for the given language code.
 * t('prayers.fajr')                  → "Fajr"
 * t('mosque.subscribersCount', { count: 5 }) → "5 subscribers"
 */
export function createTranslator(lang) {
  const locale = LOCALES[lang] ?? LOCALES[DEFAULT_LANG]
  return (key, vars) => interpolate(resolve(locale, key), vars)
}