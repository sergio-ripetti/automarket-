const BASE = 'https://carapi.app/api'

let cachedToken: string | null = null

export async function getAuthToken(): Promise<string> {
  if (cachedToken) return cachedToken

  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_token: import.meta.env.VITE_CARAPI_TOKEN,
      api_secret: import.meta.env.VITE_CARAPI_SECRET,
    }),
  })

  if (!res.ok) throw new Error(`CarAPI auth failed: ${res.status}`)

  const token: string = await res.text()
  cachedToken = token.trim()
  return cachedToken
}

async function authFetch(path: string): Promise<unknown> {
  const token = await getAuthToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`CarAPI request failed: ${res.status} ${path}`)
  return res.json()
}

export async function getMakes(): Promise<string[]> {
  const data = await authFetch('/makes/v2') as { data?: { name: string }[] } | { name: string }[]
  const items = Array.isArray(data) ? data : (data as { data: { name: string }[] }).data ?? []
  return items.map((m) => m.name).sort()
}

export async function getModels(make: string): Promise<string[]> {
  const encoded = encodeURIComponent(make)
  const data = await authFetch(`/models/v2?make=${encoded}`) as { data?: { name: string }[] } | { name: string }[]
  const items = Array.isArray(data) ? data : (data as { data: { name: string }[] }).data ?? []
  return items.map((m) => m.name).sort()
}

export async function getYears(): Promise<number[]> {
  const data = await authFetch('/years/v2') as number[] | { data: number[] }
  return Array.isArray(data) ? data : (data as { data: number[] }).data ?? []
}
