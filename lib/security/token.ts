// lib/security/token.ts
import crypto from "crypto"

export function generateOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url") // URL-safe
}

export function sha256Base64url(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("base64url")
}
