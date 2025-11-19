import { z } from "zod"

// Base validation schemas
export const emailSchema = z.string().email("Please enter a valid email address")
export const phoneSchema = z.string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number too long")
  .regex(/^[\d\s\-\+\(\)]+$/, "Phone number contains invalid characters")
export const nameSchema = z.string().min(1, "Name is required").max(100, "Name too long")
// Company is optional - allow empty string, undefined, or valid string up to 100 chars
export const companySchema = z.union([
  z.string().max(100, "Company name too long"),
  z.literal("")
]).optional()

// Airport validation
export const airportSchema = z.object({
  airport_code: z.string().min(3, "Airport code required").max(4, "Invalid airport code"),
  airport: z.string().min(1, "Airport name required"),
  lat: z.number().optional(),
  lon: z.number().optional(),
})

// Date/time validation
export const dateSchema = z.string().min(1, "Date is required")
export const timeSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")

// Leg validation
export const legSchema = z.object({
  id: z.string().optional(),
  origin: z.string().min(1, "Origin airport required"),
  origin_code: z.string().min(3, "Origin code required"),
  destination: z.string().min(1, "Destination airport required"),
  destination_code: z.string().min(3, "Destination code required"),
  departureDate: z.string().min(1, "Departure date required"),
  departureTime: z.string().optional(),
  passengers: z.number().min(1, "At least 1 passenger required").max(50, "Too many passengers"),
  origin_lat: z.number().optional(),
  origin_long: z.number().optional(),
  destination_lat: z.number().optional(),
  destination_long: z.number().optional(),
})

// Quote option validation
export const quoteFeeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Fee name required"),
  amount: z.number().min(0, "Fee amount must be positive"),
})

export const quoteOptionSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Option label required"),
  aircraft_id: z.string().min(1, "Aircraft selection required"),
  flight_hours: z.number().min(0, "Flight hours must be positive"),
  cost_operator: z.number().min(0, "Operator cost must be positive"),
  price_commission: z.number().min(0, "Commission must be positive"),
  price_base: z.number().min(0, "Base price must be positive"),
  notes: z.string().optional(),
  fees: z.array(quoteFeeSchema).default([]),
  feesEnabled: z.boolean().default(false),
  selectedAmenities: z.array(z.string()).default([]),
})

// Service validation
export const serviceSchema = z.object({
  id: z.string(),
  item_id: z.string().optional(),
  description: z.string().min(1, "Service description required"),
  amount: z.number().min(0, "Service amount must be positive"),
  qty: z.number().min(1, "Quantity must be at least 1").default(1),
  taxable: z.boolean().default(false),
  notes: z.string().optional(),
})

// Customer validation
export const customerSchema = z.object({
  id: z.string().optional(),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  company: companySchema,
})

// Main quote validation schema
export const quoteSchema = z.object({
  id: z.string().optional(),
  tenant_id: z.string().min(1, "Tenant ID required"),
  contact_id: z.string().optional(),
  contact_name: nameSchema,
  contact_email: emailSchema,
  contact_phone: phoneSchema,
  contact_company: companySchema,
  title: z.string().min(1, "Quote title required").max(200, "Title too long"),
  status: z.enum(["draft", "sent", "opened", "accepted", "declined", "cancelled", "invoiced", "expired"]),
  valid_until: z.string().min(1, "Expiration date required"),
  notes: z.string().optional(),
  trip_type: z.enum(["one-way", "round-trip", "multi-city"]).default("one-way"),
  legs: z.array(legSchema).min(1, "At least one trip leg required"),
  options: z.array(quoteOptionSchema).min(1, "At least one aircraft option required"),
  services: z.array(serviceSchema).default([]),
  customer: customerSchema,
})

// Partial schemas for updates
export const quoteUpdateSchema = quoteSchema.partial()
export const legUpdateSchema = legSchema.partial()
export const optionUpdateSchema = quoteOptionSchema.partial()
export const serviceUpdateSchema = serviceSchema.partial()

// Validation helper functions
export function validateQuote(data: unknown) {
  return quoteSchema.parse(data)
}

export function validateQuoteUpdate(data: unknown) {
  return quoteUpdateSchema.parse(data)
}

export function validateLeg(data: unknown) {
  return legSchema.parse(data)
}

export function validateOption(data: unknown) {
  return quoteOptionSchema.parse(data)
}

export function validateService(data: unknown) {
  return serviceSchema.parse(data)
}

// Type exports
export type QuoteInput = z.infer<typeof quoteSchema>
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>
export type LegInput = z.infer<typeof legSchema>
export type OptionInput = z.infer<typeof quoteOptionSchema>
export type ServiceInput = z.infer<typeof serviceSchema>
export type CustomerInput = z.infer<typeof customerSchema>

// Error handling helper
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  
  return errors
}
