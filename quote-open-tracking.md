# Quote Open Tracking

## Feature
When a user opens a quote through an action link, the system now tracks detailed open information.

## Fields Added/Updated in `quote` Table

### Status Field
- **Field**: `status`
- **Value**: Set to `"opened"` when quote is first accessed
- **Purpose**: Track that the quote has been viewed by the recipient

### First Open Timestamp
- **Field**: `first_opened_at`
- **Value**: ISO timestamp of the first time the quote was opened
- **Purpose**: Know when the quote was first accessed
- **Behavior**: Only set once (on first open)

### Last Open Timestamp
- **Field**: `last_opened_at`
- **Value**: ISO timestamp of the most recent access
- **Purpose**: Track the latest activity on the quote
- **Behavior**: Updated every time the quote is opened

### Open Count
- **Field**: `open_count`
- **Value**: Integer counter starting at 0
- **Purpose**: Track how many times the quote has been accessed
- **Behavior**: Incremented by 1 on each open

## Implementation

### Location
`app/api/action-links/verify/route.ts` - Lines ~115-144

### Logic Flow
1. User verifies email and CAPTCHA
2. Link is validated
3. If metadata contains `quote_id`:
   - Fetch current quote data
   - Check if this is the first open (no `first_opened_at`)
   - Build update object with:
     - `status: "opened"`
     - `last_opened_at: now`
     - `open_count: current_count + 1`
     - `first_opened_at: now` (only if first time)
   - Update quote in database
4. Continue with normal verification response

### Error Handling
- If quote update fails, error is logged but verification continues
- This ensures users can still access the quote even if tracking fails

## Use Cases

### Dashboard Analytics
\`\`\`sql
SELECT 
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened_quotes,
  AVG(open_count) as avg_opens_per_quote,
  MAX(open_count) as max_opens
FROM quote
WHERE created_at > NOW() - INTERVAL '30 days'
\`\`\`

### Recent Activity
\`\`\`sql
SELECT 
  id,
  reference_code,
  contact_email,
  first_opened_at,
  last_opened_at,
  open_count,
  DATE_PART('day', NOW() - last_opened_at) as days_since_last_open
FROM quote
WHERE status = 'opened'
ORDER BY last_opened_at DESC
LIMIT 20
\`\`\`

### Quote Engagement
- **Cold**: `status != 'opened'` (never opened)
- **Warm**: `open_count >= 1 AND open_count < 5` (engaged but not decided)
- **Hot**: `open_count >= 5` (highly engaged)
- **Dead**: `status = 'opened' AND last_opened_at < NOW() - INTERVAL '7 days'` (opened but inactive)

## Database Schema Requirements

Your `quote` table already has these columns! ✅
- ✅ `first_opened_at` - timestamp without time zone
- ✅ `last_opened_at` - timestamp without time zone  
- ✅ `open_count` - integer not null default 0
- ✅ `status` - text with 'opened' as valid value

### Recommended Index for Performance

Add this index if you plan to query by recent activity:

\`\`\`sql
-- Add index for performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_quote_last_opened_at ON quote(last_opened_at DESC);
\`\`\`

This index will help with queries like:
- "Show me quotes opened in the last 7 days"
- "What quotes haven't been opened recently?"
- "Sort by most recently active quotes"

## Testing

Test the feature:
1. Create and publish a quote
2. Open the action link
3. Verify:
   - `status` changed to "opened"
   - `first_opened_at` is set
   - `last_opened_at` matches `first_opened_at`
   - `open_count` = 1
4. Close and reopen the link
5. Verify:
   - `first_opened_at` unchanged
   - `last_opened_at` updated
   - `open_count` = 2

## Benefits

✅ **Better Analytics**: Track quote engagement rates  
✅ **Follow-up Triggers**: Know when to follow up based on activity  
✅ **Conversion Tracking**: See which quotes get attention  
✅ **User Behavior**: Understand how recipients interact with quotes
