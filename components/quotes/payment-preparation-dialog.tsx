"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CreditCard, Link, Send } from "lucide-react"
import type { Quote } from "@/lib/types"
import { useMockStore } from "@/lib/mock/store"

interface PaymentPreparationDialogProps {
  quote: Quote
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentPreparationDialog({ quote, open, onOpenChange }: PaymentPreparationDialogProps) {
  const { dispatch } = useMockStore()
  const [paymentMethod, setPaymentMethod] = useState<"payment_link" | "manual">("payment_link")
  const [paymentLink, setPaymentLink] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // Update quote with payment method and transition to pending_payment
      const updates: Partial<Quote> = {
        status: "pending_payment",
        workflowData: {
          ...quote.workflowData,
          contractAndPayment: {
            ...quote.workflowData?.contractAndPayment,
            contractSentAt: new Date().toISOString(),
            paymentMethod,
            ...(paymentMethod === "payment_link" &&
              paymentLink && {
                paymentLinkSent: paymentLink,
              }),
          },
        },
      }

      dispatch({
        type: "UPDATE_QUOTE",
        payload: { id: quote.id, updates },
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Failed to prepare payment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = paymentMethod === "manual" || (paymentMethod === "payment_link" && paymentLink.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Prepare Payment
          </DialogTitle>
          <DialogDescription>
            Contract and invoice will be automatically sent. Choose how payment will be handled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Information */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Customer</Label>
              <p className="font-medium">{quote.customer.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Company</Label>
              <p className="font-medium">{quote.customer.company || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Route</Label>
              <p className="font-medium">
                {quote.legs[0]?.origin} → {quote.legs[quote.legs.length - 1]?.destination}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Date</Label>
              <p className="font-medium">{new Date(quote.legs[0]?.departureDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as "payment_link" | "manual")}
            >
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <RadioGroupItem value="payment_link" id="payment_link" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="payment_link" className="flex items-center gap-2 font-medium cursor-pointer">
                    <Link className="h-4 w-4" />
                    Send Payment Link
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Provide a payment link that will be sent to the customer
                  </p>
                  {paymentMethod === "payment_link" && (
                    <div className="mt-3">
                      <Input
                        placeholder="https://payment-provider.com/invoice/..."
                        value={paymentLink}
                        onChange={(e) => setPaymentLink(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <RadioGroupItem value="manual" id="manual" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="manual" className="flex items-center gap-2 font-medium cursor-pointer">
                    <CreditCard className="h-4 w-4" />
                    Manual Payment
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Payment will be handled manually (wire transfer, check, etc.)
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special payment instructions or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Processing..." : "Send Contract & Setup Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
