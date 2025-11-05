# Itinerary System - Workflow Summary

## Overview

This document explains the itinerary workflow system that automatically creates itineraries from accepted quotes and allows confirmation when invoices are paid.

## Workflow Steps

### 1. Quote Accepted → Draft Itinerary Created

**Trigger**: When a quote's `status` field changes to `"accepted"`

**What Happens**:
- A database trigger (`trg_quote_status_create_itinerary`) fires
- The RPC function `create_itinerary_from_quote()` is called
- A new itinerary is created with:
  - Status: `"draft"`
  - All data copied from the quote:
    - Contact ID, Lead ID, Tenant ID
    - Title, Trip Summary, Trip Type
    - Leg count, Total passengers (from quote or calculated)
    - Domestic trip flag, Aircraft preference
    - Aircraft information from selected quote_option
    - Trip dates (from quote or calculated from quote_detail)
    - Notes and special requirements
    - Currency
- All `quote_detail` records are copied to `itinerary_detail`

**Key Fields Copied** (from quote table):
- `contact_id` → itinerary.contact_id
- `lead_id` → itinerary.lead_id (if available)
- `title` → itinerary.title
- `trip_summary` → itinerary.trip_summary
- `trip_type` → itinerary.trip_type
- `leg_count` → itinerary.leg_count (or calculated from quote_detail)
- `total_pax` → itinerary.total_pax (or calculated from quote_detail)
- `domestic_trip` → itinerary.domestic_trip
- `aircraft_pref` → itinerary.aircraft_pref
- `notes` → itinerary.notes
- `special_notes` → itinerary.special_requirements (or from lead if quote doesn't have it)
- `currency` → itinerary.currency (defaults to 'USD')
- `earliest_departure` → itinerary.earliest_departure (from quote or calculated)
- `latest_return` → itinerary.latest_return (from quote or calculated)

**From quote_option** (via selected_option_id):
- `aircraft_id` → itinerary.aircraft_id (references aircraft.id)
- `aircraft_tail_id` → itinerary.aircraft_tail_id (references aircraft.id, if specific tail selected)
- `aircraft.tail_number` → itinerary.aircraft_tail_no (from aircraft table)

**From lead table** (if lead_id exists):
- `asap` → itinerary.asap (urgent trip flag)
- `source` → itinerary.source (lead source tracking)
- `source_ref` → itinerary.source_ref (lead source reference)
- `special_notes` → itinerary.special_requirements (fallback if quote doesn't have special_notes)

### 2. Invoice Paid → Itinerary Linked & Ready for Confirmation

**Trigger**: When an invoice's `status` field changes to `"paid"`

**What Happens**:
- A database trigger (`trg_invoice_paid_link_itinerary`) fires
- The itinerary's `invoice_id` is linked to the paid invoice
- The itinerary status can now be changed to `"trip_confirmed"` (via application logic)

**Important**: The trigger only links the invoice. Your application should:
1. Check if invoice is paid using `can_confirm_itinerary_trip()` function
2. Allow users to change status from `"draft"` → `"trip_confirmed"` only when invoice is paid
3. Show a prompt/notification to users to "finish building the itinerary"

## Database Schema

### `itinerary` Table

**Key Fields**:
- `id` - UUID primary key
- `quote_id` - References quote (required, unique - one itinerary per quote)
- `invoice_id` - References invoice (nullable, set when invoice is paid)
- `contact_id` - References contact (required, from quote)
- `lead_id` - References lead (nullable, links back to original lead)
- `tenant_id` - References tenant (required)
- `status` - One of: `'draft'`, `'trip_confirmed'`, `'in_progress'`, `'completed'`, `'cancelled'`
- `title` - Itinerary/quote title (copied from quote)
- `trip_summary` - Text description of the trip (copied from quote)
- `trip_type` - Trip type enum: `'one-way'`, `'round-trip'`, `'multi-city'` (copied from quote)
- `leg_count` - Number of flight legs (from quote or calculated)
- `total_pax` - Total passenger count (from quote or calculated)
- `domestic_trip` - Boolean flag for domestic vs international (from quote)
- `asap` - Boolean flag for ASAP/urgent trips (from lead, default false)
- `aircraft_id` - References aircraft (from quote_option.aircraft_id, references aircraft.id)
- `aircraft_tail_id` - References aircraft (from quote_option.aircraft_tail_id, references aircraft.id, same as aircraft_id if specific tail selected)
- `aircraft_tail_no` - Tail number (from aircraft.tail_number)
- `aircraft_pref` - Aircraft preference notes (from quote)
- `earliest_departure` - Earliest departure date (from quote or calculated)
- `latest_return` - Latest return date (from quote or calculated)
- `notes` - General notes (copied from quote.notes)
- `special_requirements` - Special requirements/requests (from quote.special_notes or lead.special_notes)
- `currency` - Currency context (from quote, default 'USD')
- `source` - Lead source tracking (from lead.source)
- `source_ref` - Lead source reference (from lead.source_ref)
- `created_by` - User who created (from auth.uid() at creation time)
- `created_at`, `updated_at` - Timestamps

### `itinerary_image` Table

**Purpose**: Allows users to upload/override images specific to an itinerary. These images take precedence over quote/aircraft images when displaying the itinerary.

**Key Fields**:
- `id` - UUID primary key
- `itinerary_id` - References itinerary (required)
- `tenant_id` - References tenant (required)
- `storage_path` - Full path in storage bucket: `tenant/{tenant_id}/itinerary/{itinerary_id}/{filename}`
- `public_url` - Public URL for the image
- `caption` - Optional caption/description
- `is_primary` - Boolean flag for primary/featured image
- `display_order` - Integer for ordering images (lower = first)
- `uploaded_by` - User who uploaded the image
- `created_at`, `updated_at` - Timestamps

**Storage**: Images are stored in the `aircraft-media` bucket (same as aircraft images) for consistency.

**Image Priority Logic**:
1. **First**: Check for `itinerary_image` records (itinerary-specific images)
2. **Fallback**: Use images from quote/aircraft if no itinerary images exist

### `itinerary_detail` Table

**Key Fields** (similar to `quote_detail`):
- `id` - UUID primary key
- `itinerary_id` - References itinerary (required)
- `seq` - Sequence number (1, 2, 3...) for ordering legs
- `origin`, `origin_code` - Origin airport (at least one required)
- `destination`, `destination_code` - Destination airport (at least one required)
- `origin_lat`, `origin_long` - Origin coordinates
- `destination_lat`, `destination_long` - Destination coordinates
- `depart_dt`, `depart_time` - Departure date/time
- `arrive_dt`, `arrive_time` - Arrival date/time (new fields not in quote_detail)
- `pax_count` - Passenger count for this leg
- `notes` - Leg-specific notes
- `distance_nm` - Distance in nautical miles
- `created_at`, `updated_at` - Timestamps

## Functions & Triggers

### Functions

1. **`create_itinerary_from_quote(quote_id UUID)`**
   - Creates a draft itinerary from an accepted quote
   - Copies all quote_detail records to itinerary_detail
   - Calculates trip dates and passenger counts
   - Returns the new itinerary ID

2. **`can_confirm_itinerary_trip(itinerary_id UUID)`**
   - Helper function to check if invoice is paid
   - Returns `true` if linked invoice status is `"paid"`
   - Use this in your application to validate status changes

### Triggers

1. **`trg_quote_status_create_itinerary`**
   - Fires: AFTER UPDATE of `status` on `quote` table
   - Condition: Status changed TO `"accepted"`
   - Action: Calls `create_itinerary_from_quote()`

2. **`trg_invoice_paid_link_itinerary`**
   - Fires: AFTER UPDATE of `status` on `invoice` table
   - Condition: Status changed TO `"paid"`
   - Action: Links invoice_id to itinerary

3. **`trg_itinerary_updated_at`** & **`trg_itinerary_detail_updated_at`**
   - Fires: BEFORE UPDATE on respective tables
   - Action: Updates `updated_at` timestamp

## Security (RLS Policies)

All tables have Row Level Security enabled:
- Users can only view/edit itineraries in their tenant
- Policies check `tenant_member` table for access control
- All CRUD operations are tenant-scoped

## Application Integration Points

### 1. Quote Status Change Notification

When a quote status changes to "accepted", you should:
- Show a notification that a draft itinerary was created
- Optionally redirect user to the itinerary page
- Display itinerary status badge as "draft"

### 2. Invoice Paid Notification

When an invoice is marked as paid, you should:
- Check if an itinerary exists for the quote
- Show a notification: "Invoice paid! Ready to confirm itinerary"
- Display a prompt/button: "Finish Building Itinerary"
- Enable the status change from "draft" → "trip_confirmed"

### 3. Status Change Validation

Before allowing status change to "trip_confirmed":
```sql
SELECT can_confirm_itinerary_trip(itinerary_id);
-- Returns true if invoice is paid
```

In your application code:
```typescript
// Check if invoice is paid before allowing status change
const canConfirm = await supabase.rpc('can_confirm_itinerary_trip', {
  p_itinerary_id: itineraryId
});

if (canConfirm.data && newStatus === 'trip_confirmed') {
  // Allow status change
} else {
  // Show error: "Invoice must be paid before confirming trip"
}
```

## Status Flow

```
[draft] → [trip_confirmed] → [in_progress] → [completed]
                                    ↓
                              [cancelled]
```

- **draft**: Created automatically when quote accepted
- **trip_confirmed**: Can only be set when invoice is paid
- **in_progress**: Trip is currently happening
- **completed**: Trip has finished
- **cancelled**: Trip was cancelled

## Image Management

### Image Override Feature

Users can upload images specific to an itinerary that override the quote/aircraft images:

1. **Storage Location**: `tenant/{tenant_id}/itinerary/{itinerary_id}/{filename}`
2. **Bucket**: `aircraft-media` (same as aircraft images)
3. **Database Table**: `itinerary_image`

### Image Display Logic

When displaying itinerary images:
```typescript
// Pseudo-code for image display logic
const getItineraryImages = async (itineraryId: string) => {
  // 1. Check for itinerary-specific images
  const itineraryImages = await supabase
    .from('itinerary_image')
    .select('*')
    .eq('itinerary_id', itineraryId)
    .order('display_order', { ascending: true });
  
  if (itineraryImages.data && itineraryImages.data.length > 0) {
    return itineraryImages.data; // Use itinerary images
  }
  
  // 2. Fallback to quote/aircraft images
  const itinerary = await getItinerary(itineraryId);
  const quoteImages = await getQuoteAircraftImages(itinerary.quote_id);
  return quoteImages;
};
```

### API Endpoints Needed

You'll need to create:
- `POST /api/itinerary/[id]/images` - Upload image
- `GET /api/itinerary/[id]/images` - Get all images
- `PATCH /api/itinerary/images/[imageId]` - Update image (caption, is_primary, display_order)
- `DELETE /api/itinerary/images/[imageId]` - Delete image

## Next Steps

1. **Review the schema** (`ITINERARY-SCHEMA-PROPOSAL.sql`)
2. **Run the migration** in your Supabase SQL Editor
3. **Test the triggers**:
   - Create a quote, set status to "accepted" → should create itinerary
   - Create an invoice, set status to "paid" → should link to itinerary
4. **Build the UI**:
   - Itinerary list page
   - Itinerary detail/edit page
   - Status change interface with validation
   - Notification system for status changes
   - Image upload/management component (similar to AircraftImageManager)

## Questions?

If you need any adjustments to the schema or workflow, let me know! The schema is designed to be flexible and can be extended as needed.

