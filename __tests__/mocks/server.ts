import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"

export const handlers = [
  // Mock quote API endpoints
  http.get("/api/quotes/:id", ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id,
      tenant_id: "test-tenant",
      contact_name: "John Doe",
      contact_email: "john@example.com",
      contact_phone: "1234567890",
      status: "draft",
      legs: [],
      options: [],
      services: [],
      customer: {
        id: "test-contact",
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        company: "Test Company",
      },
    })
  }),

  http.put("/api/quotes/:id", () => {
    return HttpResponse.json({ success: true })
  }),

  http.patch("/api/quotes/:id", () => {
    return HttpResponse.json({ success: true, quote: { id: "test-id", status: "accepted" } })
  }),

  // Mock Supabase auth
  http.post("https://test.supabase.co/auth/v1/token", () => {
    return HttpResponse.json({
      access_token: "mock-token",
      user: { id: "test-user" },
    })
  }),
]

export const server = setupServer(...handlers)
