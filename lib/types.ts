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
}

export interface Leg {
  id: string
  origin: string
  destination: string
  departureDate: string
  departureTime: string
  passengers: number
  notes?: string
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

export interface QuoteOption {
  id: string
  aircraftModelId: string
  aircraftTailId?: string // Optional - can quote just a model or specific tail
  totalHours: number
  operatorCost: number
  commission: number
  tax: number
  selectedAmenities: string[] // Array of amenity strings from the tail
  overrideImages?: string[]
  notes?: string
  conditions?: string
  additionalNotes?: string
}

export interface Quote {
  id: string
  leadId?: string
  customerId: string
  customer: Customer
  legs: Leg[]
  options: QuoteOption[]
  services: Service[]
  status: "pending_acceptance" | "prepare_payment" | "awaiting_payment" | "paid" | "declined" | "expired"
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
}

export interface Event {
  id: string
  type: "quote_viewed" | "option_selected" | "lead_created" | "quote_submitted" | "quote_declined"
  quoteId?: string
  leadId?: string
  timestamp: string
  metadata?: Record<string, any>
}

export type TailStatus = "active" | "mx" | "inactive" | "sold"

export interface Category {
  id: string
  name: string
  description?: string
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
  role: "PIC" | "SIC" | "FA" | "Ground"
  experience: string
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
  notes?: string
  fboOrigin?: FBO
  fboDestination?: FBO
  assignedCrew: CrewMember[]
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
}
