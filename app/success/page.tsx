"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Phone, Mail, Clock, ArrowRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export default function SuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customerName, setCustomerName] = useState("")
  const [quoteId, setQuoteId] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get customer name and quote ID from URL params
    const name = searchParams.get("name") || "Valued Customer"
    const id = searchParams.get("quoteId") || ""
    setCustomerName(name)
    setQuoteId(id)
    
    // Simulate loading for better UX
    setTimeout(() => setIsLoading(false), 1000)
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 animate-pulse">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-600">Processing your request...</p>
        </div>
      </div>
    )
  }

  const handleContactUs = () => {
    // You can implement contact functionality here
    window.open("mailto:support@aeroiq.com?subject=Quote Inquiry", "_blank")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Success Animation */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 animate-slide-up">
            Request Submitted Successfully!
          </h1>
          <p className="text-xl text-gray-600 font-light animate-slide-up-delayed">
            Thank you, {customerName}
          </p>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Success Message */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Your Aircraft Request is Being Processed
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  We've received your aircraft selection and are now checking availability with our network of operators. 
                  Our team will contact you shortly with confirmation and next steps.
                </p>
              </div>

              {/* Timeline */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">What Happens Next?</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">Request submitted and received</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-700">Checking aircraft availability (1-2 hours)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Phone className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-gray-700">Our team will contact you with confirmation</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-blue-50 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Need Immediate Assistance?</h3>
                <p className="text-gray-600">
                  Our team is standing by to help with any questions about your request.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleContactUs}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Email Support
                  </Button>
                  <Button
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Call Us
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  <p>📧 support@aeroiq.com</p>
                  <p>📞 +1 (555) 123-4567</p>
                </div>
              </div>

              {/* Quote Reference */}
              {quoteId && (
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Reference ID:</span> {quoteId}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Please keep this reference for your records
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-semibold"
                >
                  Return Home
                </Button>
                <Button
                  onClick={() => router.push("/quotes")}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                >
                  View All Quotes
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/images/aero-iq-logo.png" alt="Aero IQ" className="h-6 w-auto" />
            <span className="text-gray-600 font-semibold">Aero IQ</span>
          </div>
          <p className="text-sm text-gray-500">
            Premium Private Aviation Solutions
          </p>
        </div>
      </div>
    </div>
  )
}
