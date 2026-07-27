import { useContext } from 'react'
import { AuthContext } from '../context/AuthContextDef'

export function useAuth() {
  return useContext(AuthContext)
}
