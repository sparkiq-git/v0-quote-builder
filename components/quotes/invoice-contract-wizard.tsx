"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
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
  Plus,
  Trash2,
  Edit2,
  X,
  Save,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import { ItemCombobox } from "@/components/ui/item-combobox"
import { Switch } from "@/components/ui/switch"

interface InvoiceContractWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedQuote: any | null
  fullQuoteData: any | null
  loadingQuote: boolean
  onSuccess?: () => void
  onQuoteDataUpdate?: (updatedData: any) => void
}

export function InvoiceContractWizard({
  open,
  onOpenChange,
  selectedQuote,
  fullQuoteData,
  loadingQuote,
  onSuccess,
  onQuoteDataUpdate,
}: InvoiceContractWizardProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [paymentUrl, setPaymentUrl] = useState("")
  const [sending, setSending] = useState(false)
  const [editedQuoteData, setEditedQuoteData] = useState<any | null>(null)
  const [taxes, setTaxes] = useState<Array<{ id: string; name: string; amount: number }>>([])
  const [sendToCustomer, setSendToCustomer] = useState(true) // Default to sending to customer
  const [sendToTenant, setSendToTenant] = useState(true) // Default to sending to tenant
  const [includePdf, setIncludePdf] = useState(true) // Default to including PDF

  // Safety check: ensure taxes is always an array
  const safeTaxes = Array.isArray(taxes) ? taxes : []

  // Update edited quote data when fullQuoteData changes
  useEffect(() => {
    if (fullQuoteData && open) {
      try {
        setEditedQuoteData(JSON.parse(JSON.stringify(fullQuoteData)))
      } catch (error) {
        console.error("Error cloning quote data:", error)
        setEditedQuoteData(fullQuoteData)
      }
    }
  }, [fullQuoteData, open])

  const handleNext = useCallback(async () => {
    if (!selectedQuote || step !== 1) return

    try {
      setSending(true)

      // Only run on client side
      if (typeof window === "undefined") return

      // Use edited data if available, otherwise use original
      const dataToUse = editedQuoteData || fullQuoteData

      // Update quote items/services if they were edited
      if (dataToUse?.services && dataToUse.services.length > 0) {
        try {
          const { upsertQuoteItems } = await import("@/lib/supabase/queries/quote-items")
          await upsertQuoteItems(selectedQuote.id, dataToUse.services)
        } catch (err: any) {
          console.warn("Failed to update quote items:", err)
          // Continue anyway - don't block invoice creation
        }
      }

      // Call the quote-to-invoice Edge Function via API route
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: selectedQuote.id,
          external_payment_url: paymentUrl || null,
          taxes: safeTaxes,
          send_email: sendToCustomer || sendToTenant, // Legacy flag for backward compatibility
          send_to_customer: sendToCustomer,
          send_to_tenant: sendToTenant,
          include_pdf: includePdf,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create invoice")

      // Show success message
      const emailSent = sendToCustomer || sendToTenant
      const emailDetails = []
      if (sendToCustomer) emailDetails.push("customer")
      if (sendToTenant) emailDetails.push("tenant")
      const emailText = emailSent ? ` and email sent to ${emailDetails.join(" & ")}` : ""
      const pdfText = includePdf && emailSent ? " with PDF attachment" : ""
      
      toast({
        title: "Invoice created" + (emailSent ? " & email sent" : ""),
        description: `Invoice ${data.data?.invoice?.number || "created"} successfully${emailText}${pdfText}.`,
      })

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }

      // Move to step 2 (contract preview)
      setStep(2)
    } catch (err: any) {
      console.error("Failed to create invoice:", err)
      toast({
        title: "Failed to create invoice",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      })
      // Don't proceed to step 2 if invoice creation failed
    } finally {
      setSending(false)
    }
  }, [selectedQuote, step, paymentUrl, toast, onSuccess, editedQuoteData, fullQuoteData, safeTaxes, sendToCustomer, sendToTenant, includePdf])

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
    setEditedQuoteData(null)
    setTaxes([])
    setSendToCustomer(true)
    setSendToTenant(true)
    setIncludePdf(true)
  }, [onOpenChange])


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[60vw] sm:max-w-[92vw] md:max-w-[60vw] lg:max-w-[60vw] max-h-[95vh] p-5 flex flex-col overflow-hidden bg-background backdrop-blur-xl border shadow-2xl">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted border border-border">
                <FileSignature className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-foreground">
                  {step === 1 ? "Create Invoice & Contract" : "Contract Builder"}
                </DialogTitle>
                <DialogDescription className="text-base mt-1 text-muted-foreground">
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
                  step === 1 ? "bg-primary" : "bg-muted"
                }`}
              />
              <div
                className={`h-2 w-8 rounded-full transition-colors ${
                  step === 2 ? "bg-primary" : "bg-muted"
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
              fullQuoteData={editedQuoteData || fullQuoteData}
              paymentUrl={paymentUrl}
              onPaymentUrlChange={setPaymentUrl}
              onQuoteDataChange={setEditedQuoteData}
              taxes={safeTaxes}
              onTaxesChange={setTaxes}
              sendToCustomer={sendToCustomer}
              onSendToCustomerChange={setSendToCustomer}
              sendToTenant={sendToTenant}
              onSendToTenantChange={setSendToTenant}
              includePdf={includePdf}
              onIncludePdfChange={setIncludePdf}
            />
          ) : (
            <ContractBuilderStep
              fullQuoteData={editedQuoteData || fullQuoteData}
              selectedQuote={selectedQuote}
              taxes={safeTaxes}
            />
          )}
        </div>

        <DialogFooter className="border-t border-border pt-4 gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose} className="min-w-[100px]">
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={sending || loadingQuote}
                className="min-w-[200px] shadow-lg hover:shadow-xl transition-all"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Next: Contract Builder
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack} className="min-w-[100px]">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleClose}
                className="min-w-[200px] shadow-lg hover:shadow-xl transition-all"
              >
                Done
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
  onQuoteDataChange,
  taxes = [],
  onTaxesChange,
  sendToCustomer,
  onSendToCustomerChange,
  sendToTenant,
  onSendToTenantChange,
  includePdf,
  onIncludePdfChange,
}: {
  selectedQuote: any | null
  fullQuoteData: any | null
  paymentUrl: string
  onPaymentUrlChange: (url: string) => void
  onQuoteDataChange: (data: any) => void
  taxes?: Array<{ id: string; name: string; amount: number }>
  onTaxesChange: (taxes: Array<{ id: string; name: string; amount: number }>) => void
  sendToCustomer: boolean
  onSendToCustomerChange: (send: boolean) => void
  sendToTenant: boolean
  onSendToTenantChange: (send: boolean) => void
  includePdf: boolean
  onIncludePdfChange: (include: boolean) => void
}) {
  // Ensure taxes is always an array
  const safeTaxes = Array.isArray(taxes) ? taxes : []
  const [newServiceDescription, setNewServiceDescription] = useState("")
  const [newServiceQty, setNewServiceQty] = useState(1)
  const [newServicePrice, setNewServicePrice] = useState(0)
  const [newServiceItemId, setNewServiceItemId] = useState<string | null>(null)
  
  // Federal Excise Tax state
  const FEDERAL_EXCISE_TAX_ID = "federal-excise-tax-7.5"
  const FEDERAL_EXCISE_TAX_RATE = 0.075 // 7.5%
  const hasFederalExciseTax = safeTaxes.some(tax => tax.id === FEDERAL_EXCISE_TAX_ID)

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

  // Calculate subtotals - only use selected option
  const selectedOptionId = fullQuoteData.selected_option_id || selectedQuote?.selected_option_id
  const selectedOption = fullQuoteData.options?.find((opt: any) => opt.id === selectedOptionId)

  const subtotalAircraft = selectedOption
    ? selectedOption.price_total ||
      (selectedOption.cost_operator || 0) +
        (selectedOption.price_commission || 0) +
        (selectedOption.price_extras_total || 0) -
        (selectedOption.price_discounts_total || 0) ||
      0
    : 0

  const subtotalServices =
    fullQuoteData.services?.reduce(
      (sum: number, s: any) => sum + (s.amount || s.unit_price || 0) * (s.qty || 1),
      0,
    ) || 0

  const subtotal = subtotalAircraft + subtotalServices

  // Calculate Federal Excise Tax amount (7.5% of aircraft total only)
  const federalExciseTaxAmount = subtotalAircraft * FEDERAL_EXCISE_TAX_RATE

  // Calculate tax on taxable service items (7.5% same as Federal Excise Tax)
  const SERVICE_TAX_RATE = 0.075 // 7.5%
  // Use useMemo to calculate taxable services tax based on service data
  const taxableServicesTax = useMemo(() => {
    return (fullQuoteData.services || []).reduce((sum: number, s: any) => {
      if (s.taxable !== false) {
        const serviceTotal = (s.amount || s.unit_price || 0) * (s.qty || 1)
        return sum + (serviceTotal * SERVICE_TAX_RATE)
      }
      return sum
    }, 0)
  }, [fullQuoteData.services])

  // Sync Federal Excise Tax and taxable services tax with taxes array
  useEffect(() => {
    const otherTaxes = safeTaxes.filter(tax => 
      tax.id !== FEDERAL_EXCISE_TAX_ID && 
      !tax.id.startsWith('taxable-service-tax-')
    )
    
    const taxesToAdd: Array<{ id: string; name: string; amount: number }> = []
    
    // Add/update Federal Excise Tax if enabled
    if (hasFederalExciseTax && subtotalAircraft > 0) {
      const existingFederalTax = safeTaxes.find(tax => tax.id === FEDERAL_EXCISE_TAX_ID)
      if (!existingFederalTax || Math.abs(existingFederalTax.amount - federalExciseTaxAmount) > 0.01) {
        taxesToAdd.push({
          id: FEDERAL_EXCISE_TAX_ID,
          name: `Federal Excise Tax (7.5%)`,
          amount: federalExciseTaxAmount,
        })
      } else {
        taxesToAdd.push(existingFederalTax)
      }
    }
    
    // Add/update taxable services tax if there are taxable services
    if (taxableServicesTax > 0) {
      const taxableServicesId = 'taxable-service-tax'
      const existingTaxableTax = safeTaxes.find(tax => tax.id.startsWith('taxable-service-tax-'))
      
      // Calculate which services are taxable for the label
      const taxableServices = (fullQuoteData.services || []).filter((s: any) => s.taxable !== false)
      const taxName = taxableServices.length === 1 
        ? `Tax (7.5%) on ${taxableServices[0].name || taxableServices[0].description || 'Service'}`
        : `Tax (7.5%) on Taxable Services`
      
      if (!existingTaxableTax || Math.abs(existingTaxableTax.amount - taxableServicesTax) > 0.01) {
        taxesToAdd.push({
          id: `${taxableServicesId}-${Date.now()}`,
          name: taxName,
          amount: taxableServicesTax,
        })
      } else {
        taxesToAdd.push(existingTaxableTax)
      }
    }
    
    // Update taxes if anything changed
    const newTaxes = [...taxesToAdd, ...otherTaxes]
    
    // Compare taxes by ID and amount to avoid unnecessary updates
    const taxMap = new Map(safeTaxes.map(t => [t.id, t]))
    const hasChanged = newTaxes.length !== safeTaxes.length ||
      newTaxes.some((tax) => {
        const oldTax = taxMap.get(tax.id)
        return !oldTax || Math.abs(tax.amount - (oldTax.amount || 0)) > 0.01 || tax.name !== oldTax.name
      })
    
    if (hasChanged) {
      onTaxesChange(newTaxes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalAircraft, federalExciseTaxAmount, taxableServicesTax])

  // Calculate total tax amount
  const taxTotal = safeTaxes.reduce((sum, tax) => {
    // Use calculated amount for Federal Excise Tax if it exists
    if (tax.id === FEDERAL_EXCISE_TAX_ID) {
      return sum + federalExciseTaxAmount
    }
    // Use calculated amount for taxable services tax
    if (tax.id.startsWith('taxable-service-tax-')) {
      return sum + taxableServicesTax
    }
    return sum + (tax.amount || 0)
  }, 0)

  const grandTotal = subtotal + taxTotal

  const handleUpdateService = (serviceId: string, field: string, value: any) => {
    if (!fullQuoteData?.services) return

    const updatedServices = fullQuoteData.services.map((s: any) => {
      const matchId = s.id || `temp-${fullQuoteData.services.indexOf(s)}`
      if (matchId === serviceId) {
        const updated = { ...s, [field]: value }
        // If item_id is set, also update name/description from the item
        if (field === "item_id" && value) {
          // This will be handled by the ItemCombobox onSelect callback
        }
        return updated
      }
      return s
    })

    onQuoteDataChange({ ...fullQuoteData, services: updatedServices })
  }

  const handleServiceItemSelect = (serviceId: string, item: any) => {
    if (!fullQuoteData?.services) return

    const updatedServices = fullQuoteData.services.map((s: any) => {
      const matchId = s.id || `temp-${fullQuoteData.services.indexOf(s)}`
      if (matchId === serviceId) {
        return {
          ...s,
          item_id: item.id,
          name: item.name,
          description: item.name || item.description || s.description,
        }
      }
      return s
    })

    onQuoteDataChange({ ...fullQuoteData, services: updatedServices })
  }

  const handleDeleteService = (serviceId: string) => {
    if (!fullQuoteData?.services) return

    const updatedServices = fullQuoteData.services.filter(
      (s: any) => s.id !== serviceId && serviceId !== `new-${fullQuoteData.services.indexOf(s)}`,
    )

    onQuoteDataChange({ ...fullQuoteData, services: updatedServices })
  }

  const handleAddService = () => {
    if (!newServiceDescription.trim() && !newServiceItemId) return

    const newService = {
      id: `temp-${Date.now()}`,
      item_id: newServiceItemId,
      name: newServiceDescription || "",
      description: newServiceDescription || "",
      qty: newServiceQty,
      amount: newServicePrice,
      unit_price: newServicePrice,
      taxable: true,
    }

    const updatedServices = [...(fullQuoteData.services || []), newService]
    onQuoteDataChange({ ...fullQuoteData, services: updatedServices })

    // Reset form
    setNewServiceDescription("")
    setNewServiceQty(1)
    setNewServicePrice(0)
    setNewServiceItemId(null)
  }

  return (
    <div className="space-y-6">
      {/* Customer Information Card */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-muted/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-semibold text-lg text-foreground">Customer Information</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground block mb-1">Name</span>
                <p className="font-medium text-sm truncate text-foreground">
                  {fullQuoteData.contact_name || selectedQuote.customer.name || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground block mb-1">Email</span>
                <p className="font-medium text-sm truncate text-foreground">
                  {fullQuoteData.contact_email || selectedQuote.customer.email || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground block mb-1">Phone</span>
                <p className="font-medium text-sm truncate text-foreground">
                  {fullQuoteData.contact_phone || selectedQuote.customer.phone || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground block mb-1">Company</span>
                <p className="font-medium text-sm truncate text-foreground">
                  {fullQuoteData.contact_company || selectedQuote.customer.company || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Aircraft Option Card - Only show selected option */}
      {(() => {
        const selectedOptionId = fullQuoteData.selected_option_id || selectedQuote?.selected_option_id
        const selectedOption = fullQuoteData.options?.find((opt: any) => opt.id === selectedOptionId)

        if (!selectedOption) {
          return null
        }

        return (
          <div className="relative overflow-hidden rounded-xl border-2 border-border bg-muted/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Plane className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-semibold text-lg text-foreground">Selected Aircraft Option</h4>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      Selected Option
                    </Badge>
                    <span className="font-semibold text-sm text-foreground">
                      {selectedOption.aircraftModel?.name || selectedOption.aircraftTail?.tailNumber || "Aircraft Option"}
                    </span>
                  </div>
                  <span className="font-bold text-lg text-foreground">
                    {formatCurrency(
                      selectedOption.price_total ||
                        (selectedOption.cost_operator || 0) +
                          (selectedOption.price_commission || 0) +
                          (selectedOption.price_extras_total || 0) -
                          (selectedOption.price_discounts_total || 0) ||
                        0,
                    )}
                  </span>
                </div>
                {(selectedOption.cost_operator || selectedOption.price_commission) && (
                  <div className="space-y-1 pt-2 border-t border-border">
                    {selectedOption.cost_operator && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Operator Cost:</span>
                        <span className="font-medium">{formatCurrency(selectedOption.cost_operator)}</span>
                      </div>
                    )}
                    {selectedOption.price_commission && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Commission:</span>
                        <span className="font-medium">{formatCurrency(selectedOption.price_commission)}</span>
                      </div>
                    )}
                  </div>
                )}
                {selectedOption.flight_hours && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{selectedOption.flight_hours} flight hours</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Additional Services Card - Editable (like QuoteServicesTab) */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-muted/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-semibold text-lg text-foreground">Additional Services</h4>
            </div>
          </div>

          {/* Existing Services - Always Editable */}
          <div className="space-y-4 mb-4">
            {fullQuoteData.services && fullQuoteData.services.length > 0 ? (
              fullQuoteData.services.map((service: any, idx: number) => {
                const serviceId = service.id || `temp-${idx}`
                const serviceTotal = (service.amount || service.unit_price || 0) * (service.qty || 1)

                return (
                  <div
                    key={serviceId}
                    className="border rounded-lg p-4 bg-card border-border relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-medium text-sm text-foreground">Service Item</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteService(serviceId)}
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Service Name/Item Combobox */}
                      <div>
                        <Label className="text-sm mb-1 block">Service Name</Label>
                        {fullQuoteData.tenant_id ? (
                          <ItemCombobox
                            tenantId={fullQuoteData.tenant_id}
                            value={service.item_id || null}
                            onSelect={(item) => handleServiceItemSelect(serviceId, item)}
                          />
                        ) : (
                          <Input
                            placeholder="Select or enter service name"
                            value={service.name || service.description || ""}
                            onChange={(e) => {
                              const value = e.target.value
                              handleUpdateService(serviceId, "name", value)
                              handleUpdateService(serviceId, "description", value)
                            }}
                            className="h-9 text-sm"
                          />
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <Label className="text-sm mb-1 block">Description</Label>
                        <Input
                          placeholder="Enter service description"
                          value={service.description || ""}
                          onChange={(e) => handleUpdateService(serviceId, "description", e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <Label className="text-sm mb-1 block">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={service.qty || 1}
                          onChange={(e) =>
                            handleUpdateService(serviceId, "qty", parseInt(e.target.value) || 1)
                          }
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Unit Price */}
                      <div>
                        <Label className="text-sm mb-1 block">Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={service.amount || service.unit_price || 0}
                          onChange={(e) => {
                            const price = parseFloat(e.target.value) || 0
                            handleUpdateService(serviceId, "amount", price)
                            handleUpdateService(serviceId, "unit_price", price)
                          }}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Taxable Toggle & Total */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.taxable !== false}
                          onCheckedChange={(val) => handleUpdateService(serviceId, "taxable", val)}
                        />
                        <Label className="text-sm">Taxable</Label>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Line Total</span>
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(serviceTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No additional services added yet.
              </p>
            )}
          </div>

          {/* Add New Service */}
          <div className="p-4 rounded-lg bg-muted border-2 border-dashed border-border">
            <h5 className="text-sm font-semibold text-foreground mb-3">Add New Service</h5>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm mb-1 block">Service Name</Label>
                {fullQuoteData.tenant_id ? (
                  <ItemCombobox
                    tenantId={fullQuoteData.tenant_id}
                    value={newServiceItemId}
                    onSelect={(item) => {
                      setNewServiceItemId(item.id)
                      setNewServiceDescription(item.name || "")
                    }}
                  />
                ) : (
                  <Input
                    value={newServiceDescription}
                    onChange={(e) => setNewServiceDescription(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Enter service name"
                  />
                )}
              </div>
              <div>
                <Label className="text-sm mb-1 block">Description</Label>
                <Input
                  value={newServiceDescription}
                  onChange={(e) => setNewServiceDescription(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Service description"
                />
              </div>
              <div>
                <Label className="text-sm mb-1 block">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newServiceQty}
                  onChange={(e) => setNewServiceQty(parseInt(e.target.value) || 1)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm mb-1 block">Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleAddService}
              disabled={!newServiceDescription.trim() && !newServiceItemId}
              className="mt-3 w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </div>
      </div>

      {/* Totals Card - Editable with Tax */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-muted/50 shadow-lg">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-semibold text-lg text-foreground">Invoice Summary</h4>
          </div>
          <div className="space-y-3">
            {selectedOption && subtotalAircraft > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aircraft Option:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(subtotalAircraft)}
                </span>
              </div>
            )}
            {subtotalServices > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Additional Services:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(subtotalServices)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
            </div>

            {/* Taxes & Fees Section (like QuoteOptionsTab) */}
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-sm font-medium text-foreground">Taxes & Fees</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add applicable taxes and fees for this invoice.
                  </p>
                </div>
              </div>

              {/* Federal Excise Tax Quick Toggle */}
              {selectedOption && subtotalAircraft > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="federal-excise-tax" className="font-medium text-sm text-foreground cursor-pointer">
                          Federal Excise Tax (7.5%)
                        </Label>
                        <span className="text-xs text-muted-foreground">(on aircraft only)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Automatically calculated at 7.5% of aircraft total: {formatCurrency(subtotalAircraft)}
                      </p>
                      {hasFederalExciseTax && (
                        <p className="text-xs font-medium text-foreground mt-1">
                          Tax Amount: {formatCurrency(federalExciseTaxAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Switch
                    id="federal-excise-tax"
                    checked={hasFederalExciseTax}
                    onCheckedChange={(checked) => {
                      const otherTaxes = safeTaxes.filter(tax => tax.id !== FEDERAL_EXCISE_TAX_ID)
                      if (checked && subtotalAircraft > 0) {
                        const federalTax = {
                          id: FEDERAL_EXCISE_TAX_ID,
                          name: `Federal Excise Tax (7.5%)`,
                          amount: federalExciseTaxAmount,
                        }
                        onTaxesChange([federalTax, ...otherTaxes])
                      } else {
                        onTaxesChange(otherTaxes)
                      }
                    }}
                  />
                </div>
              )}

              {/* Manual Taxes & Fees */}
              {safeTaxes.filter(tax => tax.id !== FEDERAL_EXCISE_TAX_ID && !tax.id.startsWith('taxable-service-tax-')).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">Other Taxes & Fees</Label>
                  {safeTaxes
                    .filter(tax => tax.id !== FEDERAL_EXCISE_TAX_ID && !tax.id.startsWith('taxable-service-tax-'))
                    .map((tax) => (
                      <div
                        key={tax.id}
                        className="flex items-center gap-3 p-2 bg-muted rounded-lg border border-border"
                      >
                        <Input
                          value={tax.name}
                          onChange={(e) => {
                            const federalTax = safeTaxes.find(t => t.id === FEDERAL_EXCISE_TAX_ID)
                            const otherTaxes = safeTaxes.filter(t => t.id !== FEDERAL_EXCISE_TAX_ID)
                            const updated = otherTaxes.map((t) => (t.id === tax.id ? { ...t, name: e.target.value } : t))
                            onTaxesChange(federalTax ? [federalTax, ...updated] : updated)
                          }}
                          placeholder="Tax/Fee Name"
                          className="flex-1 h-9 text-sm"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={tax.amount ?? 0}
                          onChange={(e) => {
                            const federalTax = safeTaxes.find(t => t.id === FEDERAL_EXCISE_TAX_ID)
                            const otherTaxes = safeTaxes.filter(t => t.id !== FEDERAL_EXCISE_TAX_ID)
                            const updated = otherTaxes.map((t) =>
                              t.id === tax.id ? { ...t, amount: parseFloat(e.target.value) || 0 } : t,
                            )
                            onTaxesChange(federalTax ? [federalTax, ...updated] : updated)
                          }}
                          className="w-32 h-9 text-sm text-right"
                          placeholder="Amount"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const federalTax = safeTaxes.find(t => t.id === FEDERAL_EXCISE_TAX_ID)
                            const updated = safeTaxes.filter((t) => t.id !== tax.id)
                            onTaxesChange(updated)
                          }}
                          className="h-9 w-9 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newTax = {
                    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `temp-${Date.now()}-${Math.random()}`,
                    name: "Custom Tax",
                    amount: 0,
                  }
                  onTaxesChange([...safeTaxes, newTax])
                }}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Custom Tax/Fee
              </Button>

              {safeTaxes.length > 0 && (
                <>
                  {safeTaxes
                    .filter(tax => tax.id === FEDERAL_EXCISE_TAX_ID)
                    .map((tax) => (
                      <div key={tax.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {tax.name} <span className="text-xs">(auto)</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(federalExciseTaxAmount)}
                        </span>
                      </div>
                    ))}
                  {safeTaxes
                    .filter(tax => tax.id.startsWith('taxable-service-tax-'))
                    .map((tax) => (
                      <div key={tax.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {tax.name} <span className="text-xs">(auto)</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(taxableServicesTax)}
                        </span>
                      </div>
                    ))}
                  {safeTaxes
                    .filter(tax => tax.id !== FEDERAL_EXCISE_TAX_ID && !tax.id.startsWith('taxable-service-tax-'))
                    .map((tax) => (
                      <div key={tax.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{tax.name}</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(tax.amount || 0)}
                        </span>
                      </div>
                    ))}
                  {taxTotal > 0 && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                      <span className="text-muted-foreground font-medium">Total Taxes & Fees:</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(taxTotal)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-border">
              <span className="text-lg font-bold text-foreground">Grand Total:</span>
              <span className="text-2xl font-bold text-foreground">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment URL Input Card */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-muted/50 shadow-sm">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
            <Label htmlFor="payment-url" className="font-semibold text-base text-foreground">
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
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
            <span>Enter a payment URL that will be included in the invoice for easy customer access.</span>
          </p>

          {/* Email Options */}
          <div className="pt-3 border-t border-border space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <Label className="font-semibold text-base text-foreground">
                Email Options
              </Label>
            </div>
            
            {/* Send to Customer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="send-to-customer" className="font-medium text-sm text-foreground">
                    Send to Customer
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Send invoice email to customer
                  </p>
                </div>
              </div>
              <Switch
                id="send-to-customer"
                checked={sendToCustomer}
                onCheckedChange={onSendToCustomerChange}
              />
            </div>

            {/* Send to Tenant */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="send-to-tenant" className="font-medium text-sm text-foreground">
                    Send to Tenant
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Send invoice copy to tenant emails
                  </p>
                </div>
              </div>
              <Switch
                id="send-to-tenant"
                checked={sendToTenant}
                onCheckedChange={onSendToTenantChange}
              />
            </div>

            {/* Include PDF */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="include-pdf" className="font-medium text-sm text-foreground">
                    Include PDF Attachment
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Attach PDF invoice to email
                  </p>
                </div>
              </div>
              <Switch
                id="include-pdf"
                checked={includePdf}
                onCheckedChange={onIncludePdfChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="relative overflow-hidden rounded-xl bg-muted border-2 border-border p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted border border-border">
            <FileSignature className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">Ready to Create Invoice</p>
            <p className="text-xs text-muted-foreground">
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
  taxes = [],
}: {
  fullQuoteData: any | null
  selectedQuote: any | null
  taxes?: Array<{ id: string; name: string; amount: number }>
}) {
  // Ensure taxes is always an array
  const safeTaxes = Array.isArray(taxes) ? taxes : []
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

  // Calculate totals - only use selected option
  const selectedOptionId = fullQuoteData.selected_option_id || selectedQuote?.selected_option_id
  const selectedOption = fullQuoteData.options?.find((opt: any) => opt.id === selectedOptionId)

  const totalAircraftOption = selectedOption
    ? selectedOption.price_total ||
      (selectedOption.cost_operator || 0) +
        (selectedOption.price_commission || 0) +
        (selectedOption.price_extras_total || 0) -
        (selectedOption.price_discounts_total || 0) ||
      0
    : 0

  const totalServices =
    fullQuoteData.services?.reduce(
      (sum: number, s: any) => sum + (s.amount || s.unit_price || 0) * (s.qty || 1),
      0,
    ) || 0

  const subtotal = totalAircraftOption + totalServices
  const taxTotal = safeTaxes.reduce((sum, tax) => sum + (tax.amount || 0), 0)
  const grandTotal = subtotal + taxTotal

  return (
    <div className="space-y-6">
      {/* Contract Preview Card */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-card shadow-lg">
        <div className="p-8">
          <div className="border-b-2 border-border pb-6 mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Flight Charter Contract</h1>
            <p className="text-sm text-muted-foreground">Contract Number: {selectedQuote.id.slice(0, 8)}</p>
          </div>

          <div className="space-y-6">
            {/* Parties Section */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Parties</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Client</h3>
                  <p className="text-sm text-foreground">
                    {fullQuoteData.contact_name || selectedQuote.customer.name || "—"}
                  </p>
                  {fullQuoteData.contact_company && (
                    <p className="text-sm text-foreground">
                      {fullQuoteData.contact_company || selectedQuote.customer.company}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {fullQuoteData.contact_email || selectedQuote.customer.email || "—"}
                  </p>
                  {fullQuoteData.contact_phone && (
                    <p className="text-sm text-muted-foreground">
                      {fullQuoteData.contact_phone || selectedQuote.customer.phone || "—"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Charter Provider</h3>
                  <p className="text-sm text-foreground">[Your Company Name]</p>
                  <p className="text-sm text-muted-foreground">[Company Address]</p>
                  <p className="text-sm text-muted-foreground">[Contact Information]</p>
                </div>
              </div>
            </div>

            {/* Flight Details Section */}
            {fullQuoteData.options && fullQuoteData.options.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Flight Details</h2>
                <div className="space-y-3">
                  {fullQuoteData.options.map((option: any, idx: number) => (
                    <div
                      key={option.id || idx}
                      className="p-4 border border-border rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {option.aircraftModel?.name || option.aircraftTail?.tailNumber || "Aircraft Option"}
                          </p>
                          {option.aircraftTail?.tailNumber && (
                            <p className="text-sm text-muted-foreground">
                              Tail Number: {option.aircraftTail.tailNumber}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold text-foreground">
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
                        <p className="text-sm text-muted-foreground">
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
                <h2 className="text-xl font-semibold text-foreground mb-4">Additional Services</h2>
                <div className="space-y-2">
                  {fullQuoteData.services.map((service: any, idx: number) => (
                    <div
                      key={service.id || idx}
                      className="flex justify-between p-3 border border-border rounded-lg"
                    >
                      <span className="text-sm text-foreground">
                        {service.name || service.description || `Service ${idx + 1}`}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency((service.amount || service.unit_price || 0) * (service.qty || 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms & Total */}
            <div className="border-t-2 border-border pt-6 mt-6">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {safeTaxes.length > 0 && (
                  <>
                    {safeTaxes.map((tax) => (
                      <div key={tax.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{tax.name}:</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(tax.amount || 0)}
                        </span>
                      </div>
                    ))}
                    {taxTotal > 0 && (
                      <div className="flex justify-between text-sm pt-1 border-t border-border">
                        <span className="text-muted-foreground font-medium">Total Taxes & Fees:</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(taxTotal)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-between items-center mb-4 pt-2 border-t border-border">
                <span className="text-lg font-semibold text-foreground">Total Contract Amount:</span>
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
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
      <div className="relative overflow-hidden rounded-xl bg-muted border-2 border-border p-5">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">Contract Preview</p>
            <p className="text-xs text-muted-foreground">
              This is a preview of the first page of your contract. The full contract will be generated as a PDF when
              you create the invoice.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
