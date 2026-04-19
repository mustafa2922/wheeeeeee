import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

import './workers/pushWorker.js'
import authRoutes from './routes/auth.js'
import mosqueRoutes from './routes/mosques.js'
import timesRoutes from './routes/times.js'
import pushRoutes from './routes/push.js'
import adminRoutes from './routes/admin.js'

const app = express()

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    callback(new Error('CORS origin not allowed'))
  }
}))
app.use(express.json())

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/auth',    authRoutes)
app.use('/api/mosques', mosqueRoutes)
app.use('/api/times',   timesRoutes)
app.use('/api/push',    pushRoutes)
app.use('/api/admin',   adminRoutes)

// Global JSON error handler
app.use((err, req, res, next) => {
  console.error('SERVER_ERROR:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})