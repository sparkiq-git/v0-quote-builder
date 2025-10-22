// app/action/[token]/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Turnstile from "react-turnstile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { v4 as uuid } from "uuid"

export default function ActionPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState<any | null>(null)
  const [consuming, setConsuming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!

  async function handleVerify() {
    setError(null)
    try {
      setVerifying(true)
      const res = await fetch("/api/action-links/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: params.token, email, captchaToken: captcha }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Verification failed")
      setVerified(json.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setVerifying(false)
    }
  }

  async function handleConsume() {
    setError(null)
    try {
      setConsuming(true)
      const res = await fetch("/api/action-links/consume", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": uuid(),
        },
        body: JSON.stringify({ token: params.token, email }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Consume failed")
      router.replace("/thanks") // or show a success component
    } catch (e: any) {
      setError(e.message)
    } finally {
      setConsuming(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Secure Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!verified ? (
            <>
              <p className="text-sm text-muted-foreground">
                Enter the email this link was sent to, then complete the CAPTCHA to continue.
              </p>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Turnstile sitekey={siteKey} onVerify={(t) => setCaptcha(t)} />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button disabled={!email || !captcha || verifying} onClick={handleVerify}>
                {verifying ? "Verifying..." : "Continue"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Verified for <strong>{email}</strong>.
              </p>
              <div className="rounded border p-3 text-sm">
                <div>Action: {verified.action_type}</div>
                <div>Expires: {new Date(verified.expires_at).toLocaleString()}</div>
                {/* Optional: render verified.metadata preview */}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button disabled={consuming} onClick={handleConsume}>
                {consuming ? "Processing..." : "Confirm & Continue"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
