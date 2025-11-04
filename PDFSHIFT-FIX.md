# PDFShift API Fix

The error is caused by invalid parameters in the PDFShift API call. Remove `wait_until` and `print_media` as they're not supported.

## Fix the `generateInvoicePDF` function

Replace the PDFShift API call in your edge function with this corrected version:

\`\`\`typescript
async function generateInvoicePDF(invoiceHtml) {
  try {
    if (!PDFSHIFT_API_KEY) {
      console.warn("⚠️ PDFSHIFT_API_KEY not configured, skipping PDF generation");
      return null;
    }

    console.log("🔄 Generating PDF from HTML...");

    const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`api:${PDFSHIFT_API_KEY}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: invoiceHtml,
        format: "Letter",
        margin: "0.5in",
        landscape: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ PDFShift API error:", response.status, errorText);
      return null;
    }

    const pdfBuffer = await response.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);
    
    console.log("✅ PDF generated successfully:", pdfBytes.length, "bytes");
    return pdfBytes;
  } catch (error) {
    console.error("❌ PDF generation error:", error);
    return null;
  }
}
\`\`\`

## What changed:

- ❌ Removed `wait_until: "networkidle"` (not supported)
- ❌ Removed `print_media: true` (not supported)
- ✅ Kept valid parameters: `source`, `format`, `margin`, `landscape`

The PDF will still render properly - PDFShift automatically handles CSS media queries and waits for content to load.
