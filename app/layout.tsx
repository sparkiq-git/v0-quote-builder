import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { MockStoreProvider } from "@/lib/mock/store"
import { EnsureResizeObserver } from "@/components/resize-observer-polyfill"

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
  title: "Aero IQ",
  description: "Lead Management & Quote Publishing System for Aircraft Charter Brokers",
  generator: "Aero IQ",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/apple-icon.png",
      },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aero IQ",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Aero IQ",
    title: "Aero IQ",
    description: "Lead Management & Quote Publishing System for Aircraft Charter Brokers",
  },
  twitter: {
    card: "summary",
    title: "Aero IQ",
    description: "Lead Management & Quote Publishing System for Aircraft Charter Brokers",
  },
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
        <EnsureResizeObserver />
        <MockStoreProvider>
          {children}

          {/* ✅ Global Sonner toaster */}
          <Toaster 
            richColors 
            position="top-right" 
            closeButton 
            expand={true}
            visibleToasts={5}
            offset="16px"
            toastOptions={{
              duration: 6000,
              style: {
                background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
              },
              className: 'sonner-toast',
            }}
            style={{
              zIndex: 9999,
            }}
          />
          
          {/* ✅ Custom toast system for useToast hook */}
          <CustomToaster />

          {/* ✅ Global listener; runs safely client-side only */}
          <LeadListener />
        </MockStoreProvider>
      </body>
    </html>
  )
}
