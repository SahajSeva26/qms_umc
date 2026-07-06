import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  isDark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      toggle: () => {
        const next = !get().isDark
        set({ isDark: next })
        document.documentElement.classList.toggle('dark', next)
      },
    }),
    { name: 'qms-theme' }
  )
)

export const initTheme = () => {
  const stored = localStorage.getItem('qms-theme')
  if (stored) {
    const { state } = JSON.parse(stored)
    if (state?.isDark) document.documentElement.classList.add('dark')
  }
}
