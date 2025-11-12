"use client"

import { useEffect, useState, type JSX } from "react"
import Turnstile from "react-turnstile"
import { v4 as uuid } from "uuid"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
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
  QUOTES: "/api/quotes",
} as const

interface VerifiedLinkPayload {
  id: string
  action_type: string
  tenant_id: string
  expires_at: string
  metadata: Record<string, any>
}

const PublicQuotePage = dynamic(() => import("@/components/quotes/public-quote-page"), {
  ssr: false,
  loading: () => <div className="text-center py-8">Loading quote...</div>,
})

const PublicItineraryPage = dynamic(() => import("@/components/itineraries/public-itinerary-page"), {
  ssr: false,
  loading: () => <div className="text-center py-8">Loading itinerary...</div>,
})

export default function ActionPage({ params }: { params: { token: string } }) {
  const { toast } = useToast()
  const router = useRouter()
  const [verificationMethod, setVerificationMethod] = useState<"email" | "phone">("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState<VerifiedLinkPayload | null>(null)
  const [quote, setQuote] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  })
  const [siteKey, setSiteKey] = useState<string>("")

  useEffect(() => {
    fetch("/api/turnstile-site-key")
      .then((res) => res.json())
      .then((data) => setSiteKey(data.siteKey || ""))
      .catch((err) => console.error("Failed to fetch Turnstile site key:", err))
  }, [])

  useEffect(() => {
    if (!verified || verified.action_type !== "view_itinerary") return
    const identifier = email || phone
    const target = `/public/itinerary/${params.token}${identifier ? `?${verificationMethod}=${encodeURIComponent(identifier)}` : ""}`
    router.replace(target)
  }, [verified, email, phone, verificationMethod, params.token, router])

  // Helper function to get user-friendly error messages
  function getUserFriendlyError(errorMessage: string): { title: string; message: string } {
    const lowerError = errorMessage.toLowerCase()

    if (lowerError.includes("link expired") || lowerError.includes("expired")) {
      return {
        title: "Secure Link Expired",
        message: "This secure link has expired. Please contact us for an updated itinerary or quote.",
      }
    }

    if (lowerError.includes("email mismatch") || lowerError.includes("email")) {
      return {
        title: "Email Mismatch",
        message:
          "The email address you entered doesn't match the one this link was sent to. Please check and try again.",
      }
    }

    if (lowerError.includes("phone mismatch") || (lowerError.includes("phone") && lowerError.includes("mismatch"))) {
      return {
        title: "Phone Mismatch",
        message:
          "The phone number you entered doesn't match the one this link was sent to. Please check and try again.",
      }
    }

    if (lowerError.includes("max uses exceeded") || lowerError.includes("already used")) {
      return {
        title: "Link Already Used",
        message: "This link has already been used. For security reasons, each link can only be used once.",
      }
    }

    if (lowerError.includes("link not active") || lowerError.includes("not active")) {
      return {
        title: "Link Not Active",
        message: "This link is no longer active. Please contact us for assistance.",
      }
    }

    if (lowerError.includes("rate limit") || lowerError.includes("too many requests")) {
      return {
        title: "Too Many Attempts",
        message: "You've made too many requests. Please wait a moment and try again.",
      }
    }

    if (lowerError.includes("captcha") || lowerError.includes("turnstile")) {
      return {
        title: "Verification Failed",
        message: "CAPTCHA verification failed. Please try again.",
      }
    }

    // Generic error
    return {
      title: "Verification Error",
      message: errorMessage || "An unexpected error occurred. Please try again.",
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
    setQuote(null)
    setVerifying(true)

    // Client-side validation
    if (verificationMethod === "email") {
      if (!email || !email.includes("@")) {
        setError("Please enter a valid email address")
        setVerifying(false)
        return
      }
    } else {
      if (!phone || phone.replace(/\D/g, "").length < 10) {
        setError("Please enter a valid phone number")
        setVerifying(false)
        return
      }
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
          ...(verificationMethod === "email" ? { email } : { phone }),
          captchaToken: captcha,
        }),
      })

      const linkData = json.data as VerifiedLinkPayload | undefined

      if (!linkData?.action_type) {
        throw new Error("Unsupported link type")
      }

      if (!["quote", "view_itinerary"].includes(linkData.action_type)) {
        throw new Error(`Unsupported action type: ${linkData.action_type}`)
      }

      setVerified(linkData)

      if (linkData.action_type === "quote" && linkData.metadata?.quote_id) {
        try {
          const quoteRes = await safeFetchJSON(`${API_ENDPOINTS.QUOTES}/${linkData.metadata.quote_id}`, {
            method: "GET",
            headers: {
              "content-type": "application/json",
              "x-public-quote": "true",
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
          ...(verificationMethod === "email" ? { email } : { phone }),
          payload: { result }, // Enhanced payload structure
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
                <h1 className="text-lg font-semibold">Verify Your Identity</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the {verificationMethod === "email" ? "email" : "phone number"} this secure link was sent to and complete the CAPTCHA to continue.
                </p>
              </div>

              {/* Verification Method Toggle */}
              <div className="flex gap-2 border rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMethod("email")
                    setPhone("")
                    setError(null)
                  }}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    verificationMethod === "email"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMethod("phone")
                    setEmail("")
                    setError(null)
                  }}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    verificationMethod === "phone"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Phone
                </button>
              </div>

              {verificationMethod === "email" ? (
                <Input
                  id="email-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              ) : (
                <Input
                  id="phone-input"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              )}

              <div className="flex justify-center pt-2">
                {siteKey ? (
                  <Turnstile sitekey={siteKey} onVerify={(t) => setCaptcha(t)} />
                ) : (
                  <div className="text-sm text-red-500">CAPTCHA not configured. Please contact support.</div>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                disabled={(!email && !phone) || !captcha || verifying}
                onClick={handleVerify}
                className="w-full font-semibold"
              >
                {verifying ? "Verifying..." : "Continue"}
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

  const actionType = verified.action_type
  let secureContent: JSX.Element

  if (actionType === "quote") {
    secureContent = (
      <PublicQuotePage
        params={{ token: params.token }}
        verifiedEmail={verificationMethod === "email" ? email : undefined}
        quote={quote}
        onAccept={undefined}
        onDecline={undefined}
      />
    )
  } else if (actionType === "view_itinerary") {
    secureContent = <PublicItineraryPage token={params.token} verifiedEmail={verificationMethod === "email" ? email : undefined} />
  } else {
    secureContent = (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-sm w-full p-6 shadow-lg">
          <CardContent className="space-y-4 text-center">
            <h2 className="text-lg font-semibold">Unsupported Link</h2>
            <p className="text-sm text-muted-foreground">
              This secure link type is not yet supported in the public portal. Please contact your AeroIQ representative
              for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
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
            <AlertDialogAction onClick={() => setErrorDialog({ ...errorDialog, open: false })}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {secureContent}
    </>
  )
}
