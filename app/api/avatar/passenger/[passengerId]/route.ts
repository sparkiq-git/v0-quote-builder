import { type NextRequest, NextResponse } from "next/server"
import { getPassengerAvatarUrl } from "@/lib/actions/contact-avatar"

export async function GET(request: NextRequest, { params }: { params: { passengerId: string } }) {
  try {
    const { passengerId } = params

    if (!passengerId) {
      return NextResponse.json({ error: "Passenger ID is required" }, { status: 400 })
    }

    const result = await getPassengerAvatarUrl(passengerId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    if (!result.url) {
      return NextResponse.json({ error: "No avatar found" }, { status: 404 })
    }

    return NextResponse.redirect(result.url)
  } catch (error) {
    console.error("Passenger avatar API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
