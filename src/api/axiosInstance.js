import axios from 'axios'

const TOKEN_KEY = 'crm_access_token'

const api = axios.create({
  baseURL: '/crm',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest?._crmRetry || originalRequest?.url?.includes('/auth/')) {
      return Promise.reject(error)
    }

    try {
      originalRequest._crmRetry = true
      const refreshResponse = await axios.post('/crm/auth/refresh', null, { withCredentials: true })
      const accessToken = refreshResponse.data?.accessToken

      if (accessToken) {
        localStorage.setItem(TOKEN_KEY, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      }
    } catch (_refreshError) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('crm_user')
    }

    return Promise.reject(error)
  }
)

export const tokenStorage = {
  key: TOKEN_KEY,
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
}

export default api
