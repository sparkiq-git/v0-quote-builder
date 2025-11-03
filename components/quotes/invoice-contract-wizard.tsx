"use client"

import { useState, useCallback, useEffect } from "react"
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

  // Update edited quote data when fullQuoteData changes
  useEffect(() => {
    if (fullQuoteData && open) {
      setEditedQuoteData(JSON.parse(JSON.stringify(fullQuoteData)))
    }
  }, [fullQuoteData, open])

  const handleSendInvoiceContract = useCallback(async () => {
    if (!selectedQuote) return

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
          taxes: taxes || [],
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
      setEditedQuoteData(null)
      setTaxes([])
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
  }, [selectedQuote, paymentUrl, toast, onSuccess, onOpenChange, editedQuoteData, fullQuoteData, taxes])

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
      setEditedQuoteData(null)
      setTaxes([])
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
              fullQuoteData={editedQuoteData || fullQuoteData}
              paymentUrl={paymentUrl}
              onPaymentUrlChange={setPaymentUrl}
              onQuoteDataChange={setEditedQuoteData}
              taxes={taxes}
              onTaxesChange={setTaxes}
            />
          ) : (
            <ContractBuilderStep
              fullQuoteData={editedQuoteData || fullQuoteData}
              selectedQuote={selectedQuote}
              taxes={taxes}
            />
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
  onQuoteDataChange,
  taxRate,
  onTaxRateChange,
  taxAmount,
  onTaxAmountChange,
}: {
  selectedQuote: any | null
  fullQuoteData: any | null
  paymentUrl: string
  onPaymentUrlChange: (url: string) => void
  onQuoteDataChange: (data: any) => void
  taxes: Array<{ id: string; name: string; amount: number }>
  onTaxesChange: (taxes: Array<{ id: string; name: string; amount: number }>) => void
}) {
  const [newServiceDescription, setNewServiceDescription] = useState("")
  const [newServiceQty, setNewServiceQty] = useState(1)
  const [newServicePrice, setNewServicePrice] = useState(0)
  const [newServiceItemId, setNewServiceItemId] = useState<string | null>(null)

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

  // Calculate total tax amount
  const taxTotal = taxes.reduce((sum, tax) => sum + (tax.amount || 0), 0)

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

      {/* Selected Aircraft Option Card - Only show selected option */}
      {(() => {
        const selectedOptionId = fullQuoteData.selected_option_id || selectedQuote?.selected_option_id
        const selectedOption = fullQuoteData.options?.find((opt: any) => opt.id === selectedOptionId)

        if (!selectedOption) {
          return null
        }

        return (
          <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Plane className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Selected Aircraft Option</h4>
              </div>
              <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      Selected Option
                    </Badge>
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {selectedOption.aircraftModel?.name || selectedOption.aircraftTail?.tailNumber || "Aircraft Option"}
                    </span>
                  </div>
                  <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
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
                  <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {selectedOption.cost_operator && (
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>Operator Cost:</span>
                        <span className="font-medium">{formatCurrency(selectedOption.cost_operator)}</span>
                      </div>
                    )}
                    {selectedOption.price_commission && (
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>Commission:</span>
                        <span className="font-medium">{formatCurrency(selectedOption.price_commission)}</span>
                      </div>
                    )}
                  </div>
                )}
                {selectedOption.flight_hours && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
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
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Additional Services</h4>
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
                    className="border rounded-lg p-4 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100">Service Item</div>
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
                        <Label className="text-sm mb-1 block text-slate-700 dark:text-slate-300">Service Name</Label>
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
                        <Label className="text-sm mb-1 block text-slate-700 dark:text-slate-300">Description</Label>
                        <Input
                          placeholder="Enter service description"
                          value={service.description || ""}
                          onChange={(e) => handleUpdateService(serviceId, "description", e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <Label className="text-sm mb-1 block text-slate-700 dark:text-slate-300">Quantity</Label>
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
                        <Label className="text-sm mb-1 block text-slate-700 dark:text-slate-300">Unit Price</Label>
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
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.taxable !== false}
                          onCheckedChange={(val) => handleUpdateService(serviceId, "taxable", val)}
                        />
                        <Label className="text-sm text-slate-700 dark:text-slate-300">Taxable</Label>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-600 dark:text-slate-400 block">Line Total</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(serviceTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No additional services added yet.
              </p>
            )}
          </div>

          {/* Add New Service */}
          <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700">
            <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Add New Service</h5>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm mb-1 block text-slate-700 dark:text-slate-300">Service Name</Label>
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
                <Label className="text-sm mb-1 block text-slate-700 dark:text-slate-300">Description</Label>
                <Input
                  value={newServiceDescription}
                  onChange={(e) => setNewServiceDescription(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Service description"
                />
              </div>
              <div>
                <Label className="text-sm mb-1 block text-slate-700 dark:text-slate-300">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newServiceQty}
                  onChange={(e) => setNewServiceQty(parseInt(e.target.value) || 1)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm mb-1 block text-slate-700 dark:text-slate-300">Unit Price</Label>
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
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 shadow-lg">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Invoice Summary</h4>
          </div>
          <div className="space-y-3">
            {selectedOption && subtotalAircraft > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Aircraft Option:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(subtotalAircraft)}
                </span>
              </div>
            )}
            {subtotalServices > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Additional Services:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(subtotalServices)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-300 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
            </div>

            {/* Taxes & Fees Section (like QuoteOptionsTab) */}
            <div className="pt-3 border-t border-slate-300 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">Taxes & Fees</Label>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Add applicable taxes and fees for this invoice.
                  </p>
                </div>
              </div>

              {taxes.length > 0 && (
                <div className="space-y-2">
                  {taxes.map((tax) => (
                    <div
                      key={tax.id}
                      className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
                    >
                      <Input
                        value={tax.name}
                        onChange={(e) => {
                          const updated = taxes.map((t) => (t.id === tax.id ? { ...t, name: e.target.value } : t))
                          onTaxesChange(updated)
                        }}
                        placeholder="Tax/Fee Name"
                        className="flex-1 h-9 text-sm"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={tax.amount ?? 0}
                        onChange={(e) => {
                          const updated = taxes.map((t) =>
                            t.id === tax.id ? { ...t, amount: parseFloat(e.target.value) || 0 } : t,
                          )
                          onTaxesChange(updated)
                        }}
                        className="w-32 h-9 text-sm text-right"
                        placeholder="Amount"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = taxes.filter((t) => t.id !== tax.id)
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
                  const newTax = { id: crypto.randomUUID(), name: "Custom Tax", amount: 0 }
                  onTaxesChange([...taxes, newTax])
                }}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Tax/Fee
              </Button>

              {taxTotal > 0 && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-300 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Total Taxes & Fees:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(taxTotal)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300 dark:border-slate-700">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Grand Total:</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(grandTotal)}</span>
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
  taxes,
}: {
  fullQuoteData: any | null
  selectedQuote: any | null
  taxes: Array<{ id: string; name: string; amount: number }>
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
  const taxTotal = taxes.reduce((sum, tax) => sum + (tax.amount || 0), 0)
  const grandTotal = subtotal + taxTotal

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
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {taxes.length > 0 && (
                  <>
                    {taxes.map((tax) => (
                      <div key={tax.id} className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{tax.name}:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(tax.amount || 0)}
                        </span>
                      </div>
                    ))}
                    {taxTotal > 0 && (
                      <div className="flex justify-between text-sm pt-1 border-t border-slate-300 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Total Taxes & Fees:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(taxTotal)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-between items-center mb-4 pt-2 border-t border-slate-300 dark:border-slate-700">
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
