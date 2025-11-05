# Schema Updates Required for Contacts & Passengers

## Overview
To enable avatar functionality for contacts and passengers, you need to add `avatar_path` columns to both tables.

## Database Migration Script

Run the following SQL in your Supabase SQL Editor:

```sql
-- Add avatar_path column to contact table
ALTER TABLE public.contact 
ADD COLUMN IF NOT EXISTS avatar_path TEXT NULL;

-- Add avatar_path column to contact_passenger table  
ALTER TABLE public.contact_passenger 
ADD COLUMN IF NOT EXISTS avatar_path TEXT NULL;

-- Optional: Add index for faster lookups (if needed)
CREATE INDEX IF NOT EXISTS contact_avatar_path_idx ON public.contact(avatar_path) 
WHERE avatar_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS contact_passenger_avatar_path_idx ON public.contact_passenger(avatar_path) 
WHERE avatar_path IS NOT NULL;
```

## Notes
- The `avatar_path` stores the storage path in Supabase Storage (bucket: "avatar")
- Avatars are stored in paths like: `tenant/{tenant_id}/contact-avatar/{contact_id}/{filename}` or `tenant/{tenant_id}/passenger-avatar/{passenger_id}/{filename}`
- The avatar retrieval is handled via API routes at `/api/avatar/contact/[contactId]` and `/api/avatar/passenger/[passengerId]`
