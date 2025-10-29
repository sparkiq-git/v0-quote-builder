"use client"

import { useEffect, useState } from "react"

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export default function SuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customerName, setCustomerName] = useState("")
  const [quoteId, setQuoteId] = useState("")
  const [tenantLogo, setTenantLogo] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get customer name, quote ID, and tenant logo from URL params
    const name = searchParams.get("name") || "Valued Customer"
    const id = searchParams.get("quoteId") || ""
    const logo = searchParams.get("logo") || "/images/aero-iq-logo.png"
    setCustomerName(name)
    setQuoteId(id)
    setTenantLogo(logo)
    
    // Simulate loading for better UX
    setTimeout(() => setIsLoading(false), 1000)
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4 animate-pulse">
            <CheckCircle className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-600">Processing your request...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Success Animation */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6 animate-bounce">
            <CheckCircle className="w-10 h-10 text-gray-700" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 animate-slide-up">
            Request Submitted Successfully!
          </h1>
          <p className="text-lg text-gray-600 font-light animate-slide-up-delayed">
            Thank you, {customerName}
          </p>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Success Message */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Aircraft Request is Being Processed
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  We've received your aircraft selection and are now checking availability. 
                  Our team will contact you shortly with confirmation and next steps.
                </p>
              </div>

              {/* Quote Reference */}
              {quoteId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Reference ID:</span> {quoteId}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Please keep this reference for your records
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4">
                <Button
                  onClick={() => router.push("/")}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  Return Home
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-gray-500 text-sm">Powered by</span>
            <img src={tenantLogo} alt="Tenant Logo" className="h-5 w-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
