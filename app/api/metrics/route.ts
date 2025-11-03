import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();

  try {
    // 1) Quotes awaiting response
    const { count: quotesAwaitingResponse, error: q1 } = await supabase
      .from("quote")
      .select("*", { count: "exact", head: true })
      .in("status", ["awaiting response", "opened"]);
    if (q1) console.error("quotesAwaitingResponse error:", q1);

    // 2) Unpaid quotes
    const { count: unpaidQuotes, error: q2 } = await supabase
      .from("quote")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "unpaid");
    if (q2) console.error("unpaidQuotes error:", q2);

    // 3) Upcoming departures within next 7 days, only for accepted/invoiced/paid/pending_approval
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); end.setHours(23, 59, 59, 999);

    // Step 1: get all quote IDs with the right statuses
    const { data: validQuotes, error: q3a } = await supabase
      .from("quote")
      .select("id")
      .in("status", ["accepted", "invoiced", "paid", "pending_approval"]);

    if (q3a) console.error("validQuotes error:", q3a);

    const validQuoteIds = validQuotes?.map(q => q.id) ?? [];

    // Step 2: filter quote_detail by date range + those quote IDs
    const { count: upcomingDepartures, error: q3b } = await supabase
      .from("quote_detail")
      .select("*", { count: "exact", head: true })
      .in("quote_id", validQuoteIds)
      .gte("depart_dt", start.toISOString())
      .lte("depart_dt", end.toISOString());
    if (q3b) console.error("upcomingDepartures error:", q3b);

    return NextResponse.json({
      quotesAwaitingResponse: quotesAwaitingResponse ?? 0,
      unpaidQuotes: unpaidQuotes ?? 0,
      upcomingDepartures: upcomingDepartures ?? 0,
    });
  } catch (err) {
    console.error("metrics error:", err);
    return NextResponse.json(
      { error: "Failed to load metrics" },
      { status: 500 }
    );
  }
}
