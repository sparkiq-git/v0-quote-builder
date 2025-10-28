import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET, PUT, PATCH } from "@/app/api/quotes/[id]/route"
import { QuoteTypeMapper } from "@/lib/utils/quote-mapper"

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: {
            id: "test-quote-id",
            tenant_id: "test-tenant",
            contact_name: "John Doe",
            contact_email: "john@example.com",
            contact_phone: "1234567890",
            status: "draft",
            created_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        })),
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: "test-quote-id", status: "accepted" },
            error: null,
          })),
        })),
      })),
    })),
    upsert: vi.fn(() => ({
      data: [],
      error: null,
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        not: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
  auth: {
    getUser: vi.fn(() => ({
      data: { user: { id: "test-user" } },
      error: null,
    })),
  },
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockSupabase,
}))

vi.mock("@/lib/supabase/action-links", () => ({
  createActionLinkClient: () => mockSupabase,
}))

describe("Quote API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/quotes/[id]", () => {
    it("returns quote data for authenticated requests", async () => {
      const request = new NextRequest("http://localhost:3000/api/quotes/test-id")
      const response = await GET(request, { params: { id: "test-id" } })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.id).toBe("test-quote-id")
      expect(data.customer.name).toBe("John Doe")
    })

    it("handles public quote access", async () => {
      const request = new NextRequest("http://localhost:3000/api/quotes/test-id", {
        headers: {
          "x-public-quote": "true",
        },
      })
      
      const response = await GET(request, { params: { id: "test-id" } })
      expect(response.status).toBe(200)
    })

    it("returns 404 for non-existent quote", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { message: "Not found" },
            })),
          })),
        })),
      })

      const request = new NextRequest("http://localhost:3000/api/quotes/non-existent")
      const response = await GET(request, { params: { id: "non-existent" } })
      
      expect(response.status).toBe(404)
    })
  })

  describe("PATCH /api/quotes/[id]", () => {
    it("updates quote status for public access", async () => {
      const request = new NextRequest("http://localhost:3000/api/quotes/test-id", {
        method: "PATCH",
        headers: {
          "x-public-quote": "true",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "accepted",
          selectedOptionId: "option-1",
        }),
      })

      const response = await PATCH(request, { params: { id: "test-id" } })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it("rejects unauthorized requests", async () => {
      const request = new NextRequest("http://localhost:3000/api/quotes/test-id", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "accepted",
        }),
      })

      const response = await PATCH(request, { params: { id: "test-id" } })
      expect(response.status).toBe(401)
    })
  })

  describe("PUT /api/quotes/[id]", () => {
    it("updates quote data for authenticated users", async () => {
      const request = new NextRequest("http://localhost:3000/api/quotes/test-id", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          quote: {
            contact_name: "Jane Doe",
            contact_email: "jane@example.com",
            status: "draft",
          },
          legs: [],
          options: [],
          services: [],
        }),
      })

      const response = await PUT(request, { params: { id: "test-id" } })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it("rejects unauthenticated requests", async () => {
      mockSupabase.auth.getUser.mockReturnValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest("http://localhost:3000/api/quotes/test-id", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          quote: { contact_name: "Jane Doe" },
        }),
      })

      const response = await PUT(request, { params: { id: "test-id" } })
      expect(response.status).toBe(401)
    })
  })
})

describe("QuoteTypeMapper", () => {
  describe("mapStatusToFrontend", () => {
    it("maps backend statuses to frontend statuses", () => {
      expect(QuoteTypeMapper.mapStatusToFrontend("draft")).toBe("draft")
      expect(QuoteTypeMapper.mapStatusToFrontend("sent")).toBe("sent")
      expect(QuoteTypeMapper.mapStatusToFrontend("accepted")).toBe("accepted")
    })

    it("handles legacy status mappings", () => {
      expect(QuoteTypeMapper.mapStatusToFrontend("pending_response")).toBe("sent")
      expect(QuoteTypeMapper.mapStatusToFrontend("client_accepted")).toBe("accepted")
    })

    it("defaults to draft for unknown statuses", () => {
      expect(QuoteTypeMapper.mapStatusToFrontend("unknown")).toBe("draft")
    })
  })

  describe("mapStatusToBackend", () => {
    it("maps frontend statuses to backend statuses", () => {
      expect(QuoteTypeMapper.mapStatusToBackend("draft")).toBe("draft")
      expect(QuoteTypeMapper.mapStatusToBackend("sent")).toBe("sent")
      expect(QuoteTypeMapper.mapStatusToBackend("accepted")).toBe("accepted")
    })

    it("defaults to draft for unknown statuses", () => {
      expect(QuoteTypeMapper.mapStatusToBackend("unknown" as any)).toBe("draft")
    })
  })

  describe("normalizeQuote", () => {
    it("normalizes quote data with defaults", () => {
      const backendQuote = {
        id: "test-id",
        tenant_id: "tenant-1",
        contact_name: "John Doe",
        contact_email: "john@example.com",
        status: "draft",
      }

      const normalized = QuoteTypeMapper.normalizeQuote(backendQuote)
      
      expect(normalized.id).toBe("test-id")
      expect(normalized.customer.name).toBe("John Doe")
      expect(normalized.legs).toEqual([])
      expect(normalized.options).toEqual([])
      expect(normalized.services).toEqual([])
      expect(normalized.branding.primaryColor).toBe("#2563eb")
    })
  })
})
