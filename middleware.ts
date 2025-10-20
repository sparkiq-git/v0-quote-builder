import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/management", "/schedule", "/operations"]
const PUBLIC_PATHS = ["/sign-in", "/auth/callback"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Short-circuit public paths explicitly
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Only run middleware for our protected prefixes (matcher also helps, but this is an extra guard)
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (!isProtected) {
    return NextResponse.next()
  }

  // Prepare response we’ll attach cookies to
  let response = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase not configured, bounce protected routes to sign-in
  if (!supabaseUrl || !supabaseAnonKey) {
    const redirectUrl = new URL("/sign-in", request.url)
    redirectUrl.searchParams.set("next", pathname)
    redirectUrl.searchParams.set("error", "supabase-not-configured")
    return NextResponse.redirect(redirectUrl)
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Create a new response and copy cookies onto it
        response = NextResponse.next()
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect the route if unauthenticated
  if (!user) {
    const redirectUrl = new URL("/sign-in", request.url)
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  // Don't run on static assets or Next internals
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/management/:path*",
    "/schedule/:path*",
    "/operations/:path*",
  ],
}
