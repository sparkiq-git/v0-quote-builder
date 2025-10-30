import type { Quote, QuoteStatus } from "@/lib/types"

// Type mapping utilities for frontend/backend data conversion
export class QuoteTypeMapper {
  // Map backend quote data to frontend format
  static mapBackendToFrontend(backendQuote: any): Quote {
    return {
      id: backendQuote.id,
      leadId: backendQuote.lead_id,
      customerId: backendQuote.contact_id || backendQuote.customer_id,
      customer: {
        id: backendQuote.contact_id || backendQuote.customer_id,
        name: backendQuote.contact_name || backendQuote.customer?.name,
        email: backendQuote.contact_email || backendQuote.customer?.email,
        phone: backendQuote.contact_phone || backendQuote.customer?.phone,
        company: backendQuote.contact_company || backendQuote.customer?.company,
      },
      legs: backendQuote.legs || [],
      options: backendQuote.options || [],
      services: backendQuote.services || [],
      status: this.mapStatusToFrontend(backendQuote.status),
      expiresAt: backendQuote.valid_until || backendQuote.expires_at,
      createdAt: backendQuote.created_at,
      publishedAt: backendQuote.published_at,
      token: backendQuote.token,
      selectedOptionId: backendQuote.selected_option_id,
      terms: backendQuote.terms || "",
      branding: backendQuote.branding || {
        primaryColor: "#2563eb",
      },
      itineraryId: backendQuote.itinerary_id,
      workflowData: backendQuote.workflow_data,
    }
  }

  // Map frontend quote data to backend format
  static mapFrontendToBackend(frontendQuote: Quote): any {
    return {
      id: frontendQuote.id,
      tenant_id: frontendQuote.tenant_id,
      contact_id: frontendQuote.customerId,
      contact_name: frontendQuote.customer.name,
      contact_email: frontendQuote.customer.email,
      contact_phone: frontendQuote.customer.phone,
      contact_company: frontendQuote.customer.company,
      title: frontendQuote.title,
      status: this.mapStatusToBackend(frontendQuote.status),
      valid_until: frontendQuote.expiresAt,
      notes: frontendQuote.notes,
      trip_type: frontendQuote.trip_type,
      legs: frontendQuote.legs,
      options: frontendQuote.options,
      services: frontendQuote.services,
      branding: frontendQuote.branding,
      workflow_data: frontendQuote.workflowData,
    }
  }

  // Map backend status to frontend status
  static mapStatusToFrontend(backendStatus: string): QuoteStatus {
    const statusMap: Record<string, QuoteStatus> = {
      "draft": "draft",
      "sent": "sent",
      "opened": "opened", 
      "accepted": "accepted",
      "declined": "declined",
      "cancelled": "cancelled",
      "invoiced": "invoiced",
      "expired": "expired",
      // Legacy mappings for backward compatibility
      "pending_response": "sent",
      "client_accepted": "accepted",
      "availability_confirmed": "accepted",
      "pending_payment": "accepted",
      "payment_received": "accepted",
      "itinerary_created": "accepted",
    }
    
    return statusMap[backendStatus] || "draft"
  }

  // Map frontend status to backend status
  static mapStatusToBackend(frontendStatus: QuoteStatus): string {
    const statusMap: Record<QuoteStatus, string> = {
      "draft": "draft",
      "sent": "sent",
      "opened": "opened",
      "accepted": "accepted", 
      "declined": "declined",
      "cancelled": "cancelled",
      "invoiced": "invoiced",
      "expired": "expired",
    }
    
    return statusMap[frontendStatus] || "draft"
  }

  // Validate and normalize quote data
  static normalizeQuote(quote: any): Quote {
    const normalized = this.mapBackendToFrontend(quote)
    
    // Ensure required fields have defaults
    return {
      ...normalized,
      customer: {
        id: normalized.customer.id || "",
        name: normalized.customer.name || "",
        email: normalized.customer.email || "",
        phone: normalized.customer.phone || "",
        company: normalized.customer.company || "",
      },
      legs: normalized.legs || [],
      options: normalized.options || [],
      services: normalized.services || [],
      branding: normalized.branding || {
        primaryColor: "#2563eb",
      },
    }
  }
}

// Helper function to safely get quote status
export function getQuoteStatus(quote: any): QuoteStatus {
  if (!quote?.status) return "draft"
  return QuoteTypeMapper.mapStatusToFrontend(quote.status)
}

// Helper function to check if quote is in a terminal state
export function isTerminalStatus(status: QuoteStatus): boolean {
  return ["accepted", "declined", "cancelled", "invoiced", "expired"].includes(status)
}

// Helper function to check if quote can be edited
export function canEditQuote(status: QuoteStatus): boolean {
  return ["draft", "sent", "opened"].includes(status)
}

// Helper function to check if quote can be published
export function canPublishQuote(status: QuoteStatus): boolean {
  return status === "draft"
}
