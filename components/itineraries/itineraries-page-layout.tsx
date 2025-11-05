import type React from "react"

export function ItinerariesPageLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col h-full">{children}</div>
}

