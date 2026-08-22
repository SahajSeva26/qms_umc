import { create } from 'zustand'
import type { AuthUser } from '@/features/auth/auth.types'

interface AuthState {
  user: AuthUser | null
  setAuth: (user: AuthUser) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setAuth: (user) => set({ user }),
  clearAuth: () => set({ user: null }),
}))
