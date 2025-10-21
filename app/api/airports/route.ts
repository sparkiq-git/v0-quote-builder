// app/api/airports/route.ts
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

// ---- Redis (uses your env names, supports read-only token) ----
const url = process.env.KV_REST_API_URL!;
const token =
  process.env.KV_REST_API_READ_ONLY_TOKEN ?? process.env.KV_REST_API_TOKEN!;
const redis = new Redis({ url, token });

// ---- Supabase (Edge-safe anon key) ----
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// cache key helper
const cacheKey = (q: string, limit: number) =>
  `airports:q:${q.toLowerCase().trim()}:l:${limit}`;

type Row = {
  airport_code: string | null;
  airport_code_adjusted: string | null;
  gps_code: string | null;
  local_code: string | null;
  airport: string;
  airport_id: string;
  iata_code: string | null;
  country_code: string;
  region: string | null;
  municipality: string | null;
  continent: string | null;
  airport_type: "large_airport" | "medium_airport" | "small_airport" | string;
  latitude: number | null;
  longitude: number | null;
  country_name: string | null;
  region_name: string | null;
  search_terms: string[] | null;
  dropdown: string;
  rank?: number | null;
};

function sanitize(s = "") {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

const TYPE_WEIGHT: Record<string, number> = {
  large_airport: 3,
  medium_airport: 2,
  small_airport: 1,
};
const typeWeight = (t?: string) => (t ? TYPE_WEIGHT[t] ?? 0 : 0);

function scoreRow(r: Row, qNorm: string, raw: string) {
  const qUp = raw.trim().toUpperCase();
  const codeCandidates = [
    r.iata_code,
    r.gps_code,
    r.local_code,
    r.airport_code,
    r.airport_code_adjusted,
  ].filter(Boolean) as string[];

  // Exact code match boost
  const exact = codeCandidates.some((c) => c.toUpperCase() === qUp) ? 100 : 0;

  // Prefix code match boost
  const prefix = codeCandidates.some((c) => c.toUpperCase().startsWith(qUp)) ? 50 : 0;

  // Textual contains
  const inName =
    (r.airport || "").toLowerCase().includes(qNorm) ||
    (r.municipality || "").toLowerCase().includes(qNorm) ||
    (r.country_name || "").toLowerCase().includes(qNorm)
      ? 10
      : 0;

  // Type weight (light boost here; primary ordering by type is applied later)
  const typeBoost = typeWeight(r.airport_type) * 2;

  return exact + prefix + inName + typeBoost;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("q") || "";
  const q = sanitize(raw);
  const limit = Math.min(Number(searchParams.get("limit") || 15), 30);

  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  // 1) Try Redis response cache
  const key = cacheKey(q, limit);
  try {
    const cached = await redis.get<string>(key);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  } catch {
    // ignore cache read errors
  }

  // 2) Supabase search — exact + fuzzy in PARALLEL (fast)
  const fields =
    "airport_code,airport_code_adjusted,gps_code,local_code,airport,airport_id,iata_code,country_code,region,municipality,continent,airport_type,latitude,longitude,country_name,region_name,search_terms,dropdown,rank";

  const qUp = raw.trim().toUpperCase();
  const qNorm = q.trim().toLowerCase();
  const likePrefix = `${qUp}%`;
  const likeAnywhere = `%${qNorm}%`;
  const isLikelyCode = /^[a-z0-9]{2,5}$/i.test(raw.trim());

  const exactFilters = [
    `iata_code.eq.${qUp}`,
    `gps_code.eq.${qUp}`,
      `airport_code.eq.${qUp}`,
    `airport_code_adjusted.eq.${qUp}`,
  ].join(",");

  const fuzzyFilters = [
    `iata_code.ilike.${likePrefix}`,
    `gps_code.ilike.${likePrefix}`,
    `local_code.ilike.${likePrefix}`,
    `airport_code.ilike.${likePrefix}`,
    `airport_code_adjusted.ilike.${likePrefix}`,
    `airport.ilike.${likeAnywhere}`,
    `municipality.ilike.${likeAnywhere}`,
    `country_name.ilike.${likeAnywhere}`,
    `search_terms.cs.{${qUp}}`,
  ].join(",");

  const exactPromise = isLikelyCode
    ? supabase.from("airports_search").select(fields).or(exactFilters).limit(50)
    : Promise.resolve({ data: [] as Row[], error: null } as any);

  const fuzzyPromise = supabase
    .from("airports_search")
    .select(fields)
    .or(fuzzyFilters)
    .limit(100);

  const [exactRes, fuzzyRes] = await Promise.all([exactPromise, fuzzyPromise]);

  if (exactRes.error || fuzzyRes.error) {
    const msg = exactRes.error?.message || fuzzyRes.error?.message || "Unknown error";
    console.error("Airport search error:", msg);
    return NextResponse.json({ items: [], error: msg });
  }

  // Merge + dedupe
  const all = [...(exactRes.data ?? []), ...(fuzzyRes.data ?? [])] as Row[];
  const uniqueMap = new Map<string, Row>();
  for (const row of all) {
    if (row.airport_id && !uniqueMap.has(row.airport_id)) {
      uniqueMap.set(row.airport_id, row);
    }
  }
  const rows = Array.from(uniqueMap.values());

  // 3) Sort primarily by rank (ascending), with exact code first, then fallback
  const ranked = rows.map((r) => ({ r, s: scoreRow(r, q, raw) }));

  ranked.sort((a, b) => {
    const qUp = raw.trim().toUpperCase();

    // ✈️ Exact code match first
    const codeFieldsA = [a.r.iata_code, a.r.gps_code, a.r.local_code, a.r.airport_code, a.r.airport_code_adjusted];
    const codeFieldsB = [b.r.iata_code, b.r.gps_code, b.r.local_code, b.r.airport_code, b.r.airport_code_adjusted];

    const aExact = codeFieldsA.some((c) => c && c.trim().toUpperCase() === qUp) ? 1 : 0;
    const bExact = codeFieldsB.some((c) => c && c.trim().toUpperCase() === qUp) ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    // 🥇 Rank ascending
    const ra = a.r.rank ?? null;
    const rb = b.r.rank ?? null;
    if (ra !== null && rb !== null && ra !== rb) return ra - rb;
    if (ra !== null && rb === null) return -1;
    if (ra === null && rb !== null) return 1;

    // 🇺🇸 Fallback: US-first → type weight → score → alpha
    const aUS = (a.r.country_code || "").toUpperCase() === "US" ? 1 : 0;
    const bUS = (b.r.country_code || "").toUpperCase() === "US" ? 1 : 0;
    if (aUS !== bUS) return bUS - aUS;

    const wa = typeWeight(a.r.airport_type);
    const wb = typeWeight(b.r.airport_type);
    if (wa !== wb) return wb - wa;

    if (a.s !== b.s) return b.s - a.s;

    const la =
      a.r.dropdown ||
      `${a.r.airport} (${a.r.iata_code || a.r.airport_code_adjusted || a.r.airport_code || "-"})${
        a.r.municipality ? `, ${a.r.municipality}` : ""
      }, ${a.r.country_code}`;
    const lb =
      b.r.dropdown ||
      `${b.r.airport} (${b.r.iata_code || b.r.airport_code_adjusted || b.r.airport_code || "-"})${
        b.r.municipality ? `, ${b.r.municipality}` : ""
      }, ${b.r.country_code}`;
    return la.localeCompare(lb);
  });

  const sliced = ranked.slice(0, limit).map(({ r }) => r);

  // 4) Shape for UI (includes country_code for the flag)
const items = sliced.map((a) => ({
  id: a.airport_id,
  label:
    a.dropdown ||
    `${a.airport} (${a.iata_code || a.airport_code_adjusted || a.airport_code || "-"})${
      a.municipality ? `, ${a.municipality}` : ""
    }, ${a.country_code}`,
  airport: a.airport,
  airport_code:
    a.airport_code ||
    null, // ✅ standardized code
  iata: a.iata_code,
  icao: a.gps_code,
  municipality: a.municipality,
  country_code: a.country_code,
  country_name: a.country_name,
  lat: a.latitude,
  lon: a.longitude,
  airport_type: a.airport_type,
}));


  const payload = { items };

  // 5) Store in Redis (response cache) for 7 days if write token available
  try {
    if (process.env.KV_REST_API_TOKEN) {
      await redis.set(key, JSON.stringify(payload), { ex: 60 * 60 * 24 * 7 });
    }
  } catch {
    // ignore cache write errors
  }

  return NextResponse.json(payload);
}
