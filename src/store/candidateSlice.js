import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../api/axiosInstance.js'
import { buildQueryString, getErrorMessage } from '../utils/helpers.js'

export const fetchMyCandidates = createAsyncThunk(
  'candidates/fetchMine',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/candidates${buildQueryString(params)}`)
      return response.data.data
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch CRM candidates'))
    }
  }
)

export const fetchDashboardStats = createAsyncThunk('candidates/fetchStats', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/dashboard/stats')
    return response.data.data
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to fetch CRM dashboard stats'))
  }
})

const candidateSlice = createSlice({
  name: 'candidates',
  initialState: {
    items: [],
    pagination: null,
    stats: null,
    status: 'idle',
    statsStatus: 'idle',
    error: null
  },
  reducers: {
    clearCandidateState: (state) => {
      state.items = []
      state.pagination = null
      state.stats = null
      state.status = 'idle'
      state.statsStatus = 'idle'
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyCandidates.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchMyCandidates.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload?.candidates || []
        state.pagination = action.payload?.pagination || null
      })
      .addCase(fetchMyCandidates.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(fetchDashboardStats.pending, (state) => {
        state.statsStatus = 'loading'
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.statsStatus = 'succeeded'
        state.stats = action.payload
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.statsStatus = 'failed'
        state.error = action.payload
      })
  }
})

export const { clearCandidateState } = candidateSlice.actions
export default candidateSlice.reducer
