import { useEffect, useState } from 'react'
import { apiUrl, parseJsonResponse } from '../lib/apiClient'

interface UseSoldCarIdsResult {
  soldCarIds: Set<string>
  loading: boolean
  error: string | null
}

interface SoldVehicleIdsResponse {
  success: boolean
  soldVehicleIds?: unknown
  error?: string
}

// Reads the public sold-vehicle-ids endpoint instead of the full Firestore 'sales' collection.
// Each Sale document can carry buyer PII (name, email, phone, address, ID/licence numbers) that
// the public site never needs - the backend now derives sold status via the same centralized
// rule (getSoldCarIdsFromSales, shared with Admin Inventory/Record New Sale/the AI context) and
// returns only an array of vehicle ids.
async function fetchSoldVehicleIds(): Promise<string[]> {
  const response = await fetch(apiUrl('/api/public/sold-vehicle-ids'))
  const data = await parseJsonResponse<SoldVehicleIdsResponse>(response)
  if (!response.ok || !data.success || !Array.isArray(data.soldVehicleIds)) {
    throw new Error('Unable to verify vehicle availability right now.')
  }
  return data.soldVehicleIds.filter((id): id is string => typeof id === 'string')
}

// Shared public-facing sold-status fetch. Unlike Admin Inventory (which must always show every
// car, sold or not, and merely warns on a Sales-fetch failure), public surfaces must fail CLOSED:
// while `loading` is true, or if `error` is set, callers must not render vehicle results at all -
// otherwise a temporarily-unavailable sold-ids fetch could let an already-sold vehicle be shown
// (and potentially offered/sold again) on the public site.
export function useSoldCarIds(): UseSoldCarIdsResult {
  const [soldCarIds, setSoldCarIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchSoldVehicleIds()
      .then((ids) => {
        if (cancelled) return
        setSoldCarIds(new Set(ids))
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('Unable to verify vehicle availability right now.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { soldCarIds, loading, error }
}
