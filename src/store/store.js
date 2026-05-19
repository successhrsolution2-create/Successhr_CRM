import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice.js'
import candidateReducer from './candidateSlice.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    candidates: candidateReducer
  }
})
