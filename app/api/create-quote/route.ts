// app/api/book-trip/route.ts
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const TENANT_ID = process.env.TENANT_ID!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = { ...body, tenantId: TENANT_ID };

    const r = await fetch(`${SUPABASE_URL}/functions/v1/book-trip-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
