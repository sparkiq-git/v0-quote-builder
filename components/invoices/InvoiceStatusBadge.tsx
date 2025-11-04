import { cn } from "@/lib/utils"

export function InvoiceStatusBadge({ status }: { status: string }) {
  const color =
    status === "paid"
      ? "bg-green-100 text-green-800"
      : status === "issued"
      ? "bg-blue-100 text-blue-800"
      : status === "draft"
      ? "bg-gray-100 text-gray-800"
      : status === "void"
      ? "bg-red-100 text-red-800"
      : "bg-muted text-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 text-xs font-medium rounded-md",
        color
      )}
    >
      {status}
    </span>
  )
}
