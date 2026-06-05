import { useEffect, useState } from 'react'
import { getCars } from '../lib/carsService'
import type { Car } from '../types'

interface UseCarsResult {
  cars: Car[]
  loading: boolean
  error: string | null
}

export function useCars(): UseCarsResult {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCars()
      .then(setCars)
      .catch((err) => {
        console.error('Failed to load cars from Firestore:', err)
        setError('Failed to load vehicles.')
      })
      .finally(() => setLoading(false))
  }, [])

  return { cars, loading, error }
}
