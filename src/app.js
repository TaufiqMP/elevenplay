import express from 'express'
import cors from 'cors'
import { supabase } from './config/supabase.js'
import routes from './routes/index.js'

const app = express()
app.use(cors());
app.use(express.json())
/*
//Daftar alamat frontend yang boleh memanggil API, dipisah koma di .env
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    //Request tanpa origin (Postman, curl, server Next.js) tetap diizinkan
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    callback(null, false)
  },
}))
*/

app.get('/health', async (req, res) => {
  const { error } = await supabase.from('accounts').select('id').limit(1)
  if (error) return res.status(500).json({ ok: false, error: error.message })
  res.json({ ok: true })
})

app.use('/api/v1', routes)

export default app