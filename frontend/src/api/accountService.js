const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * Mengambil daftar akun berstatus published dengan pagination.
 * Endpoint: GET /api/v1/accounts?page=1&limit=12
 *
 * @param {Object} [params]
 * @param {number} [params.page=1] - Nomor halaman (default 1)
 * @param {number} [params.limit=12] - Jumlah item per halaman (1 - 48, default 12)
 * @returns {Promise<{ data: Array, meta: { page: number, limit: number, total: number, total_pages: number } }>}
 */
export async function getAccounts({ page = 1, limit = 12 } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(`${API_BASE_URL}/accounts?${query.toString()}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Gagal mengambil daftar akun (${response.status})`);
  }

  return response.json();
}

/**
 * Mengambil detail akun berstatus published berdasarkan kode akun unik.
 * Endpoint: GET /api/v1/accounts/:code
 *
 * @param {string} code - Kode unik akun (contoh: ACC-001)
 * @returns {Promise<Object>} Data akun lengkap
 */
export async function getAccountByCode(code) {
  if (!code) {
    throw new Error('Kode akun wajib disertakan');
  }

  const response = await fetch(`${API_BASE_URL}/accounts/${encodeURIComponent(code)}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Gagal mengambil detail akun (${response.status})`);
  }

  return response.json();
}
