export interface Amenity {
  id: string
  code: string
  name: string
  description?: string
  category?: string
  meta?: any
  created_at: string
  icon_type?: string
  icon_ref?: string
}

export interface AircraftAmenity {
  id: string
  tenant_id: string
  aircraft_id: string
  amenity_id: string
  created_at: string
  amenity?: Amenity // Joined data
}

export interface AmenityCategory {
  name: string
  amenities: Amenity[]
}
