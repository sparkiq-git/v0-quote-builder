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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, FileCheck, CreditCard, LinkIcon } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { useToast } from "@/hooks/use-toast"
import type { Quote } from "@/lib/types"

interface AvailabilityCheckDialogProps {
  quote: Quote
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AvailabilityCheckDialog({ quote, open, onOpenChange }: AvailabilityCheckDialogProps) {
  const { dispatch } = useMockStore()
  const { toast } = useToast()

  const [paymentMethod, setPaymentMethod] = useState<"manual" | "link">(
    quote.workflowData?.contractAndPayment?.paymentMethod === "link" ? "link" : "manual",
  )
  const [paymentLinkUrl, setPaymentLinkUrl] = useState(quote.workflowData?.contractAndPayment?.paymentLinkUrl || "")
  const [notes, setNotes] = useState(quote.workflowData?.availabilityCheck?.notes || "")
  const [status, setStatus] = useState<"confirmed" | "unavailable">("confirmed")

  const handleConfirmAvailability = () => {
    if (status === "confirmed" && paymentMethod === "link" && !paymentLinkUrl.trim()) {
      toast({
        title: "Payment link required",
        description: "Please enter a payment link URL.",
        variant: "destructive",
      })
      return
    }

    const updates = {
      status: status === "confirmed" ? ("payment_received" as const) : ("declined" as const),
      workflowData: {
        ...quote.workflowData,
        availabilityCheck: {
          status: status as "confirmed" | "unavailable",
          checkedAt: new Date().toISOString(),
          checkedBy: "Current User",
          notes,
        },
        ...(status === "confirmed" && {
          contractAndPayment: {
            contractSentAt: new Date().toISOString(),
            invoiceSentAt: new Date().toISOString(),
            paymentMethod: paymentMethod,
            ...(paymentMethod === "link" && {
              paymentLinkSentAt: new Date().toISOString(),
              paymentLinkUrl: paymentLinkUrl.trim(),
            }),
          },
        }),
      },
    }

    dispatch({
      type: "UPDATE_QUOTE",
      payload: { id: quote.id, updates },
    })

    toast({
      title: status === "confirmed" ? "Availability confirmed" : "Availability unavailable",
      description:
        status === "confirmed"
          ? "Contract and invoice sent automatically. Ready for data entry."
          : "Resources are not available. The quote has been declined.",
    })

    onOpenChange(false)
  }

  const currentStatus = quote.workflowData?.availabilityCheck?.status

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Availability Confirmation
          </DialogTitle>
          <DialogDescription>
            Confirm availability and select payment method. Contract and invoice will be sent automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 flex-1 min-h-0">
          {/* Quote Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Quote Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Customer:</span> {quote.customer.name}
              </div>
              <div>
                <span className="font-medium">Company:</span> {quote.customer.company}
              </div>
              <div>
                <span className="font-medium">Route:</span> {quote.legs[0]?.origin} →{" "}
                {quote.legs[quote.legs.length - 1]?.destination}
              </div>
              <div>
                <span className="font-medium">Date:</span> {new Date(quote.legs[0]?.departureDate).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Current Status */}
          {currentStatus && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current Status:</span>
              <Badge
                variant={
                  currentStatus === "confirmed"
                    ? "default"
                    : currentStatus === "unavailable"
                      ? "destructive"
                      : "secondary"
                }
              >
                {currentStatus === "confirmed"
                  ? "Confirmed"
                  : currentStatus === "unavailable"
                    ? "Unavailable"
                    : "Pending"}
              </Badge>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-semibold">Payment Method</h4>
            <p className="text-sm text-muted-foreground">
              Select how the customer will provide payment. Contract and invoice will be sent automatically upon
              confirmation.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="manual-payment" className="font-medium cursor-pointer">
                      Manual Payment
                    </Label>
                    <p className="text-sm text-muted-foreground">Payment will be handled manually</p>
                  </div>
                </div>
                <Switch
                  id="manual-payment"
                  checked={paymentMethod === "manual"}
                  onCheckedChange={(checked) => {
                    if (checked) setPaymentMethod("manual")
                  }}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <LinkIcon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <Label htmlFor="payment-link" className="font-medium cursor-pointer">
                        Provide Payment Link
                      </Label>
                      <p className="text-sm text-muted-foreground">Send a payment link to the customer</p>
                    </div>
                  </div>
                  <Switch
                    id="payment-link"
                    checked={paymentMethod === "link"}
                    onCheckedChange={(checked) => {
                      if (checked) setPaymentMethod("link")
                    }}
                  />
                </div>

                {paymentMethod === "link" && (
                  <div className="ml-4 space-y-2">
                    <Label htmlFor="payment-link-url">Payment Link URL</Label>
                    <Input
                      id="payment-link-url"
                      type="url"
                      placeholder="https://payment.example.com/..."
                      value={paymentLinkUrl}
                      onChange={(e) => setPaymentLinkUrl(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Availability Status Selection */}
          <div className="space-y-3">
            <Label className="font-medium">Availability Status</Label>
            <div className="flex gap-3">
              <Button
                variant={status === "confirmed" ? "default" : "outline"}
                onClick={() => setStatus("confirmed")}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Available - Confirm
              </Button>
              <Button
                variant={status === "unavailable" ? "destructive" : "outline"}
                onClick={() => setStatus("unavailable")}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Unavailable - Decline
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="availability-notes">Notes (Optional)</Label>
            <Textarea
              id="availability-notes"
              placeholder="Add any notes about availability, payment arrangements, or special requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmAvailability}>
            {status === "confirmed" ? "Confirm Availability" : "Mark Unavailable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
