export interface Campground {
  id: string
  name: string
  location?: string
}

export interface NearbyCampground extends Campground {
  lat: number | null
  lng: number | null
  distanceMiles: number | null
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

// RIDB-sourced rich facility data
export interface FacilityDetail {
  FacilityID: string
  FacilityName: string
  FacilityDescription?: string
  FacilityDirections?: string
  FacilityPhone?: string
  FacilityEmail?: string
  FacilityAdaAccess?: string
  StayLimit?: string
  FACILITYADDRESS?: { AddressStateCode: string; City: string; PostalCode: string }[]
}

export interface FacilityMedia {
  EntityMediaID: string
  URL: string
  Title: string
  IsPrimary: boolean
  MimeType: string
}

export interface FacilityActivity {
  ActivityID: number
  ActivityName: string
}

export interface FacilityCampsite {
  CampsiteID: string
  CampsiteName: string
  CampsiteType: string
  Loop: string
  CampsiteAccessible: boolean
  TypeOfUse: string
  ATTRIBUTES: { AttributeName: string; AttributeValue: string }[]
  PERMITTEDEQUIPMENT: { EquipmentName: string; MaxLength: number }[]
}

export interface AlertSubscription {
  id: string
  email: string
  campgroundId: string
  campgroundName: string
  year: number
  months: number[]
  minConsecutive: number
  active: boolean
  createdAt: string
}
