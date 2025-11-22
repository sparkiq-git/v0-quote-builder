import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    console.log("🔔 trip_notifications API route called")
    const body = await req.json()
    console.log("🔔 Request body:", JSON.stringify(body, null, 2))
    const { tenant_id, email, action_type, metadata } = body

    // Validate required fields
    if (!tenant_id || !email || !action_type) {
      console.error("❌ Missing required fields:", { tenant_id: !!tenant_id, email: !!email, action_type: !!action_type })
      return NextResponse.json(
        { error: "Missing required fields: tenant_id, email, action_type" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase credentials" },
        { status: 500 }
      )
    }

    // Validate metadata for quote_accepted
    if (action_type === "quote_accepted") {
      if (!metadata?.quote_id) {
        return NextResponse.json(
          { error: "Missing quote_id in metadata for quote_accepted action" },
          { status: 400 }
        )
      }

      if (!metadata?.selected_option_id) {
        return NextResponse.json(
          { error: "Missing selected_option_id in metadata for quote_accepted action" },
          { status: 400 }
        )
      }

      // Pass selected_option_id in metadata for the edge function to use
      console.log("🔔 Validating quote_accepted:", {
        quote_id: metadata.quote_id,
        selected_option_id: metadata.selected_option_id,
      })
    }

    // Regular client for edge function invocation
    const supabase = await createClient()

    const payload = {
      tenant_id,
      email,
      action_type,
      metadata: metadata || {},
    }
    console.log("🔔 Calling edge function 'trip_notifications' with payload:", JSON.stringify(payload, null, 2))
    console.log("🔔 Metadata details:", {
      quote_id: metadata?.quote_id,
      selected_option_id: metadata?.selected_option_id,
      created_by: metadata?.created_by,
    })

    // Try SDK method first
    let data: any = null
    let error: any = null

    try {
      const result = await supabase.functions.invoke("trip_notifications", {
        body: payload,
      })
      data = result.data
      error = result.error
    } catch (invokeErr: any) {
      console.warn("SDK invoke failed, will try direct fetch:", invokeErr)
      error = invokeErr
    }

    console.log("🔔 Edge function SDK response:", { data, error })

    // If SDK failed, make direct fetch to get actual error response
    if (error || !data) {
      console.log("🔔 SDK failed, attempting direct fetch to get error details...")
      
      try {
        const fnUrl = `${supabaseUrl}/functions/v1/trip_notifications`
        const directRes = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify(payload),
        })

        const responseText = await directRes.text()
        let responseData: any = null

        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = { raw: responseText }
        }

        console.log("🔔 Direct fetch response:", {
          status: directRes.status,
          statusText: directRes.statusText,
          body: responseData,
          rawText: responseText,
          contentLength: responseText.length,
        })
        
        // Log the full error for 404s
        if (directRes.status === 404) {
          console.error("🔴 404 ERROR DETAILS:", {
            status: directRes.status,
            responseBody: responseData,
            rawResponse: responseText,
            errorMessage: responseData?.error,
            errorDetails: responseData?.details,
            errorCode: responseData?.code,
          })
        }

        // If we got an error response, extract the actual error message
        if (!directRes.ok) {
          // Handle 404 - could be function not found OR edge function returned 404
          if (directRes.status === 404) {
            // Log the FULL response for debugging
            console.error("🔴 FULL 404 RESPONSE:", {
              status: directRes.status,
              statusText: directRes.statusText,
              responseData,
              rawText: responseText,
              responseDataString: JSON.stringify(responseData, null, 2),
            });
            
            // Check if it's an edge function error response or function not found
            if (responseData?.error && typeof responseData.error === 'string') {
              // Edge function returned a 404 error (e.g., "Selected option not found")
              const errorMessage = responseData.error
              console.error("❌ trip_notifications edge function returned error:", errorMessage)
              console.error("❌ Full error details:", responseData)
              return NextResponse.json(
                { 
                  error: errorMessage, 
                  details: responseData,
                  fullResponse: responseData, // Include full response for debugging
                },
                { status: 404 }
              )
            } else {
              // Function itself doesn't exist OR edge function returned 404 without error field
              const errorMessage = responseData?.error || 
                                 responseData?.message || 
                                 `Edge function 'trip_notifications' returned 404. Response: ${responseText.substring(0, 200)}`
              console.error("❌ trip_notifications 404 (no error field):", {
                url: fnUrl,
                status: directRes.status,
                response: responseData,
                rawText: responseText,
              })
              return NextResponse.json(
                { 
                  error: errorMessage, 
                  details: { 
                    status: 404,
                    response: responseData,
                    rawText: responseText,
                    suggestion: "Check Supabase function logs for details",
                  } 
                },
                { status: 404 }
              )
            }
          }

          // Handle 429 (rate limit / duplicate) gracefully - this might be a retry after an error
          if (directRes.status === 429) {
            const errorMessage = responseData?.error || "Duplicate notification – please wait."
            console.warn("⚠️ trip_notifications rate limited/duplicate:", errorMessage)
            // Return success for duplicate notifications since the original might have succeeded
            // or return the error if we want to retry later
            return NextResponse.json(
              { 
                error: errorMessage, 
                details: responseData,
                note: "This may be a retry after a previous call. Check if notification was already sent."
              },
              { status: 429 }
            )
          }

          const errorMessage = responseData?.error || 
                              responseData?.message || 
                              responseText.slice(0, 200) ||
                              `Edge Function returned error (${directRes.status})`
          
          console.error("❌ trip_notifications edge function error:", errorMessage)
          console.error("❌ Error context:", {
            payload,
            responseData,
            status: directRes.status,
          })
          return NextResponse.json(
            { error: errorMessage, details: responseData },
            { status: directRes.status >= 400 && directRes.status < 500 ? directRes.status : 400 }
          )
        }

        // Success from direct fetch
        if (responseData?.ok !== false) {
          console.log("✅ trip_notifications edge function called successfully via direct fetch:", responseData)
          return NextResponse.json({ success: true, data: responseData })
        }
      } catch (fetchErr: any) {
        console.error("❌ Direct fetch also failed:", fetchErr)
        // Fall through to return generic error
      }
    }

    // Check if data has error (edge function returned error in response body)
    if (data && typeof data === 'object') {
      // Check for {ok: false, error: "..."} pattern
      if ('ok' in data && !data.ok && data.error) {
        console.error("❌ trip_notifications edge function returned ok: false with error:", data.error)
        const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        return NextResponse.json(
          { error: errorMessage, details: data },
          { status: 400 }
        )
      }
      
      // Check for {error: "..."} pattern
      if ('error' in data && data.error) {
        console.error("❌ trip_notifications edge function returned error in data:", data.error)
        const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        return NextResponse.json(
          { error: errorMessage, details: data },
          { status: 400 }
        )
      }
    }

    // If SDK returned an error but we couldn't get the actual response
    if (error) {
      console.error("❌ trip_notifications edge function SDK error (no details available):", error)
      const errorMessage = error.message || 
                         (error as any)?.message ||
                         "Edge Function returned an error. Check server logs for details."
      return NextResponse.json(
        { error: errorMessage, details: { error, note: "Could not extract detailed error from edge function response" } },
        { status: 400 }
      )
    }

    console.log("✅ trip_notifications edge function called successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("❌ Failed to call trip_notifications edge function:", error)
    console.error("❌ Error stack:", error?.stack)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
