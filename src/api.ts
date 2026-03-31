import type { AggregatedAvailability, Campground, CampgroundInfo } from './types'

const MONTHS_MAP: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December',
}
export { MONTHS_MAP }

export async function fetchCampgroundSearch(query: string): Promise<Campground[]> {
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(query)}&entity_type=campground&inventory_type=camping`
  )
  const data = await res.json()
  const raw: unknown[] = data.results || data.inventory_suggestions || data.suggest || []
  return (raw as Record<string, unknown>[])
    .filter((r) => {
      const type = ((r.entity_type as string) || (r.type as string) || '').toLowerCase()
      return type === 'campground' || type === 'camping'
    })
    .slice(0, 12)
    .map((r) => ({
      id: String(r.entity_id || r.id || ''),
      name: (r.name as string) || (r.entity_name as string) || String(r.entity_id || r.id),
      location: r.city ? `${r.city}, ${r.state_code || ''}` : undefined,
    }))
    .filter((r) => r.id)
}

export async function fetchCampgroundInfo(id: string): Promise<CampgroundInfo | null> {
  const res = await fetch(`/api/camps/campgrounds/${id}`)
  const data = await res.json()
  return data.campground || null
}

export async function fetchAvailabilityForMonth(
  campgroundId: string,
  year: number,
  month: number
): Promise<AggregatedAvailability> {
  const monthStr = String(month).padStart(2, '0')
  const yearStr = String(year).padStart(4, '0')
  const url = `/api/camps/availability/campground/${campgroundId}/month?start_date=${yearStr}-${monthStr}-01T00%3A00%3A00.000Z`
  const res = await fetch(url)
  return res.json()
}

export async function fetchAndAggregate(
  campgroundId: string,
  year: number,
  months: number[]
): Promise<AggregatedAvailability> {
  const results = await Promise.all(
    months.map((m) => fetchAvailabilityForMonth(campgroundId, year, m))
  )
  return results.reduce<AggregatedAvailability>(
    (agg, avail) => {
      Object.entries(avail.campsites).forEach(([id, cs]) => {
        const existing = agg.campsites[id]?.availabilities || {}
        agg.campsites[id] = {
          ...agg.campsites[id],
          ...cs,
          availabilities: { ...existing, ...cs.availabilities },
        }
      })
      return agg
    },
    { campsites: {} }
  )
}
