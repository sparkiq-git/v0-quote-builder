# Trip Notifications Edge Function

Complete drop-in edge function for sending trip notifications when quotes are accepted or declined.

## 🚀 Deployment

### 1. Copy the Function

Copy the entire `supabase-functions-trip-notifications` folder to your Supabase project:

```
supabase/
  functions/
    trip_notifications/
      index.ts
```

### 2. Set Environment Variables

In your Supabase Dashboard → Edge Functions → `trip_notifications` → Settings, add these environment variables:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=AeroIQ <no-reply@aeroiq.io>

# Optional
NEXT_PUBLIC_APP_URL=https://aeroiq.io
```

**How to get these values:**
- `SUPABASE_URL`: Your project URL (found in Supabase Dashboard → Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (found in Supabase Dashboard → Settings → API → service_role key)
- `RESEND_API_KEY`: Get from [Resend Dashboard](https://resend.com/api-keys)
- `FROM_EMAIL`: Your verified email domain in Resend
- `NEXT_PUBLIC_APP_URL`: Your app's public URL (optional, defaults to aeroiq.io)

### 3. Deploy the Function

```bash
# Using Supabase CLI
supabase functions deploy trip_notifications

# Or deploy via Supabase Dashboard:
# Edge Functions → trip_notifications → Deploy
```

## 📋 What This Function Does

1. **Receives notification requests** from your API route (`/api/trip-notifications`)
2. **Validates required data** (tenant_id, email, action_type, quote_id)
3. **Prevents duplicates** (checks if notification sent in last 30 seconds)
4. **Fetches quote and selected option** using `metadata.selected_option_id` (fixed query logic)
5. **Sends branded email** via Resend with trip details
6. **Logs to audit table** for tracking

## 🔧 How It Works

### Request Payload

```json
{
  "tenant_id": "uuid",
  "email": "customer@example.com",
  "action_type": "quote_accepted" | "quote_declined",
  "metadata": {
    "quote_id": "uuid",
    "selected_option_id": "uuid",
    "created_by": "uuid",
    "reason": "optional for declined",
    "notes": "optional for declined"
  }
}
```

### Fixed Query Logic

The function now correctly:
- Uses `metadata.selected_option_id` first (most up-to-date)
- Falls back to `quote.selected_option_id` if metadata not provided
- Queries the **specific option** using `.eq("id", selectedOptionId)`
- No longer joins all options (which was causing the error)

## 🐛 Troubleshooting

### Error: "Selected option not found"

This should be fixed now! The function:
1. Uses `metadata.selected_option_id` from your API route
2. Queries the specific option correctly
3. Includes detailed error logging

Check Supabase logs for:
- `Option query error:` - Shows the actual database error
- `Query details:` - Shows which IDs were used

### Error: "Duplicate notification"

The function checks for notifications sent in the last 30 seconds. If you get this:
- Wait 30 seconds and try again
- Check `action_link_audit_log` table for recent entries

### Error: "Resend failed"

- Verify `RESEND_API_KEY` is correct
- Check `FROM_EMAIL` matches a verified domain in Resend
- Review Resend dashboard for delivery errors

## ✅ Testing

Test the function after deployment:

```bash
# Test quote_accepted
curl -X POST https://your-project.supabase.co/functions/v1/trip_notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "your-tenant-id",
    "email": "test@example.com",
    "action_type": "quote_accepted",
    "metadata": {
      "quote_id": "your-quote-id",
      "selected_option_id": "your-option-id",
      "created_by": "user-id"
    }
  }'
```

## 📝 Notes

- **No Redis required**: Simple deduplication using database query
- **Pure notification mechanism**: Just sends emails, no complex logic
- **Automatic branding**: Pulls tenant logo and colors from `tenant_notifications` table
- **Audit logging**: All notifications logged to `action_link_audit_log` table

## 🔗 Integration

This function is called by:
- `app/api/trip-notifications/route.ts` (your Next.js API route)
- Which is called by `components/quotes/public-quote-page.tsx` (when user accepts/declines)

No changes needed to your Next.js code - just deploy this function and update the environment variables!

