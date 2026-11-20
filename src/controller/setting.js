import * as settingService from '../services/setting.js'

//GET /settings
export async function getSettings(req, res) {
  try {
    const settings = await settingService.getSettings()
    res.json(settings)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' } })
  }
}
