import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface NormalizedWeather {
  stationId: string
  metar?: {
    rawText?: string
    observationTime?: string
    temperatureC?: number | null
    dewpointC?: number | null
    wind?: string | null
    visibility?: string | null
    altimeter?: string | null
    flightCategory?: string | null
  }
  taf?: {
    rawText?: string
    issueTime?: string
    validFrom?: string | null
    validTo?: string | null
    forecastSummary?: string[]
  }
}

function normalizeStationId(entry: any): string | null {
  return (
    entry?.stationId ||
    entry?.station ||
    entry?.icaoId ||
    entry?.icao ||
    entry?.site ||
    entry?.id ||
    entry?.properties?.station ||
    null
  )
}

function formatWind(entry: any): string | null {
  const wind = entry?.wind || entry?.windDir || entry?.wind_speed || entry?.wind_speed_kt
  const direction =
    entry?.wind?.direction?.repr ||
    entry?.windDir?.repr ||
    entry?.wind_direction_degrees ||
    entry?.wind_direction ||
    entry?.wind?.direction?.value ||
    entry?.windDir?.value
  const speed =
    entry?.wind?.speed?.repr ||
    entry?.windSpeed?.repr ||
    entry?.wind_speed ||
    entry?.wind_speed_kt ||
    entry?.wind?.speed?.value ||
    entry?.windSpeed?.value
  const gust =
    entry?.wind?.gust?.repr ||
    entry?.windGust?.repr ||
    entry?.wind_gust_kt ||
    entry?.wind_gust ||
    entry?.wind?.gust?.value ||
    entry?.windGust?.value

  const unit =
    entry?.wind?.speed?.unit ||
    entry?.windSpeed?.unit ||
    entry?.wind?.gust?.unit ||
    entry?.windGust?.unit ||
    "KT"

  if (!direction && !speed) {
    if (typeof wind === "string") return wind
    return null
  }

  const dirText = direction ? `${direction}` : ""
  const speedText = speed ? `${speed}${unit}` : ""
  const gustText = gust ? `G${gust}${unit}` : ""

  return [dirText, speedText, gustText].filter(Boolean).join(" ")
}

function formatVisibility(entry: any): string | null {
  const vis =
    entry?.visibility?.repr ||
    entry?.visibility?.value ||
    entry?.vis?.repr ||
    entry?.visibility_statute_mi ||
    entry?.visibility ||
    entry?.vis_sm
  const unit =
    entry?.visibility?.unit || entry?.vis?.unit || (typeof vis === "number" ? "SM" : null)

  if (vis == null) return null
  return unit ? `${vis} ${unit}` : String(vis)
}

function formatAltimeter(entry: any): string | null {
  const alt =
    entry?.altimeter?.repr ||
    entry?.altimeter?.value ||
    entry?.altim_in_hg ||
    entry?.altimeter_in_hg ||
    entry?.altimeter ||
    entry?.altimeter_setting_mb

  const unit =
    entry?.altimeter?.unit ||
    (entry?.altim_in_hg || entry?.altimeter_in_hg ? "inHg" : entry?.altimeter_setting_mb ? "mb" : null)

  if (alt == null) return null
  return unit ? `${alt} ${unit}` : String(alt)
}

function normalizeMetarData(payload: any): Record<string, NormalizedWeather["metar"]> {
  const result: Record<string, NormalizedWeather["metar"]> = {}
  const entries = payload?.data || payload?.metar || payload?.features || []

  for (const entry of entries) {
    const stationId =
      normalizeStationId(entry) ||
      normalizeStationId(entry?.properties) ||
      entry?.icao ||
      entry?.id ||
      entry?.rawOb?.split(" ")?.[0] ||
      null

    if (!stationId) continue
    const properties = entry?.properties || entry

    result[stationId.toUpperCase()] = {
      rawText: properties?.rawOb || properties?.raw_text || properties?.rawTAF || properties?.raw || properties?.rawReport,
      observationTime:
        properties?.obsTime ||
        properties?.observed ||
        properties?.observation_time ||
        properties?.time?.repr ||
        properties?.datetime,
      temperatureC:
        properties?.temp?.value ??
        properties?.temperature?.value ??
        properties?.temp_c ??
        properties?.temperature_c ??
        properties?.temp,
      dewpointC:
        properties?.dewpoint?.value ??
        properties?.dewpoint_c ??
        properties?.dewpoint ??
        properties?.dewpoint_temperature_c,
      wind: formatWind(properties),
      visibility: formatVisibility(properties),
      altimeter: formatAltimeter(properties),
      flightCategory:
        properties?.fltCat ||
        properties?.flightCategory ||
        properties?.flight_category ||
        properties?.category ||
        null,
    }
  }

  return result
}

function normalizeTafData(payload: any): Record<string, NormalizedWeather["taf"]> {
  const result: Record<string, NormalizedWeather["taf"]> = {}
  const entries = payload?.data || payload?.taf || payload?.features || []

  for (const entry of entries) {
    const stationId =
      normalizeStationId(entry) ||
      normalizeStationId(entry?.properties) ||
      entry?.icao ||
      entry?.id ||
      entry?.rawTAF?.split(" ")?.[0] ||
      null

    if (!stationId) continue
    const properties = entry?.properties || entry
    const summary: string[] = []

    const forecasts = properties?.forecast || properties?.forecasts || properties?.groups || []
    if (Array.isArray(forecasts)) {
      for (const group of forecasts) {
        const timeRange =
          group?.time || group?.validTime || group?.valid || group?.from_time || group?.period || group?.timePeriod
        const winds = formatWind(group)
        const weather = group?.weather?.join(" ") || group?.wx || group?.conditions || group?.summary
        const clouds = Array.isArray(group?.clouds)
          ? group.clouds
              .map((c: any) => c?.repr || c?.text || c?.type)
              .filter(Boolean)
              .join(" ")
          : null

        const pieces = []
        if (timeRange) pieces.push(typeof timeRange === "string" ? timeRange : JSON.stringify(timeRange))
        if (winds) pieces.push(winds)
        if (weather) pieces.push(weather)
        if (clouds) pieces.push(clouds)

        if (pieces.length > 0) {
          summary.push(pieces.join(" • "))
        } else if (group?.raw) {
          summary.push(group.raw)
        }
      }
    }

    result[stationId.toUpperCase()] = {
      rawText: properties?.rawTAF || properties?.raw_text || properties?.raw || properties?.text,
      issueTime:
        properties?.issueTime ||
        properties?.issue_time ||
        properties?.issue ||
        properties?.datetime ||
        properties?.time?.repr,
      validFrom: properties?.validTimeFrom || properties?.valid_from || properties?.valid_period?.from || null,
      validTo: properties?.validTimeTo || properties?.valid_to || properties?.valid_period?.to || null,
      forecastSummary: summary.length > 0 ? summary : undefined,
    }
  }

  return result
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids")

    if (!idsParam) {
      return NextResponse.json({ error: "Query parameter `ids` is required." }, { status: 400 })
    }

    const ids = idsParam
      .split(",")
      .map((id) => id.trim().toUpperCase())
      .filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid airport identifiers provided." }, { status: 400 })
    }

    const idQuery = ids.join(",")
    const metarUrl = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(idQuery)}&format=json`
    const tafUrl = `https://aviationweather.gov/api/data/taf?ids=${encodeURIComponent(idQuery)}&format=json`

    const userAgent = "AeroIQ/1.0 (support@aeroiq.io)"

    const [metarRes, tafRes] = await Promise.all([
      fetch(metarUrl, {
        headers: {
          "User-Agent": userAgent,
          Accept: "application/json",
        },
        cache: "no-store",
      }),
      fetch(tafUrl, {
        headers: {
          "User-Agent": userAgent,
          Accept: "application/json",
        },
        cache: "no-store",
      }),
    ])

    if (!metarRes.ok) {
      const text = await metarRes.text()
      console.error("METAR fetch failed:", metarRes.status, text)
      return NextResponse.json(
        { error: "Failed to retrieve METAR data", status: metarRes.status, details: text?.slice(0, 500) },
        { status: metarRes.status || 502 }
      )
    }

    if (!tafRes.ok) {
      const text = await tafRes.text()
      console.error("TAF fetch failed:", tafRes.status, text)
      return NextResponse.json(
        { error: "Failed to retrieve TAF data", status: tafRes.status, details: text?.slice(0, 500) },
        { status: tafRes.status || 502 }
      )
    }

    const metarJson = await metarRes.json().catch((err) => {
      console.error("Failed to parse METAR JSON:", err)
      return null
    })
    const tafJson = await tafRes.json().catch((err) => {
      console.error("Failed to parse TAF JSON:", err)
      return null
    })

    const metarData = metarJson ? normalizeMetarData(metarJson) : {}
    const tafData = tafJson ? normalizeTafData(tafJson) : {}

    const response: Record<string, NormalizedWeather> = {}

    for (const id of ids) {
      response[id] = {
        stationId: id,
        metar: metarData[id],
        taf: tafData[id],
      }
    }

    return NextResponse.json({ data: response }, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } })
  } catch (error: any) {
    console.error("Weather summary route error:", error)
    return NextResponse.json(
      { error: error?.message || "Unexpected error retrieving weather data." },
      { status: 500 }
    )
  }
}
