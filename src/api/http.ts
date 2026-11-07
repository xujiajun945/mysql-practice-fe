import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({ baseURL: '/api', timeout: 60000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshing: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null
  try {
    const resp = await axios.post('/api/auth/refresh', { refreshToken })
    if (resp.data?.code === 0) {
      localStorage.setItem('accessToken', resp.data.data.accessToken)
      localStorage.setItem('refreshToken', resp.data.data.refreshToken)
      return resp.data.data.accessToken
    }
  } catch (e) {
    // ignore
  }
  return null
}

function clearAuth() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

http.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const { response, config } = error
    if (response?.status === 401 && config && !config._retry && !String(config.url).includes('/auth/')) {
      config._retry = true
      refreshing = refreshing || doRefresh()
      const token = await refreshing
      refreshing = null
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        return http(config)
      }
      clearAuth()
      if (window.location.pathname !== '/login') {
        ElMessage.error('登录状态已失效，请重新登录')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

async function call<T>(method: string, url: string, data?: any, params?: any): Promise<T> {
  try {
    const resp = await http.request({ method, url, data, params })
    if (resp.data.code !== 0) {
      ElMessage.error(resp.data.message || '请求失败')
      throw new Error(resp.data.message)
    }
    return resp.data.data as T
  } catch (error: any) {
    if (error?.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else if (!error?.response) {
      ElMessage.error(error?.message || '网络异常')
    }
    throw error
  }
}

export const api = {
  get: <T>(url: string, params?: any) => call<T>('get', url, undefined, params),
  post: <T>(url: string, data?: any) => call<T>('post', url, data),
  put: <T>(url: string, data?: any) => call<T>('put', url, data),
  del: <T>(url: string) => call<T>('delete', url)
}

export { http, clearAuth }
