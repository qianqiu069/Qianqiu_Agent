import { clearAuth, getToken, notifyAuthRequired } from '../auth'

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options?.headers as Record<string, string>) ?? {}),
  }
  const resp = await fetch(url, { ...options, headers })

  const isAuthEndpoint = url.startsWith('/api/auth/')
  if (resp.status === 401 && !isAuthEndpoint) {
    clearAuth()
    notifyAuthRequired()
    throw new Error('请先登录')
  }

  if (!resp.ok) {
    let detail = `请求失败 (${resp.status})`
    try {
      const data = await resp.json()
      if (data.detail) detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  return resp.json()
}
