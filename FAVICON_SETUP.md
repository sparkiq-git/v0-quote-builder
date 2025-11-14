# Favicon Setup Guide for AeroIQ

## Best Practices for Next.js 14

### 1. **File Placement**
All favicon files should be placed in the `/public` folder at the root level. Next.js automatically serves files from `/public` at the root URL.

**Recommended structure:**
\`\`\`
/public
  ├── favicon.ico          # Fallback for older browsers
  ├── icon.svg             # Modern SVG favicon (already exists!)
  ├── apple-icon.png       # 180x180 for Apple devices
  └── manifest.json        # Web app manifest
\`\`\`

### 2. **Why NOT Supabase Storage for Favicons?**
- **Performance**: Favicons are critical resources loaded on every page
- **Caching**: Browsers cache favicons aggressively - local files cache better
- **Reliability**: No network dependency for critical UI elements
- **SEO**: Search engines expect favicons to be local

**Use Supabase Storage for:**
- User-uploaded content
- Dynamic branding (logos in emails, PDFs)
- Large media files

**Use `/public` folder for:**
- Favicons
- Static assets
- App icons
- Manifest files

### 3. **Next.js 14 Metadata API**
Next.js 14 automatically detects favicon files in `/public` and generates the appropriate `<link>` tags. You can also explicitly configure them in `metadata`.

## Implementation Steps

### Step 1: Generate Favicon Files
You'll need to create these files from your logo:

1. **favicon.ico** (16x16, 32x32, 48x48 multi-size ICO)
2. **icon.svg** (Already exists! ✅)
3. **apple-icon.png** (180x180 PNG for Apple devices)
4. **icon-192.png** (192x192 for Android)
5. **icon-512.png** (512x512 for PWA)

### Step 2: Place Files in `/public`
\`\`\`
/public
  ├── favicon.ico
  ├── icon.svg (already exists)
  ├── apple-icon.png
  ├── icon-192.png
  ├── icon-512.png
  └── manifest.json
\`\`\`

### Step 3: Update `app/layout.tsx`
Use Next.js metadata API for optimal configuration.

## File Generation Tools

### Online Tools:
1. **RealFaviconGenerator**: https://realfavicongenerator.net/
   - Upload your logo
   - Generates all sizes automatically
   - Provides HTML code

2. **Favicon.io**: https://favicon.io/
   - Simple and fast
   - Good for basic needs

3. **Favicon Generator**: https://www.favicon-generator.org/

### Using Your Existing Logo:
If your logo is in Supabase Storage:
1. Download it from Supabase dashboard
2. Use one of the tools above to generate favicon files
3. Upload generated files to `/public` folder

## Next.js Automatic Detection

Next.js 14 automatically detects these files in `/public`:
- `favicon.ico` → `<link rel="icon">`
- `icon.svg` → `<link rel="icon" type="image/svg+xml">`
- `apple-icon.png` → `<link rel="apple-touch-icon">`

You can also explicitly configure them in metadata for more control.
