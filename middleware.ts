import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = [
  "/sign-in",
  "/auth/callback",
  "/q",
  "/public/itinerary",
]

<<<<<<< Current (Your changes)
const PUBLIC_FILE_EXTENSIONS = /\.(?:png|jpg|jpeg|svg|webp|gif|ico|txt|xml|json|map|css|js|woff2?|ttf|otf)$/i
=======
const PUBLIC_FILE_EXTENSIONS = /\.(?:png|jpg|jpeg|svg|webp|gif|ico|txt|xml|json|map|css|js|woff2?|ttf|otf|mp3|wav|ogg|webm)$/i
>>>>>>> Incoming (Background Agent changes)

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method.toUpperCase()

  if (method === "OPTIONS" || method === "HEAD") {
    return NextResponse.next()
  }

  // Allow requests for public/static assets through
  if (PUBLIC_FILE_EXTENSIONS.test(pathname)) {
    return NextResponse.next()
  }

  // Allow explicitly public routes through (sign-in, callbacks, public quote/itinerary)
  if (isPublicPath(pathname)) {
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
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}
