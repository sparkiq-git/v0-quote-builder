# Edge Function Fix: trip_notifications

## Problem
The edge function is using `quote_option!inner` which joins ALL quote options, not just the selected one. This causes:
1. `quote.quote_option` to be an **array** instead of a single object
2. The check `!quote.quote_option?.id` to fail because arrays don't have an `id` property directly
3. The error "Selected option not found" even though the option exists

## Root Cause
The edge function is doing a join with all options instead of fetching the specific selected option. It needs to:
1. Get `selected_option_id` from `metadata.selected_option_id` (which we're passing from `public-quote-page.tsx`)
2. Query the specific option using that ID, not join all options

## Solution
Replace the quote fetching logic to use `metadata.selected_option_id` to fetch the specific option.

## Fixed Edge Function Code

Replace the quote fetching section in your edge function with this:

```typescript
// --- QUOTE + SELECTED OPTION (FIXED) ---
const { data: quote, error: qErr } = await supabase
  .from("quote")
  .select("id, currency, trip_summary, selected_option_id")
  .eq("id", quote_id)
  .eq("tenant_id", tenant_id)
  .single()

if (qErr || !quote) {
  throw new Error("Quote not found")
}

// Get selected_option_id from metadata first (most reliable), fallback to quote
const selectedOptionId = metadata.selected_option_id || quote.selected_option_id

if (!selectedOptionId) {
  throw new Error("No selected option ID found in quote or metadata")
}

// Fetch the specific selected option
const { data: option, error: optErr } = await supabase
  .from("quote_option")
  .select(`
    id,
    label,
    accepted_at,
    price_total,
    aircraft_id,
    aircraft!inner (
      id,
      tail_number,
      model,
      operator_id,
      operator!inner (
        id,
        name
      )
    )
  `)
  .eq("id", selectedOptionId)
  .eq("quote_id", quote_id)
  .single()

if (optErr || !option) {
  console.error("Option query error:", optErr)
  console.error("Query details:", {
    selectedOptionId,
    quote_id,
    quoteSelectedOptionId: quote.selected_option_id,
    metadataSelectedOptionId: metadata.selected_option_id
  })
  throw new Error(`Selected option ${selectedOptionId} not found`)
}

const aircraft = option.aircraft
const operator = aircraft?.operator
```

## Key Changes

1. **Separate Queries**: Fetch quote first, then fetch the specific option using `selected_option_id`
2. **Use Metadata First**: Prioritize `metadata.selected_option_id` (most up-to-date), fallback to `quote.selected_option_id`
3. **Explicit Filtering**: Use `.eq("id", selectedOptionId)` to get ONLY the selected option
4. **Better Error Messages**: Include the selected_option_id in error messages for debugging

## Why This Works

- **No Array Issues**: `quote_option` is now a single object, not an array
- **Accurate Data**: Always gets the correct option using the ID from metadata
- **Handles Edge Cases**: Works even if `quote.selected_option_id` hasn't been updated yet (uses metadata)
- **Simple & Direct**: No complex joins or filtering logic

## Testing

After updating, test with:
```json
{
  "tenant_id": "a3d94a3a-3b6b-4de4-bd13-571b57b37e0b",
  "email": "wverde@sparkiq.io",
  "action_type": "quote_accepted",
  "metadata": {
    "quote_id": "05216946-a227-4bf1-9b1a-f3e697f752c5",
    "selected_option_id": "8abe2e64-585c-4096-99d9-5b843194080a",
    "created_by": "f13147c1-d92d-4863-a2a8-5962e260d167"
  }
}
```

The edge function should now successfully find the option and send the notification.

