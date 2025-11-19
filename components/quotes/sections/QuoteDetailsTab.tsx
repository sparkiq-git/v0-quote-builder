"use client"

import { useState, useEffect, useRef } from "react"
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
import { ContactCombobox } from "@/components/ui/contact-combobox"
import { DateTimePicker } from "@/components/ui/date-time-picker"
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

interface OriginalContactValues {
  name: string | null
  email: string | null
  phone: string | null
  company: string | null
}

export function QuoteDetailsTab({ quote, onUpdate, onNext }: Props) {
  const { toast } = useToast()
  const [showPrompt, setShowPrompt] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const originalContactRef = useRef<OriginalContactValues | null>(null)

  // Store original contact values when component mounts or contact_id changes
  useEffect(() => {
    if (quote.contact_id) {
      originalContactRef.current = {
        name: quote.contact_name || quote.customer?.name || null,
        email: quote.contact_email || quote.customer?.email || null,
        phone: quote.contact_phone || quote.customer?.phone || null,
        company: quote.contact_company || quote.customer?.company || null,
      }
    } else {
      originalContactRef.current = null
    }
  }, [quote.contact_id])

  // Check if contact fields have changed
  const hasContactChanges = (): boolean => {
    if (!quote.contact_id || !originalContactRef.current) return false

    const current = {
      name: quote.contact_name || quote.customer?.name || null,
      email: quote.contact_email || quote.customer?.email || null,
      phone: quote.contact_phone || quote.customer?.phone || null,
      company: quote.contact_company || quote.customer?.company || null,
    }

    const original = originalContactRef.current

    return (
      current.name !== original.name ||
      current.email !== original.email ||
      current.phone !== original.phone ||
      current.company !== original.company
    )
  }

  const handleFieldChange = (field: "email" | "phone" | "company" | "name", value: string) => {
    // Clear previous validation error for this field
    setValidationErrors(prev => {
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
      
      // If validation passes, update the quote (but don't prompt yet)
      onUpdate({
        [`contact_${field}`]: value,
        customer: { ...quote.customer, [field]: value },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = getValidationErrors(error)
        setValidationErrors(prev => ({ ...prev, ...errors }))
        
        toast({
          title: "Validation Error",
          description: Object.values(errors)[0] || "Invalid input",
          variant: "destructive",
        })
      }
    }
  }

  // 🔄 Navigate (save handled by parent)
  const handleNext = async () => {
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

    // Check if there are contact changes and a contact_id exists
    if (quote.contact_id && hasContactChanges()) {
      // Show dialog to ask if user wants to update the contact
      setShowPrompt(true)
      return
    }

    // No changes or no contact_id, proceed to next step
    onNext()
  }

  const handleUpdateContactAndProceed = async () => {
    if (!quote.contact_id || !originalContactRef.current) {
      onNext()
      return
    }

    setSaving(true)
    try {
      const current = {
        name: quote.contact_name || quote.customer?.name || null,
        email: quote.contact_email || quote.customer?.email || null,
        phone: quote.contact_phone || quote.customer?.phone || null,
        company: quote.contact_company || quote.customer?.company || null,
      }

      // Build update object with only changed fields
      const updates: Record<string, string> = {}
      if (current.name !== originalContactRef.current.name) {
        updates.full_name = current.name || ""
      }
      if (current.email !== originalContactRef.current.email) {
        updates.email = current.email || ""
      }
      if (current.phone !== originalContactRef.current.phone) {
        updates.phone = current.phone || ""
      }
      if (current.company !== originalContactRef.current.company) {
        updates.company = current.company || ""
      }

      if (Object.keys(updates).length > 0) {
        await updateContact(quote.contact_id, updates)
        toast({
          title: "Contact updated",
          description: `${quote.contact_name || 'Contact'}'s information was updated in the database.`,
        })
      }

      // Update original values to reflect the saved state
      originalContactRef.current = current
      
      setShowPrompt(false)
      onNext()
    } catch (err: any) {
      toast({
        title: "Failed to update contact",
        description: err.message || "An error occurred while updating the contact.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSkipUpdateAndProceed = () => {
    setShowPrompt(false)
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
            <ContactCombobox
              tenantId={quote.tenant_id}
              value={quote.contact_id || null}
              selectedName={quote.contact_name || quote.customer?.name || null}
              onSelect={(c) => {
                // Update original contact values when a new contact is selected
                originalContactRef.current = {
                  name: c.full_name || null,
                  email: c.email || null,
                  phone: c.phone || null,
                  company: c.company || null,
                }
                
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
              }}
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
                You've made changes to the contact information for <strong>{quote.contact_name || 'this contact'}</strong>.
                <br />
                Would you like to update this information in the contact database as well?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleSkipUpdateAndProceed}
                disabled={saving}
              >
                No, only this quote
              </Button>
              <Button
                onClick={handleUpdateContactAndProceed}
                disabled={saving}
              >
                {saving ? "Updating..." : "Yes, update contact"}
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
