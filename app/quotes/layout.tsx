import type React from "react"
import { AppLayout } from "@/components/app-layout"

export default function QuotesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
