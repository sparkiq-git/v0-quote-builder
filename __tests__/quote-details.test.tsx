import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { QuoteDetailsTab } from "@/components/quotes/sections/QuoteDetailsTab"
import { emailSchema, phoneSchema, nameSchema, validateQuote } from "@/lib/validations/quote"

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock the contact update function
vi.mock("@/lib/supabase/queries/contacts", () => ({
  updateContact: vi.fn(),
}))

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe("QuoteDetailsTab", () => {
  const mockQuote = {
    id: "test-quote-id",
    tenant_id: "test-tenant",
    contact_id: "test-contact",
    contact_name: "John Doe",
    contact_email: "john@example.com",
    contact_phone: "1234567890",
    contact_company: "Test Company",
    customer: {
      id: "test-contact",
      name: "John Doe",
      email: "john@example.com",
      phone: "1234567890",
      company: "Test Company",
    },
  }

  const mockOnUpdate = vi.fn()
  const mockOnNext = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders quote details form", () => {
    render(
      <TestWrapper>
        <QuoteDetailsTab
          quote={mockQuote}
          onUpdate={mockOnUpdate}
          onNext={mockOnNext}
        />
      </TestWrapper>
    )

    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument()
    expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument()
    expect(screen.getByDisplayValue("1234567890")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Test Company")).toBeInTheDocument()
  })

  it("validates email input", async () => {
    render(
      <TestWrapper>
        <QuoteDetailsTab
          quote={mockQuote}
          onUpdate={mockOnUpdate}
          onNext={mockOnNext}
        />
      </TestWrapper>
    )

    const emailInput = screen.getByDisplayValue("john@example.com")
    fireEvent.change(emailInput, { target: { value: "invalid-email" } })

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument()
    })
  })

  it("validates phone input", async () => {
    render(
      <TestWrapper>
        <QuoteDetailsTab
          quote={mockQuote}
          onUpdate={mockOnUpdate}
          onNext={mockOnNext}
        />
      </TestWrapper>
    )

    const phoneInput = screen.getByDisplayValue("1234567890")
    fireEvent.change(phoneInput, { target: { value: "123" } })

    await waitFor(() => {
      expect(screen.getByText("Phone number must be at least 10 digits")).toBeInTheDocument()
    })
  })

  it("prevents navigation with invalid data", async () => {
    render(
      <TestWrapper>
        <QuoteDetailsTab
          quote={{ ...mockQuote, contact_email: "" }}
          onUpdate={mockOnUpdate}
          onNext={mockOnNext}
        />
      </TestWrapper>
    )

    const nextButton = screen.getByText("Next: Trip Legs")
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument()
      expect(mockOnNext).not.toHaveBeenCalled()
    })
  })

  it("allows navigation with valid data", async () => {
    render(
      <TestWrapper>
        <QuoteDetailsTab
          quote={mockQuote}
          onUpdate={mockOnUpdate}
          onNext={mockOnNext}
        />
      </TestWrapper>
    )

    const nextButton = screen.getByText("Next: Trip Legs")
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled()
    })
  })
})

describe("Quote Validation Schemas", () => {
  describe("emailSchema", () => {
    it("validates correct email formats", () => {
      expect(() => emailSchema.parse("test@example.com")).not.toThrow()
      expect(() => emailSchema.parse("user.name@domain.co.uk")).not.toThrow()
    })

    it("rejects invalid email formats", () => {
      expect(() => emailSchema.parse("invalid-email")).toThrow()
      expect(() => emailSchema.parse("@example.com")).toThrow()
      expect(() => emailSchema.parse("test@")).toThrow()
    })
  })

  describe("phoneSchema", () => {
    it("validates correct phone formats", () => {
      expect(() => phoneSchema.parse("1234567890")).not.toThrow()
      expect(() => phoneSchema.parse("+1234567890")).not.toThrow()
      expect(() => phoneSchema.parse("(123) 456-7890")).not.toThrow()
    })

    it("rejects invalid phone formats", () => {
      expect(() => phoneSchema.parse("123")).toThrow()
      expect(() => phoneSchema.parse("123456789012345")).toThrow()
    })
  })

  describe("nameSchema", () => {
    it("validates correct name formats", () => {
      expect(() => nameSchema.parse("John Doe")).not.toThrow()
      expect(() => nameSchema.parse("A")).not.toThrow()
    })

    it("rejects invalid name formats", () => {
      expect(() => nameSchema.parse("")).toThrow()
      expect(() => nameSchema.parse("A".repeat(101))).toThrow()
    })
  })

  describe("validateQuote", () => {
    const validQuote = {
      tenant_id: "test-tenant",
      contact_name: "John Doe",
      contact_email: "john@example.com",
      contact_phone: "1234567890",
      title: "Test Quote",
      status: "draft",
      valid_until: "2024-12-31T23:59:59Z",
      legs: [{
        origin: "LAX",
        origin_code: "LAX",
        destination: "JFK",
        destination_code: "JFK",
        departureDate: "2024-01-01",
        passengers: 2,
      }],
      options: [{
        id: "option-1",
        label: "Option 1",
        aircraft_id: "aircraft-1",
        flight_hours: 5,
        cost_operator: 10000,
        price_commission: 1000,
        price_base: 0,
      }],
      customer: {
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
      },
    }

    it("validates a complete quote", () => {
      expect(() => validateQuote(validQuote)).not.toThrow()
    })

    it("rejects quote with missing required fields", () => {
      const invalidQuote = { ...validQuote, contact_email: "" }
      expect(() => validateQuote(invalidQuote)).toThrow()
    })

    it("rejects quote with invalid legs", () => {
      const invalidQuote = { ...validQuote, legs: [] }
      expect(() => validateQuote(invalidQuote)).toThrow()
    })

    it("rejects quote with invalid options", () => {
      const invalidQuote = { ...validQuote, options: [] }
      expect(() => validateQuote(invalidQuote)).toThrow()
    })
  })
})
