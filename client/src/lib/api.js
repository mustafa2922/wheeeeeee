const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

/**
 * Core fetch wrapper — attaches auth token, handles errors centrally.
 * Every API call in the app goes through here.
 */
async function request(method, path, body = null) {
  const token = localStorage.getItem('auth_token')

  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }

  return res.json()
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path, body)  => request('DELETE', path, body),
}

/* ─── Typed API calls ─── */

export const mosquesApi = {
  getAll:       (params = '') => api.get(`/api/mosques${params}`),
  getOne:       (id)          => api.get(`/api/mosques/${id}`),
  getCountries: ()            => api.get('/api/mosques/geo/countries'),
  getCities:    (countryId)   => api.get(`/api/mosques/geo/cities/${countryId}`),
  getAreas:     (cityId)      => api.get(`/api/mosques/geo/areas/${cityId}`),
  create:       (body)        => api.post('/api/mosques', body),
  deactivate:   (id)          => api.patch(`/api/mosques/${id}/deactivate`),
}

export const timesApi = {
  update:      (mosqueId, body) => api.patch(`/api/times/${mosqueId}`, body),
  getMaghrib:  (mosqueId)       => api.get(`/api/times/${mosqueId}/maghrib`),
  postEid:     (mosqueId, body) => api.post(`/api/times/${mosqueId}/eid`, body),
  getAudit:    (mosqueId)       => api.get(`/api/times/${mosqueId}/audit`),
}

export const pushApi = {
  subscribe:        (body) => api.post('/api/push/subscribe', body),
  unsubscribe:      (body) => api.delete('/api/push/unsubscribe', body),
  mySubscriptions:  ()     => api.get('/api/push/my-subscriptions'),
  announce:         (body) => api.post('/api/push/announce', body),
}

export const adminApi = {
  createAdmin:  (body) => api.post('/api/auth/create-admin', body),
  createImam:   (body) => api.post('/api/auth/create-imam', body),
  updateCreds:  (body) => api.patch('/api/auth/update-credentials', body),
  getAuditLog:  ()     => api.get('/api/admin/audit'),
  getUsers:     ()     => api.get('/api/admin/users'),
  addCity:      (body) => api.post('/api/admin/cities', body),
  addArea:      (body) => api.post('/api/admin/areas', body),
  getStats:     ()     => api.get('/api/admin/my-stats'),
}