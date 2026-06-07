import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // AI calls can be slow
})

// ── Incidents ───────────────────────────────────────────────────────────────
export const submitIncident = (data) => api.post('/incidents', data)
export const listIncidents = (params = {}) => api.get('/incidents', { params })
export const getIncident = (id) => api.get(`/incidents/${id}`)
export const resolveIncident = (id, data) => api.post(`/incidents/${id}/resolve`, data)
export const getTimeline = (id) => api.get(`/incidents/${id}/timeline`)

// ── Search ───────────────────────────────────────────────────────────────────
export const searchIncidents = (q, limit = 10) => api.get('/search', { params: { q, limit } })

// ── AI / Stats ────────────────────────────────────────────────────────────────
export const getStats = () => api.get('/ai/stats')
export const getKnowledgeGraph = () => api.get('/ai/knowledge-graph')
export const sendChatMessage = (message, history = [], incidentId = null) => 
  api.post('/ai/chat', { message, history, incident_id: incidentId })

// ── Reports ───────────────────────────────────────────────────────────────────
export const getPostmortem = (id) => api.get(`/reports/${id}`)
export const getPostmortemPdfUrl = (id) => `${API_BASE}/api/reports/${id}/pdf`

export default api
