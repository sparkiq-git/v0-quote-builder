# DocuSign Integration - Simple Flow

## Your Workflow
```
Customer accepts quote → Contract sent via email → Customer signs → Done
```

No complex tracking (yet). Just send it and store the envelope ID for later.

## Setup (5 minutes)

### 1. Install DocuSign SDK
```bash
pnpm add docusign-esign
```

### 2. Add Environment Variables
```env
# .env.local
DOCUSIGN_CLIENT_ID=your-integration-key
DOCUSIGN_CLIENT_SECRET=your-client-secret
DOCUSIGN_ACCOUNT_ID=your-account-id
DOCUSIGN_USER_ID=your-email@example.com
DOCUSIGN_BASE_URL=https://demo.docusign.net  # Use https://www.docusign.net for production
DOCUSIGN_TEMPLATE_ID=your-template-id
```

### 3. Run Database Schema
Run `lib/docusign/schema.sql` in Supabase SQL Editor.

## Implementation

### API Route: Send Contract
`app/api/contracts/send/route.ts`

```typescript
import { NextResponse } from "next/server"
import { createActionLinkClient } from "@/lib/supabase/action-links"
import docusign from "docusign-esign"

export async function POST(req: Request) {
  try {
    const { quoteId } = await req.json()
    const supabase = await createActionLinkClient(true)

    // 1. Fetch quote data
    const { data: quote, error } = await supabase
      .from("quote")
      .select("*")
      .eq("id", quoteId)
      .single()

    if (error) throw new Error("Quote not found")

    // 2. Configure DocuSign client
    const apiClient = new docusign.ApiClient()
    apiClient.setBasePath(process.env.DOCUSIGN_BASE_URL)
    apiClient.addDefaultHeader("Authorization", `Bearer ${await getDocusignToken()}`)

    const envelopesApi = new docusign.EnvelopesApi(apiClient)

    // 3. Create envelope from template
    const envelope = {
      templateId: process.env.DOCUSIGN_TEMPLATE_ID,
      templateRoles: [
        {
          email: quote.contact_email,
          name: quote.contact_name,
          roleName: "Signer",
        },
      ],
      status: "sent", // Automatically send
    }

    // Map quote data to template fields (customize these field names)
    const tabs = {
      textTabs: [
        { tabLabel: "customerName", value: quote.contact_name },
        { tabLabel: "customerEmail", value: quote.contact_email },
        { tabLabel: "tripOrigin", value: quote.legs[0]?.origin_code || "" },
        { tabLabel: "tripDestination", value: quote.legs[0]?.destination_code || "" },
        { tabLabel: "totalCost", value: quote.options[0]?.price_total?.toString() || "" },
      ],
    }
    envelope.templateRoles[0].tabs = tabs

    // 4. Send envelope
    const results = await envelopesApi.createEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, {
      envelopeDefinition: envelope,
    })

    // 5. Create contract record in DB
    const { data: contract } = await supabase
      .from("contract")
      .insert({
        quote_id: quoteId,
        tenant_id: quote.tenant_id,
        envelope_id: results.envelopeId,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    return NextResponse.json({ 
      success: true, 
      contract: {
        id: contract.id,
        envelopeId: results.envelopeId,
        status: "sent"
      }
    })
  } catch (error: any) {
    console.error("Contract send error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper: Get DocuSign JWT token
async function getDocusignToken() {
  // For now, return cached token or implement JWT flow
  // This is a simplified version - implement proper JWT auth
  return "YOUR_ACCESS_TOKEN"
}
```

### When to Send?

Add this to your quote acceptance flow:

```typescript
// In public-quote-page.tsx or wherever quote is accepted
if (quote.status === "accepted") {
  // Send contract
  await fetch("/api/contracts/send", {
    method: "POST",
    body: JSON.stringify({ quoteId: quote.id })
  })
}
```

## What's Stored

- **envelope_id**: DocuSign's unique ID (for future webhook tracking)
- **status**: simple status (sent, completed, declined)
- **sent_at**: when contract was sent

## Future Expansion (When Needed)

When you want to track open/sign events:

1. **Add webhook endpoint** `/api/docusign/webhook`
2. **Listen for events**: envelope-delivered, envelope-completed
3. **Update contract status** based on events
4. **Optional**: Add `docusign_event_log` table for detailed tracking

## DocuSign Setup

1. Create account: https://developers.docusign.com
2. Create Integration Key
3. Create template with data fields
4. Get credentials

---

**That's it!** Simple send-and-forget. Build the rest later when needed.
