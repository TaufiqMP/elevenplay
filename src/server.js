import 'dotenv/config'
import app from './app.js'
import { purgeExpired, RETENTION_DAYS } from './services/trash.js'

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`API jalan di http://localhost:${port}`))

//Hapus permanen barang Sampah yang sudah lewat masa simpan. Dicek saat jalan, lalu tiap 6 jam
async function runTrashCleanup() {
  try {
    const removed = await purgeExpired()
    const total = Object.values(removed).reduce((sum, n) => sum + n, 0)
    if (total > 0) console.log(`Sampah: ${total} barang lewat ${RETENTION_DAYS} hari dihapus permanen`, removed)
  } catch (err) {
    console.error('Gagal membersihkan Sampah:', err.message)
  }
}

runTrashCleanup()
setInterval(runTrashCleanup, 6 * 60 * 60 * 1000)
