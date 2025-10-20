"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ContactCombobox } from "@/components/ui/contact-combobox"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { ChevronRight } from "lucide-react"
import { useState } from "react"
import { updateContact } from "@/lib/supabase/queries/contacts"
import { useToast } from "@/hooks/use-toast"
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

  const handleFieldChange = (field: "email" | "phone" | "company", value: string) => {
    onUpdate({
      [`contact_${field}`]: value,
      customer: { ...quote.customer, [field]: value },
    })

    if (quote.contact_id) {
      setPendingEdit({ field, value })
      setShowPrompt(true)
    }
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
            />
          </div>

          <div className="grid gap-2">
            <Label>Phone *</Label>
            <Input
              value={quote.contact_phone || quote.customer?.phone || ""}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              placeholder="Phone number"
            />
          </div>

          <div className="grid gap-2">
            <Label>Company</Label>
            <Input
              value={quote.contact_company || quote.customer?.company || ""}
              onChange={(e) => handleFieldChange("company", e.target.value)}
              placeholder="Company"
            />
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

        {/* Expiration */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Valid Until *</Label>
            <DateTimePicker
              date={quote.valid_until || ""}
              onDateChange={(d) =>
                onUpdate({ valid_until: d instanceof Date ? d.toISOString() : d })
              }
              showOnlyDate
            />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              value={quote.notes || ""}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="Internal notes or additional comments"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onNext}>
            Next: Trip Legs
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
