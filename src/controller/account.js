import * as accountService from '../services/account.js'

//Untuk dapetin request query page dan limit, lalu panggil service getPublishedAccounts untuk dapetin list akun yang statusnya published, dengan pagination
export async function listAccounts(req, res) {
  try {
    //Ini tuh dia ngambil request page dan limit dari query params, kalo ga ada defaultnya page = 1, limit = 12. Tapi limit maksimal 48
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 48)

    //baru ini dia panggil service getPublishedAccounts untuk dapetin list akun yang statusnya published, dengan pagination
    const { data, count } = await accountService.getPublishedAccounts({ page, limit })

    //ini dia balikin response json yang isinya data akun, dan meta info tentang pagination
    res.json({
      data,
      meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } })
  }
}


//Untuk dapetin request param code, lalu panggil service getPublishedAccountByCode untuk dapetin akun secara detail berdasarkan code, tapi hanya yang statusnya published
export async function getAccount(req, res) {
  try {
    //ini dia panggil service getPublishedAccountByCode untuk dapetin akun secara detail berdasarkan code, tapi hanya yang statusnya published
    const account = await accountService.getPublishedAccountByCode(req.params.code)

    if (!account) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Akun tidak ditemukan' } })
    }
    res.json(account)
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } })
  }
}