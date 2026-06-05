export interface CarAPIResult {
  make: string
  model: string
  year: number
  fuel_type: string
  transmission: string
  drive: string
  cylinders: number
  displacement: number
  highway_mpg: number
  city_mpg: number
  class: string
  combination_mpg: number
}

export async function searchCars(
  make: string,
  model: string,
  year?: number,
): Promise<CarAPIResult[]> {
  try {
    const params = new URLSearchParams()
    params.append('make', make.toLowerCase())
    params.append('model', model.toLowerCase())
    if (year) params.append('year', year.toString())

    const response = await fetch(`/ninjas-api/v1/cars?${params.toString()}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API response error:', response.status, errorText)
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    return data as CarAPIResult[]
  } catch (error) {
    console.error('Car API search error:', error)
    return []
  }
}

export async function getCarByMakeModel(
  make: string,
  model: string,
): Promise<CarAPIResult | null> {
  try {
    const results = await searchCars(make, model)
    return results.length > 0 ? results[0] : null
  } catch (err) {
    console.error('Car API fetch error:', err)
    return null
  }
}
