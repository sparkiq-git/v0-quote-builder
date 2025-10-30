import type React from "react"
import { AppLayout } from "@/components/app-layout"

export default function PassengersLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
