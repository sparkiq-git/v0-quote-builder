"use client"

import { useEffect, useState } from "react"
import { InvoiceStatusBadge } from "./InvoiceStatusBadge"
import { InvoiceActions } from "./InvoiceActions"

export interface Invoice {
  id: string
  number: string
  contact_name: string
  aircraft_label: string
  amount: number
  currency: string
  status: string
  issued_at: string
}

export function InvoiceTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInvoices() {
      try {
        const res = await fetch("/api/invoice")
        const data = await res.json()
        setInvoices(data.invoices || [])
      } catch (err) {
        console.error("❌ Failed to load invoices:", err)
      } finally {
        setLoading(false)
      }
    }
    loadInvoices()
  }, [])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading invoices…</p>
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices yet.</p>
  }

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">Customer</th>
            <th className="text-left px-3 py-2">Aircraft</th>
            <th className="text-left px-3 py-2">Amount</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Issued</th>
            <th className="text-right px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t border-border/20 hover:bg-muted/10">
              <td className="px-3 py-2">{inv.number}</td>
              <td className="px-3 py-2">{inv.contact_name}</td>
              <td className="px-3 py-2">{inv.aircraft_label || "—"}</td>
              <td className="px-3 py-2">
                {inv.amount.toLocaleString("en-US", {
                  style: "currency",
                  currency: inv.currency || "USD",
                })}
              </td>
              <td className="px-3 py-2">
                <InvoiceStatusBadge status={inv.status} />
              </td>
              <td className="px-3 py-2">
                {new Date(inv.issued_at).toLocaleDateString()}
              </td>
              <td className="px-3 py-2 text-right">
                <InvoiceActions invoice={inv} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
