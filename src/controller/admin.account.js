import * as accountService from '../services/account.js'

//Mengubah error database menjadi response yang rapi
function sendError(res, err) {
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Kode akun sudah dipakai' } })
  }
  if (err.code === '23514' || err.code === '22P02') {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: err.message } })
  }
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } })
}

//GET /admin/accounts : semua akun (draft, published, archived), bisa difilter ?status=
export async function listAccounts(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 48)
    const status = req.query.status

    const { data, count } = await accountService.getAllAccounts({ page, limit, status })

    res.json({
      data,
      meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    sendError(res, err)
  }
}

//POST /admin/accounts : tambah akun baru
export async function createAccount(req, res) {
  const { title } = req.body

  if (!title) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'title wajib diisi' },
    })
  }

  try {
    const account = await accountService.createAccount(req.body)
    res.status(201).json(account)
  } catch (err) {
    sendError(res, err)
  }
}

//PATCH /admin/accounts/:id : ubah sebagian field
export async function updateAccount(req, res) {
  try {
    const account = await accountService.updateAccount(req.params.id, req.body)

    if (!account) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Akun tidak ditemukan' } })
    }
    res.json(account)
  } catch (err) {
    sendError(res, err)
  }
}

//DELETE /admin/accounts/:id : arsipkan, atau hapus permanen kalau ?permanent=true
export async function deleteAccount(req, res) {
  try {
    const permanent = req.query.permanent === 'true'
    await accountService.deleteAccount(req.params.id, { permanent })
    res.status(204).end()
  } catch (err) {
    sendError(res, err)
  }
}