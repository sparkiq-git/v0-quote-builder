"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { SimpleContactCombobox } from "@/components/ui/simple-contact-combobox"
import { ChevronRight, AlertCircle } from "lucide-react"
import { updateContact } from "@/lib/supabase/queries/contacts"
import { useToast } from "@/hooks/use-toast"
import { emailSchema, phoneSchema, nameSchema, companySchema, getValidationErrors } from "@/lib/validations/quote"
import { z } from "zod"
import type { Quote } from "@/lib/types"

interface Props {
  quote: Quote
  onUpdate: (updates: Partial<Quote>) => void
  onNext: () => void
}

export function QuoteDetailsTab({ quote, onUpdate, onNext }: Props) {
  const { toast } = useToast()
  const [showPrompt, setShowPrompt] = useState(false)
  const [pendingEdit, setPendingEdit] = useState<{ field: string; value: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleFieldChange = (field: "email" | "phone" | "company" | "name", value: string) => {
    // Clear previous validation error for this field
    setValidationErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[`contact_${field}`]
      return newErrors
    })

    // Validate the field
    try {
      let schema
      switch (field) {
        case "email":
          schema = emailSchema
          break
        case "phone":
          schema = phoneSchema
          break
        case "name":
          schema = nameSchema
          break
        case "company":
          schema = companySchema
          break
        default:
          return
      }

      schema.parse(value)

      // If validation passes, update the quote
      onUpdate({
        [`contact_${field}`]: value,
        customer: { ...quote.customer, [field]: value },
      })

      if (quote.contact_id) {
        setPendingEdit({ field, value })
        setShowPrompt(true)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = getValidationErrors(error)
        setValidationErrors((prev) => ({ ...prev, ...errors }))

        toast({
          title: "Validation Error",
          description: Object.values(errors)[0] || "Invalid input",
          variant: "destructive",
        })
      }
    }
  }

  // 🔄 Navigate (save handled by parent)
  const handleNext = () => {
    // Validate required fields before proceeding
    const requiredFields = {
      contact_name: quote.contact_name || quote.customer?.name,
      contact_email: quote.contact_email || quote.customer?.email,
      contact_phone: quote.contact_phone || quote.customer?.phone,
    }

    const errors: Record<string, string> = {}

    // Check required fields
    if (!requiredFields.contact_name) {
      errors.contact_name = "Contact name is required"
    }
    if (!requiredFields.contact_email) {
      errors.contact_email = "Email is required"
    }
    if (!requiredFields.contact_phone) {
      errors.contact_phone = "Phone is required"
    }

    // Validate email format if provided
    if (requiredFields.contact_email) {
      try {
        emailSchema.parse(requiredFields.contact_email)
      } catch {
        errors.contact_email = "Please enter a valid email address"
      }
    }

    // Validate phone format if provided
    if (requiredFields.contact_phone) {
      try {
        phoneSchema.parse(requiredFields.contact_phone)
      } catch {
        errors.contact_phone = "Please enter a valid phone number"
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast({
        title: "Please fix validation errors",
        description: "All required fields must be completed correctly before proceeding.",
        variant: "destructive",
      })
      return
    }

    // Clear any existing validation errors
    setValidationErrors({})
    onNext()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quote Details</CardTitle>
        <CardDescription>Specify the contact and expiration details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Contact *</Label>
            <SimpleContactCombobox
              tenantId={quote.tenant_id}
              value={quote.contact_id || null}
              selectedName={quote.contact_name || quote.customer?.name || null}
              onSelect={(c) =>
                onUpdate({
                  contact_id: c.id,
                  contact_name: c.full_name || "",
                  contact_email: c.email || "",
                  contact_phone: c.phone || "",
                  contact_company: c.company || "",
                  customer: {
                    id: c.id,
                    name: c.full_name || "",
                    email: c.email || "",
                    phone: c.phone || "",
                    company: c.company || "",
                  },
                })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>Email *</Label>
            <Input
              value={quote.contact_email || quote.customer?.email || ""}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              placeholder="Email address"
              className={validationErrors.contact_email ? "border-red-500" : ""}
            />
            {validationErrors.contact_email && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {validationErrors.contact_email}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Phone *</Label>
            <Input
              value={quote.contact_phone || quote.customer?.phone || ""}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              placeholder="Phone number"
              className={validationErrors.contact_phone ? "border-red-500" : ""}
            />
            {validationErrors.contact_phone && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {validationErrors.contact_phone}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Company</Label>
            <Input
              value={quote.contact_company || quote.customer?.company || ""}
              onChange={(e) => handleFieldChange("company", e.target.value)}
              placeholder="Company"
              className={validationErrors.contact_company ? "border-red-500" : ""}
            />
            {validationErrors.contact_company && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {validationErrors.contact_company}
              </div>
            )}
          </div>
        </div>

        {/* Update contact dialog */}
        <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update contact record?</DialogTitle>
              <DialogDescription>
                You’re editing the {pendingEdit?.field} for <strong>{quote.contact_name}</strong>.
                <br />
                Update this info in the contact database too?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPrompt(false)}>
                No, only this quote
              </Button>
              <Button
                onClick={async () => {
                  try {
                    if (quote.contact_id && pendingEdit) {
                      await updateContact(quote.contact_id, {
                        [pendingEdit.field]: pendingEdit.value,
                      })
                      toast({
                        title: "Contact updated",
                        description: `${quote.contact_name}'s ${pendingEdit.field} was updated.`,
                      })
                    }
                  } catch (err: any) {
                    toast({
                      title: "Failed to update contact",
                      description: err.message,
                      variant: "destructive",
                    })
                  } finally {
                    setShowPrompt(false)
                    setPendingEdit(null)
                  }
                }}
              >
                Yes, update contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Separator />

        {/* Notes */}
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea
            value={quote.notes || ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Internal notes or additional comments"
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleNext}>
            Next: Trip Legs
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
