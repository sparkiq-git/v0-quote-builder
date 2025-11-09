import type React from "react"

export function PassengersPageLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col h-full">{children}</div>
}
