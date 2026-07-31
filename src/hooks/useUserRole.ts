import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { authenticatedFetch } from '../lib/authService'
import { parseJsonResponse } from '../lib/apiClient'

export type UserRole = 'admin' | 'demo' | 'user' | null

interface UseUserRoleResult {
  role: UserRole
  isDemo: boolean
  loading: boolean
}

interface FetchState {
  role: UserRole
  done: boolean
}

// Resolves the signed-in user's own role via GET /api/me (Firestore's users/{uid} collection
// denies all direct client reads - see firestore.rules - so this backend endpoint is the only
// way the frontend can learn its own role). Used to show the "Demo Mode" indicator and disable
// destructive controls for the restricted demo account; the backend independently enforces the
// same restriction on every write/delete/download route regardless of what this hook returns.
//
// `role`/`loading` are derived from `fetchState` rather than set directly in the effect body
// (only inside the fetch's own then/catch callbacks) so there's no synchronous setState call on
// the "no user" early-out path.
export function useUserRole(): UseUserRoleResult {
  const { user, loading: authLoading } = useAuth()
  const [fetchState, setFetchState] = useState<FetchState>({ role: null, done: false })

  useEffect(() => {
    if (authLoading || !user) return

    let cancelled = false
    authenticatedFetch('/api/me')
      .then((res) => parseJsonResponse<{ success: boolean; role: UserRole }>(res))
      .then((data) => {
        if (cancelled) return
        setFetchState({ role: data.success ? data.role : null, done: true })
      })
      .catch(() => {
        if (cancelled) return
        setFetchState({ role: null, done: true })
      })
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  const role = user ? fetchState.role : null
  const loading = authLoading || (!!user && !fetchState.done)

  return { role, isDemo: role === 'demo', loading }
}
