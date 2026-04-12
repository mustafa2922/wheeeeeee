import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = ['light', 'dark', 'warm', 'midnight']

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved && THEMES.includes(saved)) return saved
    /* Respect OS preference on first visit */
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  function setTheme(newTheme) {
    if (!THEMES.includes(newTheme)) return
    localStorage.setItem('theme', newTheme)
    setThemeState(newTheme)
  }

  /* Apply theme to <html> */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}