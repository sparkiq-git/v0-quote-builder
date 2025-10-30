// Airport coordinates database for route mapping
export interface AirportCoordinates {
  code: string
  name: string
  lat: number
  lng: number
}

export const AIRPORT_COORDINATES: Record<string, AirportCoordinates> = {
  // Major US airports used in the mock data
  FXE: { code: "FXE", name: "Fort Lauderdale Executive", lat: 26.1973, lng: -80.1707 },
  TEB: { code: "TEB", name: "Teterboro", lat: 40.8501, lng: -74.0606 },
  MIA: { code: "MIA", name: "Miami International", lat: 25.7617, lng: -80.1918 },
  ASE: { code: "ASE", name: "Aspen/Pitkin County", lat: 39.2232, lng: -106.8687 },
  VNY: { code: "VNY", name: "Van Nuys", lat: 34.2098, lng: -118.4898 },
  LAX: { code: "LAX", name: "Los Angeles International", lat: 33.9425, lng: -118.4081 },
  JFK: { code: "JFK", name: "John F. Kennedy International", lat: 40.6413, lng: -73.7781 },
  DFW: { code: "DFW", name: "Dallas/Fort Worth International", lat: 32.8998, lng: -97.0403 },
  BOS: { code: "BOS", name: "Boston Logan International", lat: 42.3656, lng: -71.0096 },
  SFO: { code: "SFO", name: "San Francisco International", lat: 37.6213, lng: -122.379 },
  DCA: { code: "DCA", name: "Ronald Reagan Washington National", lat: 38.8512, lng: -77.0402 },
  ORD: { code: "ORD", name: "Chicago O'Hare International", lat: 41.9742, lng: -87.9073 },
  SEA: { code: "SEA", name: "Seattle-Tacoma International", lat: 47.4502, lng: -122.3088 },
  PHX: { code: "PHX", name: "Phoenix Sky Harbor International", lat: 33.4373, lng: -112.0078 },
}

export function getAirportCoordinates(code: string): AirportCoordinates | null {
  return AIRPORT_COORDINATES[code.toUpperCase()] || null
}

export function createRouteGeometry(origin: string, destination: string): [number, number][] | null {
  const originCoords = getAirportCoordinates(origin)
  const destCoords = getAirportCoordinates(destination)

  if (!originCoords || !destCoords) {
    return null
  }

  // Simple great circle route (straight line for now)
  return [
    [originCoords.lng, originCoords.lat],
    [destCoords.lng, destCoords.lat],
  ]
}
