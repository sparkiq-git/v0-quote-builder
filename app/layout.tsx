import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { MockStoreProvider } from "@/lib/mock/store"

// ✅ Sonner + Realtime
import { Toaster } from "sonner"
import { Toaster as CustomToaster } from "@/components/ui/toaster"
import { LeadListener } from "@/components/realtime/lead-listener"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
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
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <MockStoreProvider>
          {children}

          {/* ✅ Global Sonner toaster */}
          <Toaster richColors position="top-right" closeButton />
          
          {/* ✅ Custom toast system for useToast hook */}
          <CustomToaster />

          {/* ✅ Global listener; runs safely client-side only */}
          <LeadListener />
        </MockStoreProvider>
      </body>
    </html>
  )
}
