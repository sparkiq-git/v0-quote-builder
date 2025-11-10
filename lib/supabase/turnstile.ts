"use server"

// lib/turnstile.ts
export async function verifyTurnstile(responseToken: string, remoteip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY!
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(responseToken)}${remoteip ? `&remoteip=${encodeURIComponent(remoteip)}` : ""}`,
    cache: "no-store",
  })
  const data = await res.json()
  if (!data.success) throw new Error("CAPTCHA verification failed")
}
