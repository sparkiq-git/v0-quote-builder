# Fix: Unauthorized Aircraft Fetch Error

## Problem
The quote editing page was throwing "Unauthorized" errors when trying to fetch aircraft data from `/api/aircraft-full`.

## Root Cause
Both `QuoteOptionsTab` and `QuoteSummaryTab` were making unnecessary client-side API calls to fetch aircraft data, even though this data is already provided in the quote options by the backend API.

## Files Modified

### 1. `components/quotes/sections/QuoteOptionsTab.tsx`
- **Removed**: Entire `fetchAircraftForOptions` useEffect that was calling `/api/aircraft-full`
- **Result**: No more unauthorized fetch attempts

### 2. `components/quotes/sections/QuoteSummaryTab.tsx`
- **Removed**: useEffect that was fetching aircraft data from `/api/aircraft-full`
- **Changed**: Updated to use aircraft data from `o.aircraftModel` and `o.aircraftTail` (already in quote options)
- **Removed**: `aircraftMap` state variable (no longer needed)
- **Result**: Uses embedded aircraft data instead of fetching separately

## Why This Works

The quote API (`app/api/quotes/[id]/route.ts`) already returns aircraft data embedded in the options:

\`\`\`typescript
options: (options || []).map((option: any) => {
  const aircraft = aircraftData.find(a => a.id === option.aircraft_id)
  
  return {
    // ... other fields
    aircraftModel: {
      id: aircraftModel?.id,
      name: aircraftModel?.name,
      images: aircraftModel?.aircraft_model_image,
    },
    aircraftTail: {
      id: aircraft.id,
      tailNumber: aircraft.tail_number,
      images: aircraft.aircraft_image,
      operator: aircraft.operator_name,
    },
  }
})
\`\`\`

So components should use `option.aircraftModel` and `option.aircraftTail` directly instead of fetching separately.

## Testing

After these changes:
✅ No more "Unauthorized" errors
✅ Aircraft data displays correctly in quote options
✅ Summary page shows aircraft details
✅ No performance impact (using cached data)

## Note

The `AircraftCombobox` component still fetches aircraft data when users are selecting new aircraft. This is intentional and requires authentication (broker must be logged in to edit quotes).
