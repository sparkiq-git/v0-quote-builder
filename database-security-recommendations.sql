-- Database Security Recommendations for Action Links
-- Run these SQL commands in your Supabase SQL editor

-- 1. Create indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_action_link_token_hash ON action_link(token_hash);
CREATE INDEX IF NOT EXISTS idx_action_link_tenant_status ON action_link(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_action_link_expires_at ON action_link(expires_at);

-- 2. Add constraints for data integrity
ALTER TABLE action_link 
ADD CONSTRAINT chk_action_link_max_uses CHECK (max_uses > 0 AND max_uses <= 10);
ALTER TABLE action_link 
ADD CONSTRAINT chk_action_link_use_count CHECK (use_count >= 0 AND use_count <= max_uses);

-- 3. Create a function to automatically clean up expired links
CREATE OR REPLACE FUNCTION cleanup_expired_action_links()
RETURNS void AS $$
BEGIN
  DELETE FROM action_link 
  WHERE expires_at < NOW() 
  AND status IN ('active', 'consumed');
END;
$$ LANGUAGE plpgsql;

-- 4. Create a scheduled job to run cleanup (if using pg_cron)
-- SELECT cron.schedule('cleanup-expired-links', '0 2 * * *', 'SELECT cleanup_expired_action_links();');

-- 5. Add RLS policies for additional security
ALTER TABLE action_link ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow service role to access action_link table
CREATE POLICY "Service role only" ON action_link
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Create audit trigger for action_link changes
CREATE OR REPLACE FUNCTION audit_action_link_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO action_link_audit_log (
    tenant_id,
    actor_user_id,
    action,
    target_id,
    details,
    ip,
    user_agent
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    COALESCE(NEW.created_by, OLD.created_by),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'action_link.create'
      WHEN TG_OP = 'UPDATE' THEN 'action_link.update'
      WHEN TG_OP = 'DELETE' THEN 'action_link.delete'
    END,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'operation', TG_OP,
      'old_data', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
      'new_data', CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE NULL END
    ),
    'system',
    'system'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER audit_action_link_trigger
  AFTER INSERT OR UPDATE OR DELETE ON action_link
  FOR EACH ROW EXECUTE FUNCTION audit_action_link_changes();

-- 7. Add rate limiting table for additional protection
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window ON rate_limits(key, window_start);

-- 8. Create function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  rate_key TEXT,
  max_requests INTEGER,
  window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Clean old entries
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  -- Get current count
  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM rate_limits 
  WHERE key = rate_key 
  AND window_start > NOW() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Check if limit exceeded
  IF current_count >= max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (rate_key, 1, NOW())
  ON CONFLICT (key, window_start) 
  DO UPDATE SET count = rate_limits.count + 1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
