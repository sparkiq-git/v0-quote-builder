const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")

export function getPublicStorageUrl(bucket: string, path?: string | null): string | undefined {
  if (!SUPABASE_PUBLIC_URL || !path) return undefined
  const normalizedPath = path.replace(/^\/+/, "")
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${bucket}/${normalizedPath}`
}
