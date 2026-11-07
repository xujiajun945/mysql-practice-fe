import { defineStore } from 'pinia'
import { authApi, UserView } from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('accessToken') || '',
    refreshToken: localStorage.getItem('refreshToken') || '',
    user: (JSON.parse(localStorage.getItem('user') || 'null') as UserView | null)
  }),
  getters: {
    loggedIn: (state) => !!state.accessToken,
    caps: (state) => state.user?.capabilities || [],
    schemas: (state) => state.user?.schemas || []
  },
  actions: {
    persist() {
      localStorage.setItem('accessToken', this.accessToken)
      localStorage.setItem('refreshToken', this.refreshToken)
      if (this.user) localStorage.setItem('user', JSON.stringify(this.user))
    },
    async signIn(username: string, password: string) {
      const data = await authApi.login(username, password)
      this.accessToken = data.accessToken
      this.refreshToken = data.refreshToken
      this.user = data.user
      this.persist()
    },
    async loadMe() {
      this.user = await authApi.me()
      this.persist()
    },
    async signOut() {
      try {
        await authApi.logout(this.refreshToken)
      } catch (e) {
        // ignore
      }
      this.accessToken = ''
      this.refreshToken = ''
      this.user = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    },
    hasCap(cap: string) {
      return this.caps.includes(cap)
    },
    canSeeSchema(schema: string) {
      return this.schemas.includes(schema)
    }
  }
})
