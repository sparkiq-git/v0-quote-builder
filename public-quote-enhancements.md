# Public Quote Page Enhancements

## Summary of Changes

### 1. **Expiration Date Display**
✅ **Added visible expiration banner**
- Shows expiration date and time
- Color-coded: Amber for upcoming expiration, Red for expired
- Displays friendly message when quote is expired
- Uses existing `formatDateTime` utility

### 2. **Selected Option Tracking**
✅ **Persists user selection to database**
- Updates `selected_option_id` column when user selects an aircraft
- Silently saves selection (no toast notification)
- API endpoint: `PATCH /api/quotes/[id]`

### 3. **"Not Interested" CTA**
✅ **New decline button for users who don't want to proceed**
- Better wording than "decline quote"
- Shows modal with reason selection
- Reason options:
  - Pricing concerns
  - Timing not right
  - Aircraft preferences
  - Found alternative option
  - Trip cancelled
  - Other
- Includes optional feedback field

### 4. **Quote Status Management**
✅ **Proper status transitions**
- **Accept**: Changes status from "pending_response" → "accepted"
- **Decline**: Changes status from "pending_response" → "declined"
- Added loading states with `isSubmitting`
- Updated button text for better clarity

### 5. **Token Revocation**
✅ **Revokes action link when quote is accepted**
- Automatically marks action link as "consumed"
- Prevents further access after acceptance
- Leaves token active if declined (for recovery)

## Files Modified

1. **`components/quotes/public-quote-page.tsx`**
   - Added expiration banner component
   - Updated accept/decline handlers
   - Added "Not Interested" button
   - Enhanced decline modal with better reasons
   - Added loading states

2. **`app/api/quotes/[id]/route.ts`**
   - Added token revocation logic for accepted quotes
   - Queries action_link by quote_id in metadata
   - Updates status to "consumed" when accepted

## User Flow

### Accepting a Quote
1. User selects an aircraft option
2. Selection is saved to `selected_option_id`
3. User clicks "Confirm & Request Availability"
4. Quote status changes to "accepted"
5. Action link is revoked (status: "consumed")
6. Success message displayed

### Declining a Quote
1. User clicks "Not Interested" button
2. Modal opens with reason selection
3. User selects reason and optionally adds notes
4. Quote status changes to "declined"
5. Action link remains active (for recovery)
6. Success message displayed

### Expired Quote
1. Expiration banner shows red
2. Message: "This quote is no longer valid"
3. Action buttons are disabled or hidden
4. User must contact broker for new quote

## Status Values

| Status | Description | Action Link |
|--------|-------------|-------------|
| `pending_response` | Quote sent, waiting for client | Active |
| `accepted` | Client accepted the quote | **Revoked** |
| `declined` | Client declined the quote | Active |
| `expired` | Quote expiration passed | Expired |

## Benefits

1. **Clear Communication**: Users see expiration date immediately
2. **Better UX**: "Not Interested" is friendlier than "Decline Quote"
3. **Data Tracking**: Selected option is persisted for analytics
4. **Security**: Accepted quotes can't be accessed again
5. **Recovery**: Declined quotes remain accessible for follow-up
6. **Feedback**: Collects structured decline reasons

## Testing Checklist

- [ ] Expiration banner shows correctly
- [ ] Selecting an aircraft saves to database
- [ ] Accept button revokes token
- [ ] Decline leaves token active
- [ ] "Not Interested" modal works
- [ ] Loading states prevent double-submission
- [ ] Error handling works properly
