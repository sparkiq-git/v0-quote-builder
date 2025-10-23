import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { MockStoreProvider } from "@/lib/mock/store"

// ✅ Sonner + Realtime
import { Toaster } from "sonner"
import { LeadListener } from "@/components/realtime/lead-listener"
import { getServerUser } from "@/lib/supabase/server" // server-side only

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "AeroIQ",
  description: "Lead Management & Quote Publishing System for Aircraft Charter Brokers",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ SERVER-SAFE Supabase call
  let tenantId: string | null = null

  try {
    const { tenantId: userTenantId } = await getServerUser()
    tenantId = userTenantId
  } catch (err) {
    console.warn("Supabase user fetch failed (likely client render):", err)
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <MockStoreProvider>
          {children}

          {/* ✅ Global Sonner toaster */}
          <Toaster richColors position="top-right" closeButton />

          {/* ✅ Global listener; runs safely client-side only */}
          <LeadListener tenantId={tenantId} />
        </MockStoreProvider>
      </body>
    </html>
  )
}
