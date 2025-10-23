export interface Company {
  id: string
  name: string
  logo?: string
  primaryColor: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  vesselType?: "Sailing Yacht" | "Motor Yacht" | "Catamaran" | "Gulet"
}

export interface Leg {
  id: string
  origin: string
  destination: string
  departureDate: string
  departureTime: string
  passengers: number
  notes?: string
  fboOriginId?: string
  fboDestinationId?: string
  passengerDetails?: PassengerWithLegs[] // Added passengerDetails field to store detailed passenger information per leg
}

export interface PassengerWithLegs {
  name: string
  assignedLegIds: string[]
  hasSpecialRequests?: boolean
  specialRequests?: string
  hasDietaryRestrictions?: boolean
  dietaryRestrictions?: string
  hasAccessibilityNeeds?: boolean
  accessibilityNeeds?: string
}

export interface CrewMemberWithLegs extends CrewMember {
  assignedLegIds?: string[]
}

export interface WeatherForecast {
  airportCode: string
  temperature: number
  conditions: string
  windSpeed: number
  windDirection: string
  visibility: number
  precipitation: number
  forecast: string
}

export interface Lead {
  id: string
  customerId: string
  customer: Customer
  legs: Leg[]
  status: "new" | "converted" | "deleted"
  isArchived: boolean // Added isArchived field for archive functionality
  createdAt: string
  notes?: string
}

export interface AircraftType {
  id: string
  name: string
  category: string
  capacity: number
  range: number
  images: string[]
  hourlyRate: number
}

export interface Service {
  id: string
  name: string
  description: string
  amount: number
}

export interface QuoteFee {
  id: string
  name: string
  amount: number
  isAutoCalculated: boolean
  description?: string
}

export interface QuoteOption {
  id: string
  aircraftModelId: string
  aircraftTailId?: string // Optional - can quote just a model or specific tail
  totalHours: number
  operatorCost: number
  commission: number
  tax?: number // Added tax field for pricing calculation
  fees: QuoteFee[]
  feesEnabled: boolean // Toggle for fees display/calculation
  selectedAmenities: string[] // Array of amenity strings from the tail
  overrideImages?: string[]
  notes?: string
  conditions?: string
  additionalNotes?: string
  // Aircraft data (populated by API)
  aircraftModel?: AircraftModel
  aircraftTail?: AircraftTail
}

export interface Quote {
  id: string
  leadId?: string
  customerId: string
  customer: Customer
  legs: Leg[]
  options: QuoteOption[]
  services: Service[]
  status:
    | "pending_response"
    | "client_accepted"
    | "availability_confirmed"
    | "pending_payment"
    | "payment_received"
    | "itinerary_created"
    | "declined"
    | "expired"
  expiresAt: string
  createdAt: string
  publishedAt?: string
  token?: string
  selectedOptionId?: string
  terms: string
  branding: {
    logo?: string
    primaryColor: string
  }
  itineraryId?: string
  workflowData?: {
    availabilityCheck?: {
      status: "pending" | "confirmed" | "unavailable"
      checkedAt?: string
      checkedBy?: string
      notes?: string
      resourcesChecked?: {
        crew: boolean
        aircraft: boolean
        permits: boolean
        other?: string[]
      }
    }
    contractAndPayment?: {
      contractSentAt?: string
      paymentMethod?: "payment_link" | "manual" // Added payment method tracking
      paymentLinkSent?: string
      paymentReceivedAt?: string
      paymentReference?: string
    }
    preItineraryData?: {
      completedAt?: string
      completedBy?: string
      crewAssigned?: boolean
      fboConfirmed?: boolean
      specialRequirements?: string[]
    }
  }
}

export interface AvailabilityCheck {
  id: string
  quoteId: string
  status: "pending" | "confirmed" | "unavailable"
  checkedAt: string
  checkedBy: string
  notes?: string
  resourcesChecked: {
    crew: boolean
    aircraft: boolean
    permits: boolean
    other?: string[]
  }
}

export interface PreItineraryData {
  id: string
  quoteId: string
  crewInformation: {
    assigned: boolean
    members: CrewMember[]
    specialRequirements?: string
  }
  fboInformation: {
    confirmed: boolean
    legFbos?: Record<string, { originFboId?: string; destinationFboId?: string }>
    originFbo?: FBO
    destinationFbo?: FBO
    specialServices?: string[]
    originFboPhone?: string
    originFboAddress?: string
    destinationFboPhone?: string
    destinationFboAddress?: string
  }
  passengerDetails: {
    manifestComplete: boolean
    passengers?: PassengerWithLegs[]
    specialRequests?: string[]
    dietaryRestrictions?: string[]
    accessibilityNeeds?: string[]
  }
  operationalNotes: string
  weatherForecasts?: WeatherForecast[]
  completedAt?: string
  completedBy?: string
}

export interface AircraftModel {
  id: string
  name: string
  categoryId: string
  manufacturer?: string
  defaultCapacity?: number
  defaultRangeNm?: number
  defaultSpeedKnots?: number
  images: string[]
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface AircraftTail {
  id: string
  modelId: string
  tailNumber: string
  operator?: string
  year?: number
  yearOfRefurbishment?: number
  status: TailStatus
  amenities?: string
  images?: string[]
  capacityOverride?: number
  rangeNmOverride?: number
  speedKnotsOverride?: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface EffectiveTail {
  capacity: number
  rangeNm: number
  speedKnots: number
  isCapOverridden: boolean
  isRangeOverridden: boolean
  isSpeedOverridden: boolean
}

export interface FBO {
  id: string
  name: string
  airportCode: string
  airportName: string
  address: string
  phone: string
  email: string
  website?: string
  services: string[]
}

export interface CrewMember {
  id: string
  name: string
  role: "PIC" | "SIC" | "FA" | "Ground" | string // Allow custom string roles
  yearsOfExperience: number
  totalFlightHours: number
  status: "active" | "inactive"
  phone?: string
  email?: string
  avatar?: string
}

export interface ItinerarySegment {
  id: string
  legId: string
  segmentNumber: number
  origin: string
  destination: string
  departureDate: string
  departureTime: string
  arrivalTime: string
  blockTime: string
  passengers: number
  passengerList: string[]
  passengerDetails?: PassengerWithLegs[]
  notes?: string
  fboOrigin?: FBO
  fboDestination?: FBO
  assignedCrew: CrewMember[]
  weatherForecast?: WeatherForecast
  geometry?: string // Encoded polyline for map display
}

export interface Itinerary {
  id: string
  quoteId: string
  publicHash: string
  tripName: string
  customer: Customer
  aircraft: {
    modelId: string
    tailId?: string
    model: AircraftModel
    tail?: AircraftTail
    specifications: {
      range: number
      cruiseSpeed: number
      cabinLayout: string
      seatingConfiguration: string
      baggageCapacity: string
    }
  }
  segments: ItinerarySegment[]
  amenities: string[]
  restrictions: {
    operational: string[]
    customs: string[]
    permits: string[]
  }
  specialNotes: string[]
  images: {
    url: string
    caption?: string
    type: "interior" | "exterior"
  }[]
  crew: CrewMember[]
  crewWithLegs?: CrewMemberWithLegs[]
  allPassengers?: PassengerWithLegs[]
  workflowData?: {
    availabilityCheck?: {
      status: "pending" | "confirmed" | "unavailable"
      checkedAt?: string
      checkedBy?: string
      notes?: string
      resourcesChecked?: {
        crew: boolean
        aircraft: boolean
        permits: boolean
        other?: string[]
      }
    }
    contractAndPayment?: {
      contractSentAt?: string
      paymentMethod?: "payment_link" | "manual"
      paymentLinkSent?: string
      paymentReceivedAt?: string
      paymentReference?: string
    }
    preItineraryData?: any
  }
  status: "confirmed" | "draft" | "updated" | "requires_action"
  visibility: {
    showCrewContacts: boolean
    showCrewContactsAfter?: string // ISO date string
  }
  createdAt: string
  updatedAt: string
  expiresAt?: string
  revisionNumber: number
}

export interface MockDatabase {
  companies: Company[]
  customers: Customer[]
  leads: Lead[]
  quotes: Quote[]
  aircraftTypes: AircraftType[]
  categories: Category[]
  aircraftModels: AircraftModel[]
  aircraftTails: AircraftTail[]
  events: Event[]
  itineraries: Itinerary[]
  fbos: FBO[]
  crewMembers: CrewMember[]
  preItineraryData: PreItineraryData[]
  customCrewRoles: string[] // Add custom crew roles array
  passengers: Passenger[] // Add passengers array
}

export type TailStatus = "active" | "mx" | "inactive" | "sold"

export interface Category {
  id: string
  name: string
  description?: string
}

export interface Event {
  id: string
  type: "quote_viewed" | "option_selected" | "lead_created" | "quote_submitted" | "quote_declined"
  quoteId?: string
  leadId?: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface Passenger {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  quotesReceived: string[] // Array of quote IDs
  flightsCompleted: number
  pastCoPassengers: string[] // Array of passenger IDs
  specialRequests?: string
  dietaryRestrictions?: string
  accessibilityNeeds?: string
  createdAt: string
  updatedAt: string
}
// lib/types.ts

export interface AircraftManufacturer {
  id: string
  name: string
  tenant_id: string | null
  created_by?: string | null
  created_at?: string | null
}

export interface AircraftModelRecord {
  id: string
  manufacturer_id: string
  name: string
  icao_type_designator?: string | null
  tenant_id?: string | null
  size_code?: string | null
  created_by?: string | null
  created_at?: string | null
  images?: string[] // Add images field for compatibility
  // Include manufacturer info for display
  manufacturer?: {
    id: string
    name: string
  }
}

export interface AircraftRecord {
  id: string
  tenant_id: string
  tail_number: string
  model_id?: string | null
  manufacturer_id?: string | null
  operator_id?: string | null
  type_rating_id: string
  status: string
  home_base?: string | null
  capacity_pax?: number | null
  year_of_manufacture?: number | null
  serial_number?: string | null
  range_nm?: number | null
  mtow_kg?: number | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export type AircraftFull = {
  aircraft_id: string
  tenant_id: string
  tail_number: string
  operator_name?: string | null
  manufacturer_name?: string | null
  model_name?: string | null
  primary_image_url?: string | null
  amenities?: string[]
  capacity_pax?: number | null
  range_nm?: number | null
  status?: string | null
  home_base?: string | null
  year_of_manufacture?: number | null
  year_of_refurbish?: number | null
  serial_number?: string | null
  mtow_kg?: number | null
  notes?: string | null
  meta?: any
}
