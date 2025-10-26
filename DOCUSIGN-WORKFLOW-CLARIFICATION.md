# DocuSign Workflow - You vs Clients

## 🎯 Clarification

**YOU** own the DocuSign account and Integration
**THEY** just receive and sign contracts

## Your Setup (One-Time)

### What YOU Need:
1. **Your own DocuSign Developer account**
   - Go to: https://developers.docusign.com
   - Sign up (free developer account)
   
2. **Create templates in YOUR account**
   - Design contract template once
   - Add text fields for data (customer name, trip details, etc.)
   - Save template in YOUR DocuSign account
   
3. **Create Integration in YOUR account**
   - Generate API credentials
   - Use these in your Edge Function
   
### What CLIENTS Need:
**NOTHING** ❌
- They don't need an account
- They don't need to be developers
- They just receive an email and sign

## How It Works

```
┌─────────────────────────────────────┐
│  YOUR DOCUSIGN ACCOUNT              │
│  - You have Integration credentials │
│  - You have template                │
│  - You send contracts               │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  YOUR APPLICATION                   │
│  Edge Function calls DocuSign API   │
│  Using YOUR credentials             │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  CLIENT RECEIVES EMAIL              │
│  Sent to their email address        │
│  They click "Sign"                  │
│  They don't need an account         │
└─────────────────────────────────────┘
```

## Template Approach

### Recommended: Generic Template

Create **ONE** generic contract template in YOUR account:

**Template Fields:**
- `customerName` - Who the contract is for
- `customerEmail` - Where to send it
- `tripOrigin` - Where they're flying from
- `tripDestination` - Where they're flying to
- `departureDate` - When they're departing
- `totalCost` - How much it costs
- `aircraftType` - What plane they'll use

**In Your Edge Function:**
```typescript
// You populate these fields from your quote data
const tabs = {
  textTabs: [
    { tabLabel: "customerName", value: quote.contact_name },
    { tabLabel: "customerEmail", value: quote.contact_email },
    { tabLabel: "tripOrigin", value: quote.legs[0]?.origin_code },
    // ... etc
  ]
}
```

## Setup Steps (You Only)

1. ✅ Create DocuSign Developer account (yourself)
2. ✅ Create template in your account
3. ✅ Create Integration (Apps & Keys)
4. ✅ Get credentials
5. ✅ Share credentials with me
6. ✅ I'll add to your Edge Function

## The Client Experience

**What they see:**
1. They get an email: "Please sign your AeroIQ charter contract"
2. They click "Review Document"
3. They see the contract with their details pre-filled
4. They click "Sign"
5. Done! They never see your credentials or technical setup

## Important Points

✅ **You control everything**
✅ **Clients are non-technical users**
✅ **One template works for all clients**
✅ **You can design the contract once**

❌ **Clients don't need DocuSign accounts**
❌ **Clients don't need developer access**
❌ **Each client doesn't need their own template**

---

**Bottom line:** This is YOUR integration, YOUR account, YOUR templates. Clients just sign contracts sent to their email.
