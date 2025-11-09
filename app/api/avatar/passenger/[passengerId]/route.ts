import { type NextRequest, NextResponse } from "next/server"
import { getPassengerAvatarUrl } from "@/lib/actions/contact-avatar"

export async function GET(request: NextRequest, { params }: { params: { passengerId: string } }) {
  try {
    const { passengerId } = params
    console.log("[v0] Passenger avatar API called for ID:", passengerId)

    if (!passengerId) {
      return NextResponse.json({ error: "Passenger ID is required" }, { status: 400 })
    }

    const result = await getPassengerAvatarUrl(passengerId)
    console.log("[v0] Passenger avatar result:", result)

    if (!result.success) {
      console.log("[v0] Passenger avatar error:", result.error)
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    if (!result.url) {
      console.log("[v0] No avatar URL found")
      return NextResponse.json({ error: "No avatar found" }, { status: 404 })
    }

    console.log("[v0] Redirecting to avatar URL:", result.url)
    return NextResponse.redirect(result.url)
  } catch (error) {
    console.error("[v0] Passenger avatar API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
