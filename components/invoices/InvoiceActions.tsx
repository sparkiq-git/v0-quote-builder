"use client"

import { Button } from "@/components/ui/button"
import { Eye, Trash2 } from "lucide-react"

export function InvoiceActions({ invoice }: { invoice: any }) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => (window.location.href = `/invoices/${invoice.id}`)}
      >
        <Eye className="h-4 w-4 mr-1" /> View
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => alert(`Delete ${invoice.number}`)}
      >
        <Trash2 className="h-4 w-4 mr-1" />
      </Button>
    </div>
  )
}
