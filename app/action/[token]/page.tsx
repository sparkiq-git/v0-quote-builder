"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Turnstile from "react-turnstile"
import { v4 as uuid } from "uuid"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import dynamic from "next/dynamic"

// lazy-load your heavy quote UI to avoid hydration issues
const PublicQuoteUI = dynamic(() => import("@/app/quotes/public-quote-page"), { ssr: false })

export default function SecureQuotePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const { toast } = useToast()

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!

  const [email, setEmail] = useState("")
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState<any | null>(null)
  const [consuming, setConsuming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔹 Step 1: Verify email + token (rate-limited, with CAPTCHA)
  async function handleVerify() {
    setError(null)
    try {
      setVerifying(true)
      const res = await fetch("/api/action-links/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          email,
          captchaToken: captcha,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Verification failed")

      setVerified(json.data)
      toast({ title: "Verified successfully", description: "Your quote is now unlocked." })
    } catch (e: any) {
      setError(e.message)
      toast({ title: "Verification failed", description: e.message, variant: "destructive" })
    } finally {
      setVerifying(false)
    }
  }

  // 🔹 Step 2: Consume action safely (idempotent, audited)
  async function handleConsume(result: "accept" | "decline") {
    if (!verified) return
    try {
      setConsuming(true)
      const res = await fetch("/api/action-links/consume", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": uuid(),
        },
        body: JSON.stringify({
          token: params.token,
          email,
          result,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Request failed")

      toast({
        title: result === "accept" ? "Quote accepted" : "Quote declined",
        description: "Your response has been securely recorded.",
      })
      router.replace("/thanks")
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
      setError(e.message)
    } finally {
      setConsuming(false)
    }
  }

  // 🔹 Auto-focus
  useEffect(() => {
    document.getElementById("email-input")?.focus()
  }, [])

  // 🔹 Fallback: invalid or expired
  if (error && !verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-sm w-full p-6">
          <CardContent className="text-center space-y-3">
            <h2 className="text-lg font-semibold">Invalid or Expired Link</h2>
            <p className="text-sm text-muted-foreground">
              This link may have expired or already been used.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 🔹 Verification gate
  if (!verified) {
    return (
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
              <Turnstile sitekey={siteKey} onVerify={(t) => setCaptcha(t)} />
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
    )
  }

  // 🔹 Render your existing Public Quote UI
  return (
    <PublicQuoteUI
      params={{ token: params.token }}
      onAccept={() => handleConsume("accept")}
      onDecline={() => handleConsume("decline")}
      verifiedEmail={email}
      verifiedLink={verified}
    />
  )
}
