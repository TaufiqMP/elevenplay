import express from 'express'
import cors from 'cors'
import { supabase } from './config/supabase.js'
import routes from './routes/index.js'

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(express.json())

app.get('/health', async (req, res) => {
  const { error } = await supabase.from('accounts').select('id').limit(1)
  if (error) return res.status(500).json({ ok: false, error: error.message })
  res.json({ ok: true })
})

app.use('/api/v1', routes)

export default app