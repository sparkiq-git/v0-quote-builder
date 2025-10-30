// lib/security/token.ts

/**
 * Creates a SHA-256 hash of the input and returns it as a base64url-encoded string.
 * This is used for securely storing token hashes in the database.
 * Uses Web Crypto API for browser compatibility.
 */
export async function sha256Base64url(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
  
  // Convert to base64url format (RFC 4648)
  return hashBase64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Generates a cryptographically secure random token.
 * @param length - Length of token in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validates that a token has sufficient entropy.
 * @param token - Token to validate
 * @param minLength - Minimum length in characters
 * @returns true if token is valid
 */
export function validateTokenEntropy(token: string, minLength: number = 20): boolean {
  if (token.length < minLength) return false
  
  // Check for sufficient character diversity
  const uniqueChars = new Set(token).size
  return uniqueChars >= Math.min(token.length / 2, 16)
}
