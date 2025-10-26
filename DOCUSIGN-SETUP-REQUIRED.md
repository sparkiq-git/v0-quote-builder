# DocuSign Setup - What I Need From You

## Required Information

Please provide these credentials from your DocuSign Developer account:

### 1. Integration Credentials
- **Integration Key** (Client ID): `your-integration-key-here`
- **Integration Secret** (Client Secret): `your-client-secret-here`
- **Account ID** (User ID): `your-account-id-here`
- **User Email**: `your-email@example.com` (the email you registered with DocuSign)

### 2. Template Information
- **Template ID**: `your-template-id-here`

### 3. Environment
- Are you using **Demo** or **Production** environment?
  - Demo: `https://demo.docusign.net`
  - Production: `https://www.docusign.net`

## Step-by-Step Guide

### How to Get These Values:

#### A. Integration Credentials
1. Go to: https://developers.docusign.com
2. Login to your account
3. Navigate to: **Admin → Integrations → Apps and Keys**
4. Click **Add App and Integration Key**
5. Fill in:
   - **App Name**: "AeroIQ Contracts" (or any name)
   - **Redirect URI**: `https://yourdomain.com/api/docusign/callback` (can be placeholder)
6. Copy the **Integration Key**
7. Click on the Integration Key → **Generate Secret** → Copy the secret

#### B. Account ID
1. In the same page (Apps and Keys)
2. Find the **"Account"** section
3. Copy the **Account ID** (looks like: `12345678-1234-1234-1234-123456789abc`)

#### C. Template ID
1. Go to: https://app.docusign.com (or demo.docusign.com)
2. Navigate to: **Templates**
3. Create a new template or select existing one
4. Design your contract with text fields
5. Click **Send to Self** (to save)
6. In the URL, you'll see: `templateId=ABC123...` → That's your Template ID

#### D. Template Fields Setup
In your DocuSign template, add these text fields (with these exact names):

| Field Name | Type | Required |
|------------|------|----------|
| `customerName` | Text | Yes |
| `customerEmail` | Text | Yes |
| `tripOrigin` | Text | No |
| `tripDestination` | Text | No |
| `totalCost` | Text | No |
| `departureDate` | Text | No |
| `customerCompany` | Text | No |

**How to add fields in DocuSign template:**
1. Open your template
2. Click **Add Fields** → **Text**
3. Place field where needed
4. Name it exactly as in the table above (case-sensitive)
5. Save the template

## Once You Have Everything

Share these values with me (preferably via secure channel):
```
DOCUSIGN_CLIENT_ID=<integration-key>
DOCUSIGN_CLIENT_SECRET=<secret>
DOCUSIGN_ACCOUNT_ID=<account-id>
DOCUSIGN_USER_ID=<your-email>
DOCUSIGN_BASE_URL=<https://demo.docusign.net or https://www.docusign.net>
DOCUSIGN_TEMPLATE_ID=<template-id>
```

Then I'll add the DocuSign integration code to your Edge Function!
