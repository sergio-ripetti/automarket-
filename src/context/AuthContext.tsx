import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthChange } from '../lib/authService'
import { AuthContext } from './AuthContextDef'

// Provides app-wide auth state - subscribes to Firebase auth changes and exposes the current user and loading status via context
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}
