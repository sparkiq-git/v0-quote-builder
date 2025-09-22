"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, type ReactNode, useState } from "react"
import type {
  MockDatabase,
  Lead,
  Quote,
  AircraftType,
  Event,
  Customer,
  Company,
  Category,
  AircraftModel,
  AircraftTail,
  Itinerary,
} from "../types"
import { mockDatabase } from "./db"
import { computeEffectiveTail, validateUniqueTailNumber } from "../utils/aircraft"

type MockStoreAction =
  | { type: "LOAD_DATA"; payload: MockDatabase }
  | { type: "ADD_LEAD"; payload: Lead }
  | { type: "UPDATE_LEAD"; payload: { id: string; updates: Partial<Lead> } }
  | { type: "DELETE_LEAD"; payload: string }
  | { type: "ARCHIVE_LEAD"; payload: string }
  | { type: "UNARCHIVE_LEAD"; payload: string }
  | { type: "ADD_QUOTE"; payload: Quote }
  | { type: "UPDATE_QUOTE"; payload: { id: string; updates: Partial<Quote> } }
  | { type: "DELETE_QUOTE"; payload: string }
  | { type: "ADD_AIRCRAFT_TYPE"; payload: AircraftType }
  | { type: "UPDATE_AIRCRAFT_TYPE"; payload: { id: string; updates: Partial<AircraftType> } }
  | { type: "DELETE_AIRCRAFT_TYPE"; payload: string }
  | { type: "UPDATE_COMPANY"; payload: { id: string; updates: Partial<Company> } }
  | { type: "ADD_CATEGORY"; payload: Category }
  | { type: "ADD_MODEL"; payload: AircraftModel }
  | { type: "UPDATE_MODEL"; payload: { id: string; updates: Partial<AircraftModel> } }
  | { type: "ARCHIVE_MODEL"; payload: string }
  | { type: "UNARCHIVE_MODEL"; payload: string }
  | { type: "DELETE_MODEL_IF_NO_TAILS"; payload: string }
  | { type: "ADD_TAIL"; payload: AircraftTail }
  | { type: "UPDATE_TAIL"; payload: { id: string; updates: Partial<AircraftTail> } }
  | { type: "ARCHIVE_TAIL"; payload: string }
  | { type: "UNARCHIVE_TAIL"; payload: string }
  | { type: "DELETE_TAIL"; payload: string }
  | { type: "ADD_EVENT"; payload: Event }
  | { type: "ADD_ITINERARY"; payload: Itinerary }
  | { type: "UPDATE_ITINERARY"; payload: { id: string; updates: Partial<Itinerary> } }
  | { type: "DELETE_ITINERARY"; payload: string }
  | { type: "RESET_DATA" }

interface MockStoreState extends MockDatabase {}

interface MockStoreContextType {
  state: MockStoreState
  dispatch: React.Dispatch<MockStoreAction>
  loading: boolean
  getLeadById: (id: string) => Lead | undefined
  getQuoteById: (id: string) => Quote | undefined
  getQuoteByToken: (token: string) => Quote | undefined
  getAircraftTypeById: (id: string) => AircraftType | undefined
  getCustomerById: (id: string) => Customer | undefined
  convertLeadToQuote: (leadId: string) => Quote
  getMetrics: () => {
    leadsToday: number
    quotesPending: number
    viewsThisWeek: number
  }
  getCategoryById: (id: string) => Category | undefined
  getModelById: (id: string) => AircraftModel | undefined
  getTailById: (id: string) => AircraftTail | undefined
  getEffectiveTail: (tailId: string) => ReturnType<typeof computeEffectiveTail> | undefined
  validateTailNumber: (tailNumber: string, excludeId?: string) => boolean
  getModelTails: (modelId: string) => AircraftTail[]
  getItineraryById: (id: string) => Itinerary | undefined
  getItineraryByHash: (hash: string) => Itinerary | undefined
  getItineraryByQuoteId: (quoteId: string) => Itinerary | undefined
  createItineraryFromQuote: (quoteId: string) => Itinerary
}

const MockStoreContext = createContext<MockStoreContextType | undefined>(undefined)

function mockStoreReducer(state: MockStoreState, action: MockStoreAction): MockStoreState {
  switch (action.type) {
    case "LOAD_DATA":
      return {
        ...action.payload,
        aircraftModels: action.payload.aircraftModels || [],
        aircraftTails: action.payload.aircraftTails || [],
        categories: action.payload.categories || [],
        itineraries: action.payload.itineraries || [],
        fbos: action.payload.fbos || [],
        crewMembers: action.payload.crewMembers || [],
      }

    case "ADD_LEAD":
      return {
        ...state,
        leads: [...state.leads, action.payload],
      }

    case "UPDATE_LEAD":
      return {
        ...state,
        leads: state.leads.map((lead) =>
          lead.id === action.payload.id ? { ...lead, ...action.payload.updates } : lead,
        ),
      }

    case "DELETE_LEAD":
      return {
        ...state,
        leads: state.leads.map((lead) => (lead.id === action.payload ? { ...lead, status: "deleted" as const } : lead)),
      }

    case "ARCHIVE_LEAD":
      return {
        ...state,
        leads: state.leads.map((lead) => (lead.id === action.payload ? { ...lead, isArchived: true } : lead)),
      }

    case "UNARCHIVE_LEAD":
      return {
        ...state,
        leads: state.leads.map((lead) => (lead.id === action.payload ? { ...lead, isArchived: false } : lead)),
      }

    case "ADD_QUOTE":
      return {
        ...state,
        quotes: [...state.quotes, action.payload],
      }

    case "UPDATE_QUOTE":
      return {
        ...state,
        quotes: state.quotes.map((quote) =>
          quote.id === action.payload.id ? { ...quote, ...action.payload.updates } : quote,
        ),
      }

    case "DELETE_QUOTE":
      return {
        ...state,
        quotes: state.quotes.filter((quote) => quote.id !== action.payload),
      }

    case "ADD_AIRCRAFT_TYPE":
      return {
        ...state,
        aircraftTypes: [...state.aircraftTypes, action.payload],
      }

    case "UPDATE_AIRCRAFT_TYPE":
      return {
        ...state,
        aircraftTypes: state.aircraftTypes.map((aircraft) =>
          aircraft.id === action.payload.id ? { ...aircraft, ...action.payload.updates } : aircraft,
        ),
      }

    case "DELETE_AIRCRAFT_TYPE":
      return {
        ...state,
        aircraftTypes: state.aircraftTypes.filter((aircraft) => aircraft.id !== action.payload),
      }

    case "UPDATE_COMPANY":
      return {
        ...state,
        companies: state.companies.map((company) =>
          company.id === action.payload.id ? { ...company, ...action.payload.updates } : company,
        ),
      }

    case "ADD_CATEGORY":
      return {
        ...state,
        categories: [...state.categories, action.payload],
      }

    case "ADD_MODEL":
      return {
        ...state,
        aircraftModels: [...(state.aircraftModels || []), action.payload],
      }

    case "UPDATE_MODEL":
      return {
        ...state,
        aircraftModels: (state.aircraftModels || []).map((model) =>
          model.id === action.payload.id
            ? { ...model, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : model,
        ),
      }

    case "ARCHIVE_MODEL":
      return {
        ...state,
        aircraftModels: (state.aircraftModels || []).map((model) =>
          model.id === action.payload ? { ...model, isArchived: true, updatedAt: new Date().toISOString() } : model,
        ),
      }

    case "UNARCHIVE_MODEL":
      return {
        ...state,
        aircraftModels: (state.aircraftModels || []).map((model) =>
          model.id === action.payload ? { ...model, isArchived: false, updatedAt: new Date().toISOString() } : model,
        ),
      }

    case "DELETE_MODEL_IF_NO_TAILS":
      const hasTails = (state.aircraftTails || []).some((tail) => tail.modelId === action.payload)
      if (hasTails) return state
      return {
        ...state,
        aircraftModels: (state.aircraftModels || []).filter((model) => model.id !== action.payload),
      }

    case "ADD_TAIL":
      return {
        ...state,
        aircraftTails: [...(state.aircraftTails || []), action.payload],
      }

    case "UPDATE_TAIL":
      return {
        ...state,
        aircraftTails: (state.aircraftTails || []).map((tail) =>
          tail.id === action.payload.id
            ? { ...tail, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : tail,
        ),
      }

    case "ARCHIVE_TAIL":
      return {
        ...state,
        aircraftTails: (state.aircraftTails || []).map((tail) =>
          tail.id === action.payload ? { ...tail, isArchived: true, updatedAt: new Date().toISOString() } : tail,
        ),
      }

    case "UNARCHIVE_TAIL":
      return {
        ...state,
        aircraftTails: (state.aircraftTails || []).map((tail) =>
          tail.id === action.payload ? { ...tail, isArchived: false, updatedAt: new Date().toISOString() } : tail,
        ),
      }

    case "DELETE_TAIL":
      return {
        ...state,
        aircraftTails: (state.aircraftTails || []).filter((tail) => tail.id !== action.payload),
      }

    case "ADD_EVENT":
      return {
        ...state,
        events: [...state.events, action.payload],
      }

    case "ADD_ITINERARY":
      return {
        ...state,
        itineraries: [...(state.itineraries || []), action.payload],
      }

    case "UPDATE_ITINERARY":
      return {
        ...state,
        itineraries: (state.itineraries || []).map((itinerary) =>
          itinerary.id === action.payload.id
            ? {
                ...itinerary,
                ...action.payload.updates,
                updatedAt: new Date().toISOString(),
                revisionNumber: itinerary.revisionNumber + 1,
              }
            : itinerary,
        ),
      }

    case "DELETE_ITINERARY":
      return {
        ...state,
        itineraries: (state.itineraries || []).filter((itinerary) => itinerary.id !== action.payload),
      }

    case "RESET_DATA":
      return mockDatabase

    default:
      return state
  }
}

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(mockStoreReducer, mockDatabase)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedData = localStorage.getItem("charter-quote-builder-data")
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        const mergedData = {
          ...mockDatabase,
          ...parsedData,
          quotes: [...mockDatabase.quotes, ...(parsedData.quotes || [])].reduce(
            (acc, quote) => {
              const existingIndex = acc.findIndex((q) => q.id === quote.id)
              if (existingIndex >= 0) {
                const mockQuote = mockDatabase.quotes.find((q) => q.id === quote.id)
                if (mockQuote) {
                  acc[existingIndex] = mockQuote
                }
              } else {
                acc.push(quote)
              }
              return acc
            },
            [] as typeof mockDatabase.quotes,
          ),
          categories: mockDatabase.categories,
          aircraftModels: parsedData.aircraftModels || mockDatabase.aircraftModels || [],
          aircraftTails: parsedData.aircraftTails || mockDatabase.aircraftTails || [],
          itineraries: parsedData.itineraries || mockDatabase.itineraries || [],
          fbos: parsedData.fbos || mockDatabase.fbos || [],
          crewMembers: parsedData.crewMembers || mockDatabase.crewMembers || [],
        }
        dispatch({ type: "LOAD_DATA", payload: mergedData })
      } catch (error) {
        console.error("Failed to load saved data:", error)
        dispatch({ type: "LOAD_DATA", payload: mockDatabase })
      }
    } else {
      dispatch({ type: "LOAD_DATA", payload: mockDatabase })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    localStorage.setItem("charter-quote-builder-data", JSON.stringify(state))
  }, [state])

  const getLeadById = (id: string) => state.leads.find((lead) => lead.id === id)
  const getQuoteById = (id: string) => state.quotes.find((quote) => quote.id === id)
  const getQuoteByToken = (token: string) => state.quotes.find((quote) => quote.token === token)
  const getAircraftTypeById = (id: string) => state.aircraftTypes.find((aircraft) => aircraft.id === id)
  const getCustomerById = (id: string) => state.customers.find((customer) => customer.id === id)

  const convertLeadToQuote = (leadId: string): Quote => {
    const lead = getLeadById(leadId)
    if (!lead) throw new Error("Lead not found")

    const newQuote: Quote = {
      id: `quote-${Date.now()}`,
      leadId: lead.id,
      customerId: lead.customerId,
      customer: lead.customer,
      legs: lead.legs,
      options: [],
      services: [],
      status: "pending_acceptance",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      terms: "Standard terms and conditions apply.",
      branding: {
        primaryColor: state.companies[0]?.primaryColor || "#2563eb",
      },
    }

    dispatch({ type: "ADD_QUOTE", payload: newQuote })
    dispatch({ type: "UPDATE_LEAD", payload: { id: leadId, updates: { status: "converted" } } })

    return newQuote
  }

  const getMetrics = () => {
    const today = new Date().toISOString().split("T")[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    return {
      leadsToday: state.leads.filter((lead) => lead.createdAt.startsWith(today) && lead.status !== "deleted").length,
      quotesPending: state.quotes.filter((quote) => quote.status === "pending_acceptance").length,
      viewsThisWeek: state.events.filter((event) => event.type === "quote_viewed" && event.timestamp >= weekAgo).length,
    }
  }

  const getCategoryById = (id: string) => state.categories.find((category) => category.id === id)
  const getModelById = (id: string) => (state.aircraftModels || []).find((model) => model.id === id)
  const getTailById = (id: string) => (state.aircraftTails || []).find((tail) => tail.id === id)

  const getEffectiveTail = (tailId: string) => {
    const tail = getTailById(tailId)
    if (!tail) return undefined
    const model = getModelById(tail.modelId)
    if (!model) return undefined
    return computeEffectiveTail(model, tail)
  }

  const validateTailNumber = (tailNumber: string, excludeId?: string) => {
    return validateUniqueTailNumber(tailNumber, state.aircraftTails || [], excludeId)
  }

  const getModelTails = (modelId: string) => {
    return (state.aircraftTails || []).filter((tail) => tail.modelId === modelId)
  }

  const getItineraryById = (id: string) => (state.itineraries || []).find((itinerary) => itinerary.id === id)
  const getItineraryByHash = (hash: string) =>
    (state.itineraries || []).find((itinerary) => itinerary.publicHash === hash)
  const getItineraryByQuoteId = (quoteId: string) =>
    (state.itineraries || []).find((itinerary) => itinerary.quoteId === quoteId)

  const createItineraryFromQuote = (quoteId: string): Itinerary => {
    const quote = getQuoteById(quoteId)
    if (!quote) throw new Error("Quote not found")
    if (quote.status !== "paid") throw new Error("Quote must be paid to create itinerary")
    if (!quote.selectedOptionId) throw new Error("Quote must have a selected option")

    const selectedOption = quote.options.find((opt) => opt.id === quote.selectedOptionId)
    if (!selectedOption) throw new Error("Selected option not found")

    const model = getModelById(selectedOption.aircraftModelId)
    if (!model) throw new Error("Aircraft model not found")

    const tail = selectedOption.aircraftTailId ? getTailById(selectedOption.aircraftTailId) : undefined

    const publicHash = `itin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const newItinerary: Itinerary = {
      id: `itinerary-${Date.now()}`,
      quoteId: quote.id,
      publicHash,
      tripName: `${quote.legs[0]?.origin} to ${quote.legs[quote.legs.length - 1]?.destination} Trip`,
      customer: quote.customer,
      aircraft: {
        modelId: model.id,
        tailId: tail?.id,
        model,
        tail,
        specifications: {
          range: tail?.rangeNmOverride || model.defaultRangeNm || 0,
          cruiseSpeed: tail?.speedKnotsOverride || model.defaultSpeedKnots || 0,
          cabinLayout: "Executive Configuration",
          seatingConfiguration: `${tail?.capacityOverride || model.defaultCapacity || 0} passengers`,
          baggageCapacity: "Standard baggage compartment",
        },
      },
      segments: quote.legs.map((leg, index) => ({
        id: `segment-${leg.id}`,
        legId: leg.id,
        segmentNumber: index + 1,
        origin: leg.origin,
        destination: leg.destination,
        departureDate: leg.departureDate,
        departureTime: leg.departureTime,
        arrivalTime: "TBD",
        blockTime: "TBD",
        passengers: leg.passengers,
        passengerList: [],
        notes: leg.notes,
        assignedCrew: [],
      })),
      amenities: selectedOption.selectedAmenities || [],
      restrictions: {
        operational: [],
        customs: [],
        permits: [],
      },
      specialNotes: [],
      images:
        selectedOption.overrideImages?.map((url) => ({ url, type: "exterior" as const })) ||
        model.images.map((url) => ({ url, type: "exterior" as const })),
      crew: [],
      status: "confirmed",
      visibility: {
        showCrewContacts: false,
        showCrewContactsAfter: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revisionNumber: 1,
    }

    dispatch({ type: "ADD_ITINERARY", payload: newItinerary })
    dispatch({ type: "UPDATE_QUOTE", payload: { id: quoteId, updates: { itineraryId: newItinerary.id } } })

    return newItinerary
  }

  const contextValue: MockStoreContextType = {
    state,
    dispatch,
    loading,
    getLeadById,
    getQuoteById,
    getQuoteByToken,
    getAircraftTypeById,
    getCustomerById,
    convertLeadToQuote,
    getMetrics,
    getCategoryById,
    getModelById,
    getTailById,
    getEffectiveTail,
    validateTailNumber,
    getModelTails,
    getItineraryById,
    getItineraryByHash,
    getItineraryByQuoteId,
    createItineraryFromQuote,
  }

  return <MockStoreContext.Provider value={contextValue}>{children}</MockStoreContext.Provider>
}

export function useMockStore() {
  const context = useContext(MockStoreContext)
  if (context === undefined) {
    throw new Error("useMockStore must be used within a MockStoreProvider")
  }
  return context
}
