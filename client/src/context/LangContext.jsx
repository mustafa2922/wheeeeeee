import { createContext, useContext, useEffect, useState } from 'react'
import { LOCALES, DEFAULT_LANG, createTranslator } from '../i18n/index.js'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('lang') ?? DEFAULT_LANG
  )

  const t = createTranslator(lang)
  const meta = LOCALES[lang].meta

  function setLang(newLang) {
    if (!LOCALES[newLang]) return
    localStorage.setItem('lang', newLang)
    setLangState(newLang)
  }

  /* Apply lang + dir to <html> whenever language changes */
  useEffect(() => {
    document.documentElement.setAttribute('lang', meta.lang)
    document.documentElement.setAttribute('dir', meta.dir)
  }, [lang, meta])

  return (
    <LangContext.Provider value={{ lang, setLang, t, meta, locales: LOCALES }}>
      {children}
    </LangContext.Provider>
  )
}

/** Central hook — use everywhere instead of importing context directly */
export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}