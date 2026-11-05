import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/entrar' }
  return Promise.reject(err)
})

export default api

export const reportsApi = {
  listar:          (params)      => api.get('/reports', { params }),
  criar:           (fd)          => api.post('/reports', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  nearby:          (lat,lng,r)   => api.get('/reports/nearby', { params:{ lat, lng, raio: r } }),
  atualizarStatus: (id, status)  => api.patch(`/reports/${id}/status`, { status }),
  deletar:         (id)          => api.delete(`/reports/${id}`),
}
