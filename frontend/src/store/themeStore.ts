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

// Runs synchronously before React mounts — must not throw, or a corrupt
// storage value would crash to a white screen with no error boundary yet.
export const initTheme = () => {
  try {
    const stored = localStorage.getItem('qms-theme')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.isDark) document.documentElement.classList.add('dark')
    }
  } catch {
    // fall back to light-theme default
  }
}
