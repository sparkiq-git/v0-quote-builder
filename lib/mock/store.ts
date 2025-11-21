// Legacy mock store - This file exists only to prevent import errors
// Components using this should be refactored to use real Supabase data

export function useMockStore() {
  return {
    state: {
      leads: [],
      quotes: [],
      aircraft: [],
      crew: [],
      fbos: [],
      passengers: [],
    },
    dispatch: () => {},
    getLeadById: () => null,
    getQuoteById: () => null,
    getQuoteByToken: () => null,
    convertLeadToQuote: () => {},
    createItineraryFromQuote: () => {},
    getItineraryByQuoteId: () => null,
    getMetrics: () => ({
      quotesPending: 0,
      leadsNew: 0,
    }),
  }
}
