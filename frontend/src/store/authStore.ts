import { create } from 'zustand'
import api from '../api/client'

interface User {
  id: string
  name: string
  email: string
  role: 'donor' | 'ngo' | 'admin'
  status: string
  profile?: any
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  login: (email: string, password: string, role?: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('annadaan_user') || 'null') } catch { return null }
  })(),
  token: localStorage.getItem('annadaan_token'),
  loading: false,
  error: null,

  login: async (email: string, password: string, role?: string) => {
    set({ loading: true, error: null })
    try {
      const res = await api.post('/auth/login', { email, password, role })
      const { token, user } = res.data
      localStorage.setItem('annadaan_token', token)
      localStorage.setItem('annadaan_user', JSON.stringify(user))
      set({ token, user, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Login failed', loading: false })
      throw err
    }
  },

  register: async (data) => {
    set({ loading: true, error: null })
    try {
      const res = await api.post('/auth/register', data)
      const { token, user } = res.data
      localStorage.setItem('annadaan_token', token)
      localStorage.setItem('annadaan_user', JSON.stringify(user))
      set({ token, user, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Registration failed', loading: false })
      throw err
    }
  },

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me')
      const user = res.data
      localStorage.setItem('annadaan_user', JSON.stringify(user))
      set({ user })
    } catch { /* silently fail */ }
  },

  logout: () => {
    localStorage.removeItem('annadaan_token')
    localStorage.removeItem('annadaan_user')
    set({ user: null, token: null })
  },

  clearError: () => set({ error: null })
}))
