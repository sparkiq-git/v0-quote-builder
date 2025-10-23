"use client"

import { useState } from "react"
import Turnstile from "react-turnstile"
import { v4 as uuid } from "uuid"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const PublicQuotePage = dynamic(() => import("@/components/quotes/public-quote-page"), { ssr: false })

export default function ActionPage({ params }: { params: { token: string } }) {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!

  // --- Safe fetch with clone for dual parsing ---
  async function safeFetchJSON(url: string, options: RequestInit) {
    const res = await fetch(url, options)
    const cloned = res.clone()

    try {
      const json = await res.json()
      if (!res.ok || json?.ok === false) {
        console.error(`Request to ${url} failed:`, json)
        throw new Error(json?.error || `Request failed (${res.status})`)
      }
      return json
    } catch (jsonErr) {
      try {
        const text = await cloned.text()
        console.error(`Non-JSON response from ${url}:`, text)
        throw new Error(`Unexpected ${res.status} response: ${text.slice(0, 120)}`)
      } catch (textErr) {
        console.error(`Failed to parse response from ${url}:`, textErr)
        throw new Error(`Failed to parse response (${res.status})`)
      }
    }
  }

  async function handleVerify() {
    setError(null)
    setVerifying(true)
    try {
      const json = await safeFetchJSON("/api/action-links/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          email,
          captchaToken: captcha,
        }),
      })

      console.log("Verification response:", json)
      setVerified(json.data)
      toast({
        title: "Verified successfully",
        description: "Your quote is now unlocked.",
      })
    } catch (e: any) {
      console.error("Verification error:", e)
      setError(e.message)
      toast({
        title: "Verification failed",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
  }

  async function handleConsume(result: "accept" | "decline") {
    try {
      const json = await safeFetchJSON("/api/action-links/consume", {
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

      console.log("Consume response:", json)

      toast({
        title: result === "accept" ? "Quote accepted" : "Quote declined",
        description: "Your response has been securely recorded.",
      })
    } catch (e: any) {
      console.error("Consume error:", e)
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      })
    }
  }

  // --- UI ---
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

  return (
    <PublicQuotePage
      params={{ token: params.token }}
      verifiedEmail={email}
      onAccept={() => handleConsume("accept")}
      onDecline={() => handleConsume("decline")}
    />
  )
}
