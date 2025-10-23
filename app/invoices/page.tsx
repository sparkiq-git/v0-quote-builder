import { InvoiceTable } from "@/app/components/invoices/InvoiceTable"

export default function InvoicesPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
      <p className="text-sm text-muted-foreground">
        View and manage all issued invoices.
      </p>

      <InvoiceTable />
    </div>
  )
}
