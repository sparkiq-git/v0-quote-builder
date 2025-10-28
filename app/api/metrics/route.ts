import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // 

export async function GET() {
  const supabase = await createClient();

  try {
    // 2) Quotes: status = 'awaiting response'
    const { count: quotesAwaitingResponse, error: q1 } = await supabase
      .from("quote") // 
      .select("*", { count: "exact", head: true })
      .in("status", ["awaiting response", "opened"]);
    if (q1) console.error("quotesAwaitingResponse error:", q1);

    // 3) Unpaid: payment_status = 'unpaid'
    const { count: unpaidQuotes, error: q2 } = await supabase
      .from("quote") // 
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "unpaid");
    if (q2) console.error("unpaidQuotes error:", q2);

    // 4) Upcoming Departures: quote_detail.depart_dt within next 7 days
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); end.setHours(23, 59, 59, 999);

    const { count: upcomingDepartures, error: q3 } = await supabase
      .from("quote_detail")
      .select("*", { count: "exact", head: true })
      .gte("depart_dt", start.toISOString())
      .lte("depart_dt", end.toISOString());
    if (q3) console.error("upcomingDepartures error:", q3);

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
