import type { AggregatedAvailability, Campground, CampgroundInfo, NearbyCampground } from './types'

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

export function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function fetchCampgroundsNearLocation(
  lat: number,
  lng: number,
  radiusMiles = 75
): Promise<NearbyCampground[]> {
  const res = await fetch(
    `/api/search?latitude=${lat}&longitude=${lng}&radius=${radiusMiles}&entity_type=campground&inventory_type=camping&size=20`
  )
  const data = await res.json()
  const raw: unknown[] = data.results || data.inventory_suggestions || data.suggest || []
  return (raw as Record<string, unknown>[])
    .filter((r) => {
      const type = ((r.entity_type as string) || (r.type as string) || '').toLowerCase()
      return type === 'campground' || type === 'camping'
    })
    .map((r) => {
      const cgLat = r.latitude != null ? parseFloat(r.latitude as string) : null
      const cgLng = r.longitude != null ? parseFloat(r.longitude as string) : null
      const distanceMiles =
        cgLat != null && cgLng != null ? haversineDistanceMiles(lat, lng, cgLat, cgLng) : null
      return {
        id: String(r.entity_id || r.id || ''),
        name: (r.name as string) || (r.entity_name as string) || String(r.entity_id || r.id),
        location: r.city ? `${r.city}, ${r.state_code || ''}` : undefined,
        lat: cgLat,
        lng: cgLng,
        distanceMiles,
      }
    })
    .filter((r) => r.id)
    .sort((a, b) => (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999))
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
