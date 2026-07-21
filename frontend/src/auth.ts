const TOKEN_KEY = 'qianqiu_token'
const USER_KEY = 'qianqiu_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUsername(): string | null {
  return localStorage.getItem(USER_KEY)
}

export function saveAuth(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, username)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function notifyAuthRequired() {
  window.dispatchEvent(new CustomEvent('auth:required'))
}
