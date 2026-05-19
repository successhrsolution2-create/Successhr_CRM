import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api, { tokenStorage } from '../api/axiosInstance.js'
import { decodeJwt, getErrorMessage, getPersistedUser, persistUser } from '../utils/helpers.js'

const initialToken = tokenStorage.get()
const initialUser = getPersistedUser()

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/login', credentials)
    return response.data
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'CRM login failed'))
  }
})

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout')
    return true
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'CRM logout failed'))
  }
})

export const refreshSession = createAsyncThunk('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/refresh')
    return response.data
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'CRM session refresh failed'))
  }
})

const clearSession = (state) => {
  state.accessToken = null
  state.user = null
  state.role = null
  tokenStorage.clear()
  persistUser(null)
}

const setSession = (state, payload) => {
  const tokenPayload = decodeJwt(payload.accessToken)
  const user = payload.user || {
    id: tokenPayload?.sub || tokenPayload?.id,
    name: tokenPayload?.name,
    email: tokenPayload?.email,
    role: tokenPayload?.role
  }

  state.accessToken = payload.accessToken
  state.user = user
  state.role = user?.role || tokenPayload?.role || null

  tokenStorage.set(payload.accessToken)
  persistUser(user)
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    accessToken: initialToken,
    user: initialUser,
    role: initialUser?.role || decodeJwt(initialToken)?.role || null,
    status: 'idle',
    error: null
  },
  reducers: {
    clearAuth: clearSession
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded'
        setSession(state, action.payload)
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(logout.fulfilled, clearSession)
      .addCase(logout.rejected, clearSession)
      .addCase(refreshSession.fulfilled, (state, action) => {
        setSession(state, action.payload)
      })
      .addCase(refreshSession.rejected, clearSession)
  }
})

export const { clearAuth } = authSlice.actions
export default authSlice.reducer
