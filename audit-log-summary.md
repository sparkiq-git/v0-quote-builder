# Action Link Audit Logging - Simplified Approach

## Problem
The audit log was too noisy with:
- ❌ Every `UPDATE` triggering an audit log entry with null details
- ❌ Every `verify` action being logged (hundreds per link)
- ❌ Duplicate `create` entries from both trigger and application code
- ❌ Empty `details` fields

## Solution - Simplified Logging

### What Gets Logged ✅

1. **Link Creation** (via database trigger)
   - Only logs INSERT operations
   - Simple details: `email`, `action_type`, `expires_at`
   - No full row snapshots

2. **Link Consumption** (manual logging)
   - When user accepts/declines quote
   - Details include: `action_type`, `payload` (accept/decline)
   - IP and user agent for tracking

### What NO LONGER Gets Logged ❌

- ~~System updates~~ (status changes, timestamp updates)
- ~~Verification attempts~~ (too many, not meaningful)
- ~~Email sends~~ (redundant with creation log)

## Database Changes

Run this SQL to update the trigger:

\`\`\`sql
-- Drop old trigger
DROP TRIGGER IF EXISTS audit_action_link_trigger ON action_link;

-- Create simplified trigger
CREATE OR REPLACE FUNCTION audit_action_link_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log INSERT operations (link creation)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO action_link_audit_log (
      tenant_id,
      actor_user_id,
      action,
      target_id,
      details,
      ip,
      user_agent
    ) VALUES (
      NEW.tenant_id,
      NEW.created_by,
      'action_link.create',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'action_type', NEW.action_type,
        'expires_at', NEW.expires_at
      ),
      'system',
      'system'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger - ONLY on INSERT
CREATE TRIGGER audit_action_link_trigger
  AFTER INSERT ON action_link
  FOR EACH ROW EXECUTE FUNCTION audit_action_link_changes();
\`\`\`

## Result

Clean audit logs showing:
- ✅ Link creation (who, when, for what)
- ✅ User acceptance/decline (the action)
- ❌ No system noise
- ❌ No redundant entries

## Files Modified

1. ✅ `database-security-recommendations.sql` - Updated trigger
2. ✅ `supabase/functions/create-action-link/index.ts` - Removed duplicate logging
3. ✅ `app/api/action-links/verify/route.ts` - Removed verify logging
4. ✅ `app/api/action-links/consume/route.ts` - Kept (important for tracking user actions)
