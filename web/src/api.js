const API = import.meta.env.VITE_API || 'http://localhost:6060';

export function setToken(t) { localStorage.setItem('tok', t); }
export function getToken() { return localStorage.getItem('tok'); }

async function req(path, { method = 'GET', body, auth } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(await res.text());
  return res.json().catch(() => ({}));
}

export const api = {
  signup: (d) => req('/api/auth/signup', { method: 'POST', body: d }),
  login: (d) => req('/api/auth/login', { method: 'POST', body: d }),

  /** Perfil */
  me: () => req('/api/auth/me', { auth: true }),
  updateMe: (d) => req('/api/auth/me', { method: 'PUT', body: d, auth: true }),

  /** Servicios */
  listServices: () => req('/api/services'),
  getMyAsset: () => req('/api/services/my-asset', { auth: true }),
  createService: (d) => req('/api/services', { method: 'POST', body: d, auth: true }),
  updateService: (id, d) => req(`/api/services/${id}`, { method: 'PUT', body: d, auth: true }),
  deleteService: (id) => req(`/api/services/${id}`, { method: 'DELETE', auth: true }),

  /** Pagos */
  startPurchase: (id) => req(`/api/open-payments/start/${id}`, { method: 'POST', auth: true }),
  startPurchaseInterval: (id) => req(`/api/open-payments/start-interval/${id}`, { method: 'POST', auth: true }),
  renewInterval: (chatId) => req(`/api/open-payments/interval/renew/${chatId}`, { method: 'POST', auth: true }),

  /** Chats */
  listChats: () => req('/api/chats', { auth: true }),
  getChat: (id) => req(`/api/chats/${id}`, { auth: true }),
  listMessages: (id) => req(`/api/chats/${id}/messages`, { auth: true }),
  sendMessage: (id, text) => req(`/api/chats/${id}/messages`, { method: 'POST', body: { text }, auth: true }),
};
