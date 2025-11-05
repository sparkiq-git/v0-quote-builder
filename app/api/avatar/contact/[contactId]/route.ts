import { type NextRequest, NextResponse } from "next/server"
import { getContactAvatarUrl } from "@/lib/actions/contact-avatar"

export async function GET(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = params

    if (!contactId) {
      return NextResponse.json({ error: "Contact ID is required" }, { status: 400 })
    }

    const result = await getContactAvatarUrl(contactId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    if (!result.url) {
      return NextResponse.json({ error: "No avatar found" }, { status: 404 })
    }

    return NextResponse.redirect(result.url)
  } catch (error) {
    console.error("Contact avatar API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
