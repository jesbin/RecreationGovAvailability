export interface Campground {
  id: string
  name: string
  location?: string
}

export interface CampgroundInfo {
  facility_name: string
  facility_email?: string
  facility_phone?: string
  addresses?: { address1: string; city: string; state_code: string; postal_code: string }[]
}

export interface CampsiteAvailability {
  site: string
  availabilities: Record<string, string>
}

export interface AggregatedAvailability {
  campsites: Record<string, CampsiteAvailability>
}

export interface SiteAvailableRun {
  site: string
  dates: Date[]
  maxConsecutive: number
}
