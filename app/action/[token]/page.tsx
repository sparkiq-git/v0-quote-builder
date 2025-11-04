"use client"

import { useState } from "react"
import Turnstile from "react-turnstile"
import { v4 as uuid } from "uuid"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

// Configuration constants
const API_ENDPOINTS = {
  VERIFY: "/api/action-links/verify",
  CONSUME: "/api/action-links/consume",
  QUOTES: "/api/quotes"
} as const

const PublicQuotePage = dynamic(() => import("@/components/quotes/public-quote-page"), { 
  ssr: false,
  loading: () => <div className="text-center py-8">Loading quote...</div>,
  onError: (error) => {
    console.error("Failed to load PublicQuotePage:", error)
  }
})

export default function ActionPage({ params }: { params: { token: string } }) {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState<any | null>(null)
  const [quote, setQuote] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  })
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey) {
    console.error("Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY environment variable")
  }

  // Helper function to get user-friendly error messages
  function getUserFriendlyError(errorMessage: string): { title: string; message: string } {
    const lowerError = errorMessage.toLowerCase()
    
    if (lowerError.includes("link expired") || lowerError.includes("expired")) {
      return {
        title: "Quote Expired",
        message: "This quote link has expired. Please contact us for a new quote or updated pricing."
      }
    }
    
    if (lowerError.includes("email mismatch") || lowerError.includes("email")) {
      return {
        title: "Email Mismatch",
        message: "The email address you entered doesn't match the one this quote was sent to. Please check and try again."
      }
    }
    
    if (lowerError.includes("max uses exceeded") || lowerError.includes("already used")) {
      return {
        title: "Link Already Used",
        message: "This link has already been used. For security reasons, each link can only be used once."
      }
    }
    
    if (lowerError.includes("link not active") || lowerError.includes("not active")) {
      return {
        title: "Link Not Active",
        message: "This link is no longer active. Please contact us for assistance."
      }
    }
    
    if (lowerError.includes("rate limit") || lowerError.includes("too many requests")) {
      return {
        title: "Too Many Attempts",
        message: "You've made too many requests. Please wait a moment and try again."
      }
    }
    
    if (lowerError.includes("captcha") || lowerError.includes("turnstile")) {
      return {
        title: "Verification Failed",
        message: "CAPTCHA verification failed. Please try again."
      }
    }
    
    // Generic error
    return {
      title: "Verification Error",
      message: errorMessage || "An unexpected error occurred. Please try again."
    }
  }

  // --- Safe fetch with proper response handling ---
  async function safeFetchJSON(url: string, options: RequestInit) {
    const res = await fetch(url, options)
    
    let json
    try {
      json = await res.json()
    } catch (jsonErr) {
      // If JSON parsing failed, get text from response
      const text = await res.text()
      console.error(`Non-JSON response from ${url}:`, text)
      throw new Error(text.slice(0, 200))
    }
    
    if (!res.ok || json?.ok === false) {
      console.error(`Request to ${url} failed:`, json)
      const errorMsg = json?.error || `Request failed (${res.status})`
      throw new Error(errorMsg)
    }
    
    return json
  }

  async function handleVerify() {
    setError(null)
    setVerifying(true)
    
    // Client-side validation
    if (!email || !email.includes('@')) {
      setError("Please enter a valid email address")
      setVerifying(false)
      return
    }
    
    if (!captcha) {
      setError("Please complete the CAPTCHA")
      setVerifying(false)
      return
    }
    
    try {
      const json = await safeFetchJSON(API_ENDPOINTS.VERIFY, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          email,
          captchaToken: captcha,
        }),
      })

      setVerified(json.data)
      
      // Fetch the actual quote data
      if (json.data?.metadata?.quote_id) {
        try {
          const quoteRes = await safeFetchJSON(`${API_ENDPOINTS.QUOTES}/${json.data.metadata.quote_id}`, {
            method: "GET",
            headers: { 
              "content-type": "application/json",
              "x-public-quote": "true"
            },
          })
          setQuote(quoteRes)
        } catch (quoteErr) {
          console.error("Failed to fetch quote:", quoteErr)
        }
      }
      
    } catch (e: any) {
      console.error("Verification error:", e)
      setError(e.message)
      
      // Show error dialog with user-friendly message
      const friendlyError = getUserFriendlyError(e.message)
      setErrorDialog({
        open: true,
        title: friendlyError.title,
        message: friendlyError.message,
      })
    } finally {
      setVerifying(false)
    }
  }

  async function handleConsume(result: "accept" | "decline") {
    try {
      // Clone the response to prevent "body already read" error
      const res = await fetch(API_ENDPOINTS.CONSUME, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": uuid(),
        },
        body: JSON.stringify({ 
          token: params.token, 
          email, 
          payload: { result } // Enhanced payload structure
        }),
      })

      // Read response once
      const text = await res.text()
      
      // Try to parse JSON, handle errors gracefully
      let json
      try {
        json = JSON.parse(text)
      } catch (parseErr) {
        console.error("Failed to parse JSON response:", parseErr, "Response text:", text)
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 200)}`)
      }

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || json?.details || `Request failed (${res.status})`)
      }

      // Show success dialog
      setErrorDialog({
        open: true,
        title: result === "accept" ? "Quote Accepted" : "Quote Declined",
        message: "Your response has been securely recorded.",
      })
    } catch (e: any) {
      console.error("Consume error:", e)
      
      // Show error dialog
      const friendlyError = getUserFriendlyError(e.message)
      setErrorDialog({
        open: true,
        title: friendlyError.title,
        message: friendlyError.message,
      })
    }
  }

  // --- UI ---
  if (!verified) {
    return (
      <>
        {/* Error Dialog */}
        <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{errorDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setErrorDialog({ ...errorDialog, open: false })}>
                Close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <Card className="max-w-sm w-full p-6 shadow-lg">
            <CardContent className="space-y-5">
              <div className="text-center">
                <h1 className="text-lg font-semibold">Verify Your Email</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the email this quote was sent to and complete the CAPTCHA to continue.
                </p>
              </div>

              <Input
                id="email-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="flex justify-center pt-2">
                {siteKey ? (
                  <Turnstile sitekey={siteKey} onVerify={(t) => setCaptcha(t)} />
                ) : (
                  <div className="text-sm text-red-500">
                    CAPTCHA not configured. Please contact support.
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                disabled={!email || !captcha || verifying}
                onClick={handleVerify}
                className="w-full font-semibold"
              >
                {verifying ? "Verifying..." : "View Your Quote"}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground">
                This secure link will expire automatically for security.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{errorDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog({ ...errorDialog, open: false })}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PublicQuotePage
        params={{ token: params.token }}
        verifiedEmail={email}
        quote={quote}
        onAccept={undefined}
        onDecline={undefined}
      />
    </>
  )
}
