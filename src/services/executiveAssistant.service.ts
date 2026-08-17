import { apiFetch } from './api'

function headers(token: string | null | undefined): HeadersInit {
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export type ExecutiveAssistantMessage = { role: 'user' | 'assistant'; content: string }

export const executiveAssistantClient = {
  message(token: string | null | undefined, message: string, history: ExecutiveAssistantMessage[]) {
    return apiFetch<{ ok: true; data: { answer: string; generatedAt: string } }>('/api/admin/executive-assistant/message', {
      method: 'POST', headers: headers(token), body: JSON.stringify({ message, history }), timeoutMs: 35_000,
    })
  },
  realtimeSession(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: { clientSecret: string; expiresAt: number | null; generatedAt: string } }>('/api/admin/executive-assistant/realtime-session', {
      method: 'POST', headers: headers(token), timeoutMs: 20_000,
    })
  },
}
