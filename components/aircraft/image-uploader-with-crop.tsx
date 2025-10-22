"use client"

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { Loader2, UploadCloud } from "lucide-react"
import { getCroppedImg } from "@/lib/utils/crop"

interface ImageUploaderWithCropProps {
  tenantId: string
  aircraftId: string
  aspect?: number
  bucket?: string
  onUploaded?: (res: { storage_path: string; public_url: string | null }) => void
}

export default function ImageUploaderWithCrop({
  tenantId,
  aircraftId,
  aspect = 16 / 9,
  bucket = "aircraft-images",
  onUploaded,
}: ImageUploaderWithCropProps) {
  const { toast } = useToast()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [uploading, setUploading] = useState(false)

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!imageSrc) {
      toast({ title: "No image selected", variant: "destructive" })
      return
    }
    if (!croppedAreaPixels) {
      toast({ title: "Please crop your image first", variant: "destructive" })
      return
    }

    try {
      setUploading(true)
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (!blob) throw new Error("Failed to create cropped image")

      const filePath = `tenant/${tenantId}/aircraft/${aircraftId}/${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, { contentType: "image/jpeg" })

      if (error) throw error

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      const publicUrl = publicData?.publicUrl ?? null

      onUploaded?.({ storage_path: filePath, public_url: publicUrl })
      toast({ title: "Upload successful", description: "Image uploaded and cropped." })
      setImageSrc(null)
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {!imageSrc && (
        <div className="space-y-2">
          <Input type="file" accept="image/*" onChange={handleFileChange} />
          <p className="text-xs text-muted-foreground">
            Select an image to start cropping before uploading.
          </p>
        </div>
      )}

      {imageSrc && (
        <div className="relative w-full h-[300px] bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid
          />
        </div>
      )}

      {imageSrc && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setImageSrc(null)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4 mr-2" /> Upload
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
