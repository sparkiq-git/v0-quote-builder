"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ImagePlus, Trash2, UploadCloud, X, Crop } from "lucide-react"
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
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropPreview, setCropPreview] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Load existing images
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Image too large", description: "Each image must be < 5MB", variant: "destructive" })
        return
      }
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Only image files are allowed", variant: "destructive" })
        return
      }
    }

    // For single file, open crop dialog
    if (files.length === 1) {
      const file = files[0]
      setCropFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setCropPreview(e.target?.result as string || "")
        setCropOpen(true)
        setImageLoaded(false)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setCroppedAreaPixels(null)
      }
      reader.readAsDataURL(file)
    } else {
      // For multiple files, add directly without cropping
      const newFiles = [...imageFiles, ...files]
      setImageFiles(newFiles)

      const newPreviews = [...imagePreviews]
      files.forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews.push((e.target?.result as string) || "")
          setImagePreviews([...newPreviews])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  const handleCropComplete = (_: any, pixels: any) => {
    setCroppedAreaPixels(pixels)
  }

  const handleCropConfirm = async () => {
    if (!cropFile || !cropPreview || !croppedAreaPixels) {
      toast({ title: "Please crop the image first", variant: "destructive" })
      return
    }

    try {
      const croppedBlob = await getCroppedImg(cropPreview, croppedAreaPixels)
      if (!croppedBlob) {
        throw new Error("Failed to crop image")
      }

      // Create a new file from the cropped blob
      const croppedFile = new File([croppedBlob], cropFile.name, { type: cropFile.type })
      
      // Add to files and previews
      const newFiles = [...imageFiles, croppedFile]
      const newPreviews = [...imagePreviews, cropPreview]
      
      setImageFiles(newFiles)
      setImagePreviews(newPreviews)
      
      // Close crop dialog
      setCropOpen(false)
      setCropFile(null)
      setCropPreview(null)
      setCroppedAreaPixels(null)
      
      toast({ title: "Image cropped and added" })
    } catch (error: any) {
      toast({ title: "Crop failed", description: error.message, variant: "destructive" })
    }
  }

  const handleCropCancel = () => {
    setCropOpen(false)
    setCropFile(null)
    setCropPreview(null)
    setCroppedAreaPixels(null)
  }

  const handleUpload = async () => {
    if (imageFiles.length === 0) {
      toast({ title: "No images selected", variant: "destructive" })
      return
    }

    try {
      setUploading(true)
      toast({ title: "Uploading images..." })

      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error("Auth error:", authError)
        throw new Error("Please sign in to upload images")
      }
      
      console.log("User authenticated:", user.id)

      // Check available buckets first
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
      if (bucketError) {
        console.error("Error listing buckets:", bucketError)
      } else {
        console.log("Available buckets:", buckets?.map(b => ({ name: b.name, public: b.public })))
      }

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const fileName = `${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const storagePath = `tenant/${tenantId}/models/${modelId}/${fileName}`

        console.log("Uploading file:", {
          fileName,
          storagePath,
          fileSize: file.size,
          contentType: file.type
        })

        // Try different bucket names
        let uploadError = null
        let bucketName = "aircraft"
        
        // Try aircraft bucket first
        const { error: aircraftError } = await supabase.storage
          .from("aircraft")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type || "image/jpeg",
          })
        
        if (aircraftError) {
          console.warn("Aircraft bucket failed, trying aircraft-images:", aircraftError)
          bucketName = "aircraft-images"
          const { error: aircraftImagesError } = await supabase.storage
            .from("aircraft-images")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: true,
              contentType: file.type || "image/jpeg",
            })
          uploadError = aircraftImagesError
        } else {
          uploadError = null
        }

        if (uploadError) {
          console.error("Storage upload error:", uploadError)
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }

        // Get public URL
        const { data: publicData } = supabase.storage.from("aircraft").getPublicUrl(storagePath)
        const publicUrl = publicData.publicUrl

        console.log("Saving to database:", {
          tenant_id: tenantId,
          aircraft_model_id: modelId,
          storage_path: storagePath,
          public_url: publicUrl
        })

        // Save to database
        const { error: dbError, data: inserted } = await supabase
          .from("aircraft_model_image")
          .insert({
            tenant_id: tenantId,
            aircraft_model_id: modelId,
            storage_path: storagePath,
            public_url: publicUrl,
            uploaded_by: user.id,
            caption: null,
            is_primary: false,
            display_order: i,
          })
          .select("*")
          .single()

        if (dbError) {
          console.error("Database insert error:", dbError)
          throw new Error(`Database error: ${dbError.message}`)
        }

        setImages((prev) => [...prev, { url: publicUrl, id: inserted.id }])
      }

      toast({ title: "Images uploaded successfully" })
      onImagesUpdated?.()
      setImageFiles([])
      setImagePreviews([])
    } catch (error: any) {
      console.error("Upload failed", error)
      
      let errorMessage = error.message || String(error)
      
      // Handle specific error cases
      if (errorMessage.includes("Please sign in")) {
        errorMessage = "Please refresh the page and sign in again"
      } else if (errorMessage.includes("row-level security policy")) {
        errorMessage = "Permission denied. Please check your access rights."
      } else if (errorMessage.includes("Connection closed")) {
        errorMessage = "Connection lost. Please refresh the page and try again."
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
      // Extract storage path from URL
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
      onImagesUpdated?.()
    } catch (error: any) {
      toast({
        title: "Delete error",
        description: error.message || String(error),
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing Images */}
      {images.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Images</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((img) => (
              <div key={img.id || img.url} className="relative group">
                <img
                  src={img.url}
                  alt="Model"
                  className="w-full h-24 object-cover rounded-md border bg-muted"
                />
                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleDelete(img.url, img.id)}
                    className="bg-red-500 text-white p-1 rounded-full"
                    title="Delete image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Upload New Images</h4>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Select Images
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageChange}
          />
          {imageFiles.length > 0 && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              size="sm"
            >
              {uploading ? (
                <>
                  <UploadCloud className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Upload {imageFiles.length} image(s)
                </>
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Select single image to crop, or multiple images to upload directly. Max 5MB per image.
        </p>
      </div>

      {/* Image Previews */}
      {imagePreviews.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Images</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crop Dialog */}
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="h-5 w-5" />
              Crop Image
            </DialogTitle>
          </DialogHeader>

          {cropPreview && (
            <div className="space-y-4">
              <div className="relative w-full h-[60vh] bg-neutral-900 flex items-center justify-center rounded-md overflow-hidden">
                <Cropper
                  image={cropPreview}
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

              <div className="flex items-center gap-3 px-4">
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

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCropCancel}>
                  Cancel
                </Button>
                <Button onClick={handleCropConfirm} disabled={!imageLoaded}>
                  <Crop className="h-4 w-4 mr-2" />
                  Crop & Add
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
