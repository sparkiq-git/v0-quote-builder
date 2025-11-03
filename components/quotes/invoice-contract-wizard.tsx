"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileSignature,
  Loader2,
  Send,
  User,
  Mail,
  Phone,
  Building2,
  Plane,
  Clock,
  DollarSign,
  Package,
  LinkIcon,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

interface InvoiceContractWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedQuote: any | null
  fullQuoteData: any | null
  loadingQuote: boolean
  onSuccess?: () => void
}

export function InvoiceContractWizard({
  open,
  onOpenChange,
  selectedQuote,
  fullQuoteData,
  loadingQuote,
  onSuccess,
}: InvoiceContractWizardProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [paymentUrl, setPaymentUrl] = useState("")
  const [sending, setSending] = useState(false)

  const handleSendInvoiceContract = useCallback(async () => {
    if (!selectedQuote) return

    try {
      setSending(true)

      // Only run on client side
      if (typeof window === "undefined") return

      // Call the quote-to-invoice Edge Function via API route
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: selectedQuote.id,
          external_payment_url: paymentUrl || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create invoice")

      // Show success message
      toast({
        title: "Invoice & Contract created",
        description: `Invoice ${data.data?.invoice?.number || "created"} successfully.`,
      })

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }

      // Close modal and reset
      onOpenChange(false)
      setStep(1)
      setPaymentUrl("")
    } catch (err: any) {
      console.error("Failed to create invoice & contract:", err)
      toast({
        title: "Failed to create invoice",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }, [selectedQuote, paymentUrl, toast, onSuccess, onOpenChange])

  const handleNext = useCallback(() => {
    if (step === 1) {
      setStep(2)
    }
  }, [step])

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1)
    }
  }, [step])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    // Reset state when closing
    setStep(1)
    setPaymentUrl("")
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[60vw] sm:max-w-[92vw] md:max-w-[60vw] lg:max-w-[60vw] max-h-[95vh] p-5 flex flex-col overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-2xl">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <FileSignature className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {step === 1 ? "Create Invoice & Contract" : "Contract Builder"}
                </DialogTitle>
                <DialogDescription className="text-base mt-1 text-slate-600 dark:text-slate-400">
                  {step === 1
                    ? "Review the quote summary and generate an invoice with contract"
                    : "Build the first page of your contract document"}
                </DialogDescription>
              </div>
            </div>
            {/* Step Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-8 rounded-full transition-colors ${
                  step === 1 ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-300 dark:bg-slate-700"
                }`}
              />
              <div
                className={`h-2 w-8 rounded-full transition-colors ${
                  step === 2 ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-300 dark:bg-slate-700"
                }`}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6 px-1">
          {loadingQuote ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <Loader2 className="animate-spin h-12 w-12 text-slate-600 dark:text-slate-400" />
                <div className="absolute inset-0 blur-xl bg-slate-500/20 animate-pulse" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Loading quote details...</span>
            </div>
          ) : step === 1 ? (
            <InvoiceSummaryStep
              selectedQuote={selectedQuote}
              fullQuoteData={fullQuoteData}
              paymentUrl={paymentUrl}
              onPaymentUrlChange={setPaymentUrl}
            />
          ) : (
            <ContractBuilderStep fullQuoteData={fullQuoteData} selectedQuote={selectedQuote} />
          )}
        </div>

        <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-4 gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose} className="min-w-[100px]">
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={loadingQuote}
                className="min-w-[200px] bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-lg hover:shadow-xl transition-all"
              >
                Next: Contract Builder
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack} className="min-w-[100px]">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSendInvoiceContract}
                disabled={sending || loadingQuote}
                className="min-w-[200px] bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-lg hover:shadow-xl transition-all"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create Invoice & Contract
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Step 1: Invoice Summary
function InvoiceSummaryStep({
  selectedQuote,
  fullQuoteData,
  paymentUrl,
  onPaymentUrlChange,
}: {
  selectedQuote: any | null
  fullQuoteData: any | null
  paymentUrl: string
  onPaymentUrlChange: (url: string) => void
}) {
  if (!selectedQuote || !fullQuoteData) {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
          <FileText className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-muted-foreground font-medium">Failed to load quote details.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Customer Information Card */}
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Customer Information</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <User className="h-4 w-4 text-slate-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Name</span>
                <p className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                  {fullQuoteData.contact_name || selectedQuote.customer.name || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <Mail className="h-4 w-4 text-slate-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Email</span>
                <p className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                  {fullQuoteData.contact_email || selectedQuote.customer.email || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <Phone className="h-4 w-4 text-slate-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Phone</span>
                <p className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                  {fullQuoteData.contact_phone || selectedQuote.customer.phone || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <Building2 className="h-4 w-4 text-slate-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Company</span>
                <p className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                  {fullQuoteData.contact_company || selectedQuote.customer.company || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Aircraft Option Card */}
      {fullQuoteData.options && fullQuoteData.options.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plane className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Selected Aircraft Option</h4>
            </div>
            <div className="space-y-3">
              {fullQuoteData.options.map((option: any, idx: number) => (
                <div
                  key={option.id || idx}
                  className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        Option {idx + 1}
                      </Badge>
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {option.aircraftModel?.name || option.aircraftTail?.tailNumber || "Aircraft Option"}
                      </span>
                    </div>
                    <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                      {formatCurrency(
                        option.price_total ||
                          (option.cost_operator || 0) +
                            (option.price_commission || 0) +
                            (option.price_extras_total || 0) -
                            (option.price_discounts_total || 0) ||
                          0,
                      )}
                    </span>
                  </div>
                  {(option.cost_operator || option.price_commission) && (
                    <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                      {option.cost_operator && (
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>Operator Cost:</span>
                          <span className="font-medium">{formatCurrency(option.cost_operator)}</span>
                        </div>
                      )}
                      {option.price_commission && (
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>Commission:</span>
                          <span className="font-medium">{formatCurrency(option.price_commission)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {option.flight_hours && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{option.flight_hours} flight hours</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Additional Services Card */}
      {fullQuoteData.services && fullQuoteData.services.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Additional Services</h4>
            </div>
            <div className="space-y-2">
              {fullQuoteData.services.map((service: any, idx: number) => (
                <div
                  key={service.id || idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {service.name || service.description || `Service ${idx + 1}`}
                    </span>
                  </div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {formatCurrency((service.amount || service.unit_price || 0) * (service.qty || 1))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Totals Card */}
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 shadow-lg">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Invoice Summary</h4>
          </div>
          <div className="space-y-3">
            {fullQuoteData.options && fullQuoteData.options.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Aircraft Option:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(
                    fullQuoteData.options.reduce(
                      (sum: number, opt: any) =>
                        sum +
                        (opt.price_total ||
                          (opt.cost_operator || 0) +
                            (opt.price_commission || 0) +
                            (opt.price_extras_total || 0) -
                            (opt.price_discounts_total || 0) ||
                          0),
                      0,
                    ),
                  )}
                </span>
              </div>
            )}
            {fullQuoteData.services && fullQuoteData.services.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Additional Services:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(
                    fullQuoteData.services.reduce(
                      (sum: number, s: any) => sum + (s.amount || s.unit_price || 0) * (s.qty || 1),
                      0,
                    ),
                  )}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300 dark:border-slate-700">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Grand Total:</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(
                  (fullQuoteData.options?.reduce(
                    (sum: number, opt: any) =>
                      sum +
                      (opt.price_total ||
                        (opt.cost_operator || 0) +
                          (opt.price_commission || 0) +
                          (opt.price_extras_total || 0) -
                          (opt.price_discounts_total || 0) ||
                        0),
                    0,
                  ) || 0) +
                    (fullQuoteData.services?.reduce(
                      (sum: number, s: any) => sum + (s.amount || s.unit_price || 0) * (s.qty || 1),
                      0,
                    ) || 0),
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment URL Input Card */}
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm">
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <Label htmlFor="payment-url" className="font-semibold text-base text-slate-900 dark:text-slate-100">
              Payment Link (Optional)
            </Label>
          </div>
          <Input
            id="payment-url"
            type="url"
            placeholder="https://payment.example.com/..."
            value={paymentUrl}
            onChange={(e) => onPaymentUrlChange(e.target.value)}
            className="w-full h-11 text-sm"
          />
          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-slate-500" />
            <span>Enter a payment URL that will be included in the invoice for easy customer access.</span>
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800">
            <FileSignature className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Ready to Create Invoice</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Review the summary above and proceed to build the contract document.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 2: Contract Builder
function ContractBuilderStep({
  fullQuoteData,
  selectedQuote,
}: {
  fullQuoteData: any | null
  selectedQuote: any | null
}) {
  if (!fullQuoteData || !selectedQuote) {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
          <FileText className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-muted-foreground font-medium">Failed to load quote details.</p>
      </div>
    )
  }

  // Calculate totals
  const totalAircraftOption =
    fullQuoteData.options?.reduce(
      (sum: number, opt: any) =>
        sum +
        (opt.price_total ||
          (opt.cost_operator || 0) +
            (opt.price_commission || 0) +
            (opt.price_extras_total || 0) -
            (opt.price_discounts_total || 0) ||
          0),
      0,
    ) || 0

  const totalServices =
    fullQuoteData.services?.reduce(
      (sum: number, s: any) => sum + (s.amount || s.unit_price || 0) * (s.qty || 1),
      0,
    ) || 0

  const grandTotal = totalAircraftOption + totalServices

  return (
    <div className="space-y-6">
      {/* Contract Preview Card */}
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg">
        <div className="p-8">
          <div className="border-b-2 border-slate-300 dark:border-slate-700 pb-6 mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Flight Charter Contract</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Contract Number: {selectedQuote.id.slice(0, 8)}</p>
          </div>

          <div className="space-y-6">
            {/* Parties Section */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Parties</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Client</h3>
                  <p className="text-sm text-slate-900 dark:text-slate-100">
                    {fullQuoteData.contact_name || selectedQuote.customer.name || "—"}
                  </p>
                  {fullQuoteData.contact_company && (
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      {fullQuoteData.contact_company || selectedQuote.customer.company}
                    </p>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {fullQuoteData.contact_email || selectedQuote.customer.email || "—"}
                  </p>
                  {fullQuoteData.contact_phone && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {fullQuoteData.contact_phone || selectedQuote.customer.phone || "—"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Charter Provider</h3>
                  <p className="text-sm text-slate-900 dark:text-slate-100">[Your Company Name]</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">[Company Address]</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">[Contact Information]</p>
                </div>
              </div>
            </div>

            {/* Flight Details Section */}
            {fullQuoteData.options && fullQuoteData.options.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Flight Details</h2>
                <div className="space-y-3">
                  {fullQuoteData.options.map((option: any, idx: number) => (
                    <div
                      key={option.id || idx}
                      className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {option.aircraftModel?.name || option.aircraftTail?.tailNumber || "Aircraft Option"}
                          </p>
                          {option.aircraftTail?.tailNumber && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Tail Number: {option.aircraftTail.tailNumber}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(
                            option.price_total ||
                              (option.cost_operator || 0) +
                                (option.price_commission || 0) +
                                (option.price_extras_total || 0) -
                                (option.price_discounts_total || 0) ||
                              0,
                          )}
                        </p>
                      </div>
                      {option.flight_hours && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Flight Hours: {option.flight_hours}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Services */}
            {fullQuoteData.services && fullQuoteData.services.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Additional Services</h2>
                <div className="space-y-2">
                  {fullQuoteData.services.map((service: any, idx: number) => (
                    <div
                      key={service.id || idx}
                      className="flex justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                      <span className="text-sm text-slate-900 dark:text-slate-100">
                        {service.name || service.description || `Service ${idx + 1}`}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency((service.amount || service.unit_price || 0) * (service.qty || 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms & Total */}
            <div className="border-t-2 border-slate-300 dark:border-slate-700 pt-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Total Contract Amount:</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  <strong>Payment Terms:</strong> As specified in the invoice attached to this contract.
                </p>
                <p>
                  <strong>Governing Law:</strong> This contract shall be governed by the laws of [Jurisdiction].
                </p>
                <p>
                  <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="relative overflow-hidden rounded-xl bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 p-5">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-700 dark:text-blue-300 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Contract Preview</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This is a preview of the first page of your contract. The full contract will be generated as a PDF when
              you create the invoice.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

