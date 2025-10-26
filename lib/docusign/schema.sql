-- Simplified Docusign Integration Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- CONTRACT TABLE (Simplified)
-- ============================================
CREATE TABLE IF NOT EXISTS public.contract (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- Docusign Basic Info
  envelope_id TEXT NULL, -- DocuSign envelope ID for future tracking
  
  -- Simple Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, completed, declined
  
  -- Basic Timestamps
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Metadata
  created_by_user_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT contract_pkey PRIMARY KEY (id),
  CONSTRAINT contract_quote_fkey FOREIGN KEY (quote_id) REFERENCES quote(id) ON DELETE CASCADE,
  CONSTRAINT contract_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
  CONSTRAINT contract_status_check CHECK (
    status IN ('draft', 'sent', 'completed', 'declined')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_quote_id ON public.contract(quote_id);
CREATE INDEX IF NOT EXISTS idx_contract_tenant_id ON public.contract(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_envelope_id ON public.contract(envelope_id);

-- RLS
ALTER TABLE public.contract ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts in their tenant"
  ON public.contract
  FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.tenant_member WHERE tenant_id = contract.tenant_id
  ));

CREATE POLICY "Users can insert contracts in their tenant"
  ON public.contract
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.tenant_member WHERE tenant_id = contract.tenant_id
  ));

CREATE POLICY "Users can update contracts in their tenant"
  ON public.contract
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM public.tenant_member WHERE tenant_id = contract.tenant_id
  ));

-- Auto-update updated_at
CREATE TRIGGER trigger_contract_updated_at
  BEFORE UPDATE ON public.contract
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_updated_at();

-- Comment for future expansion
COMMENT ON TABLE public.contract IS 'Stores contract records with DocuSign envelope info. Ready for future event tracking via envelope_id.';
