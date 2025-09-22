"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useMockStore } from "@/lib/mock/store"

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  quotes: "Quotes",
  aircraft: "Aircraft",
  q: "Public Quote",
}

export function AppBreadcrumb() {
  const pathname = usePathname()
  const { getLeadById, getQuoteById, getQuoteByToken } = useMockStore()

  // Skip breadcrumb on landing page
  if (pathname === "/") return null

  const segments = pathname.split("/").filter(Boolean)

  const breadcrumbItems = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const isLast = index === segments.length - 1

    // Handle dynamic routes
    let label = routeLabels[segment] || segment

    // Special handling for dynamic IDs
    if (index > 0) {
      const parentSegment = segments[index - 1]

      if (parentSegment === "leads" && segment !== "leads") {
        const lead = getLeadById(segment)
        label = lead ? `Lead: ${lead.customer.name}` : `Lead ${segment}`
      } else if (parentSegment === "quotes" && segment !== "quotes") {
        const quote = getQuoteById(segment)
        label = quote ? `Quote: ${quote.customer.name}` : `Quote ${segment}`
      } else if (parentSegment === "q" && segment !== "q") {
        const quote = getQuoteByToken(segment)
        label = quote ? `Quote: ${quote.customer.name}` : `Quote ${segment}`
      }
    }

    return {
      href,
      label,
      isLast,
    }
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <div key={item.href} className="flex items-center">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
