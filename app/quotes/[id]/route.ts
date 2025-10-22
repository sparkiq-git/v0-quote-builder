await supabase.from("quote_option").upsert(
  options.map(o => ({
    id: o.id,
    quote_id: quote.id,
    aircraft_id: o.aircraft_id,
    flight_hours: o.flight_hours ?? 0,
    cost_operator: o.cost_operator ?? 0,
    price_commission: o.price_commission ?? 0,
    price_base: o.price_base ?? 0,
    price_total: o.price_total ?? 0,
    notes: o.notes ?? null,
  }))
)
