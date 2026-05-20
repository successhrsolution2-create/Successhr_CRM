import { format, isValid, parseISO } from 'date-fns'

export const USER_KEY = 'crm_user'

export const decodeJwt = (token) => {
  if (!token) return null

  try {
    const payload = token.split('.')[1]
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(window.atob(normalizedPayload))
  } catch (_error) {
    return null
  }
}

export const persistUser = (user) => {
  if (!user) {
    localStorage.removeItem(USER_KEY)
    return
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const getPersistedUser = () => {
  try {
    const rawUser = localStorage.getItem(USER_KEY)
    return rawUser ? JSON.parse(rawUser) : null
  } catch (_error) {
    return null
  }
}

export const getErrorMessage = (error, fallback = 'Request failed') =>
  error?.response?.data?.message || error?.message || fallback

const HTML_ENTITY_LOOKUP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#34;': '"',
  '&#x22;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#47;': '/'
}

export const decodeHtmlEntities = (value) => {
  if (typeof value !== 'string') return value

  return value.replace(/&(amp|lt|gt|quot);|&#(?:34|39|47);|&#x(?:22|27|2F);/gi, (entity) => {
    const normalized = entity.toLowerCase()
    return HTML_ENTITY_LOOKUP[normalized] || entity
  })
}

export const formatDisplayText = (value, fallback = '') => {
  if (value === null || value === undefined || value === '') return fallback
  return typeof value === 'string' ? decodeHtmlEntities(value) : value
}

export const formatDateTime = (value, fallback = '-') => {
  if (!value) return fallback

  const date = typeof value === 'string' ? parseISO(value) : new Date(value)
  return isValid(date) ? format(date, 'dd MMM yyyy, h:mm a') : fallback
}

export const formatDate = (value, fallback = '-') => {
  if (!value) return fallback

  const date = typeof value === 'string' ? parseISO(value) : new Date(value)
  return isValid(date) ? format(date, 'dd MMM yyyy') : fallback
}

export const buildQueryString = (params = {}) => {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value)
    }
  })

  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

export const candidateClassTone = {
  '1st': 'red',
  '2nd': 'amber',
  '3rd': 'slate'
}

export const callStatusTone = {
  pending: 'slate',
  called: 'sky',
  followup: 'amber',
  converted: 'emerald',
  rejected: 'red'
}

export const activeTone = {
  true: 'emerald',
  false: 'slate'
}

export const redirectPathForRole = (role) => {
  if (role === 'crm_super_admin') return '/admin/dashboard'
  if (role === 'crm_employee') return '/employee/candidates'
  return '/login'
}

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}
