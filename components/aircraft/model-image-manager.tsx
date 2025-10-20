"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ImagePlus, Trash2, UploadCloud } from "lucide-react"
import Cropper from "react-easy-crop"
import Slider from "@mui/material/Slider"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { getCroppedImg } from "@/lib/utils/crop"

interface ModelImageManagerProps {
  modelId: string
  tenantId: string
  onImagesUpdated?: () => void
}

export default function ModelImageManager({ modelId, tenantId, onImagesUpdated }: ModelImageManagerProps) {
  const { toast } = useToast()
  const [images, setImages] = useState<{ url: string; id?: string }[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // ✅ Generate a safe object URL for the selected file
  useEffect(() => {
    if (!selectedFile) return
    const fileReader = new FileReader()
    fileReader.onload = () => setPreviewUrl(fileReader.result as string)
    fileReader.readAsDataURL(selectedFile) // ✅ use data URL for consistency
    return () => setPreviewUrl(null)
  }, [selectedFile])

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setCropOpen(true)
    setImageLoaded(false)
  }

  const handleCropComplete = (_: any, pixels: any) => setCroppedAreaPixels(pixels)

  const handleUpload = async () => {
    if (!selectedFile || !imageLoaded || !croppedAreaPixels) {
      toast({
        title: "Select and crop an image before uploading",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)
      toast({ title: "Processing image..." })

      const croppedBlob = await getCroppedImg(previewUrl!, croppedAreaPixels)
      if (!croppedBlob) throw new Error("Failed to crop image")

      const fileName = `${Date.now()}_${selectedFile.name}`
      const storagePath = `tenant/${tenantId}/models/${modelId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("aircraft")
        .upload(storagePath, croppedBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type || "image/jpeg",
        })
      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage.from("aircraft").getPublicUrl(storagePath)
      const publicUrl = publicData.publicUrl

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) throw userError
      
      if (!user) {
        throw new Error("User not authenticated")
      }
      
      // Verify tenant_id matches user's tenant
      const userTenantId = user.app_metadata?.tenant_id
      if (userTenantId && userTenantId !== tenantId) {
        throw new Error("Tenant ID mismatch")
      }
      
      // Since RLS is disabled, we can insert directly
      console.log("Inserting image with data:", {
        tenant_id: tenantId,
        aircraft_model_id: modelId,
        storage_path: storagePath,
        public_url: publicUrl,
        uploaded_by: user?.id || null,
      })
      
      const { error: dbError, data: inserted } = await supabase
        .from("aircraft_model_image")
        .insert({
          tenant_id: tenantId,
          aircraft_model_id: modelId,
          storage_path: storagePath,
          public_url: publicUrl,
          uploaded_by: user?.id || null,
          caption: null,
          is_primary: false,
          display_order: 0,
        })
        .select("*")
        .single()

      if (dbError) {
        console.error("Database insert error:", dbError)
        console.error("Insert data:", {
          tenant_id: tenantId,
          aircraft_model_id: modelId,
          storage_path: storagePath,
          public_url: publicUrl,
          uploaded_by: user?.id || null,
        })
        throw new Error(`Database error: ${dbError.message}`)
      }

      setImages((prev) => [...prev, { url: publicUrl, id: inserted.id }])
      toast({ title: "Image uploaded successfully" })
      onImagesUpdated?.() // Notify parent component to refresh
      resetState()
    } catch (error: any) {
      console.error("Upload failed", error)
      
      let errorMessage = error.message || String(error)
      
      // Provide more specific error messages for common RLS issues
      if (errorMessage.includes("row-level security policy")) {
        errorMessage = "Permission denied. Please check that you have the correct permissions to upload images for this model."
      } else if (errorMessage.includes("Tenant ID mismatch")) {
        errorMessage = "Tenant ID mismatch. Please refresh the page and try again."
      } else if (errorMessage.includes("User not authenticated")) {
        errorMessage = "Please sign in again to continue."
      }
      
      toast({
        title: "Upload error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (url: string, id?: string) => {
    try {
      // Extract storage path from URL more reliably
      const urlParts = url.split("/storage/v1/object/public/")
      const path = urlParts.length > 1 ? urlParts[1] : null
      
      if (path) {
        await supabase.storage.from("aircraft").remove([path])
      }
      
      if (id) {
        await supabase.from("aircraft_model_image").delete().eq("id", id)
      }
      
      setImages((prev) => prev.filter((img) => img.url !== url))
      toast({ title: "Image deleted" })
      onImagesUpdated?.() // Notify parent component to refresh
    } catch (error: any) {
      toast({
        title: "Delete error",
        description: error.message || String(error),
        variant: "destructive",
      })
    }
  }

  const resetState = () => {
    setCropOpen(false)
    setSelectedFile(null)
    setPreviewUrl(null)
    setCroppedAreaPixels(null)
    setImageLoaded(false)
  }

  useEffect(() => {
    const fetchImages = async () => {
      const { data, error } = await supabase
        .from("aircraft_model_image")
        .select("id, public_url")
        .eq("aircraft_model_id", modelId)
        .eq("tenant_id", tenantId)
        .order("display_order", { ascending: true })
      if (!error && data) setImages(data.map((i) => ({ url: i.public_url, id: i.id })))
    }
    fetchImages()
  }, [modelId, tenantId])

  return (
    <div>
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          {images.map((img) => (
            <div key={img.id || img.url} className="relative group">
              <img
                src={img.url}
                alt="Model"
                className="w-full h-40 object-cover rounded-md border bg-muted"
              />
              <button
                onClick={() => handleDelete(img.url, img.id)}
                className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">No images uploaded yet.</p>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleSelectFile}
          className="hidden"
        />
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <ImagePlus className="h-4 w-4 mr-2" /> Select Image
        </Button>
      </div>

      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>

          {previewUrl ? (
            <div className="relative w-full h-[60vh] bg-neutral-900 flex items-center justify-center rounded-md overflow-hidden">
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                onMediaLoaded={() => setImageLoaded(true)}
                objectFit="contain"
                showGrid
              />
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No preview available</p>
          )}

          <div className="flex items-center gap-3 mt-4 px-4">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(_, v) => setZoom(v as number)}
              size="small"
              sx={{ color: "#16a34a", flex: 1 }}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={resetState}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !imageLoaded}>
              {uploading ? (
                <>
                  <UploadCloud className="h-4 w-4 mr-2 animate-pulse" /> Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 mr-2" /> Save & Upload
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
