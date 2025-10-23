"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ImagePlus, Trash2, UploadCloud, X, Crop } from "lucide-react"
import Cropper from "react-easy-crop"
import Slider from "@mui/material/Slider"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { getCroppedImg } from "@/lib/utils/crop"

interface AircraftImageManagerProps {
  aircraftId: string
  tenantId: string
  onImagesUpdated?: () => void
}

export default function AircraftImageManager({ aircraftId, tenantId, onImagesUpdated }: AircraftImageManagerProps) {
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
        .from("aircraft_image")
        .select("id, public_url")
        .eq("aircraft_id", aircraftId)
        .eq("tenant_id", tenantId)
        .order("display_order", { ascending: true })
      if (!error && data) setImages(data.map((i) => ({ url: i.public_url, id: i.id })))
    }
    fetchImages()
  }, [aircraftId, tenantId])

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
    if (!cropFile || !croppedAreaPixels) return

    try {
      const croppedImage = await getCroppedImg(cropPreview!, croppedAreaPixels, 0)
      const file = new File([croppedImage], cropFile.name, { type: cropFile.type })
      
      setImageFiles([...imageFiles, file])
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews([...imagePreviews, (e.target?.result as string) || ""])
      }
      reader.readAsDataURL(file)
      
      setCropOpen(false)
      setCropFile(null)
      setCropPreview(null)
    } catch (error) {
      toast({ title: "Crop failed", description: "Failed to crop image", variant: "destructive" })
    }
  }

  const uploadImages = async () => {
    if (imageFiles.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = imageFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${aircraftId}-${Date.now()}-${index}.${fileExt}`
        const filePath = `tenant/${tenantId}/aircraft/${aircraftId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('aircraft-images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('aircraft-images')
          .getPublicUrl(filePath)

        return {
          aircraft_id: aircraftId,
          tenant_id: tenantId,
          storage_path: filePath,
          public_url: publicUrl,
          is_primary: index === 0,
          display_order: index,
        }
      })

      const imageData = await Promise.all(uploadPromises)

      const { error: insertError } = await supabase
        .from('aircraft_image')
        .insert(imageData)

      if (insertError) throw insertError

      toast({ title: "Success", description: `${imageFiles.length} image(s) uploaded successfully` })
      setImageFiles([])
      setImagePreviews([])
      onImagesUpdated?.()
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('aircraft_image')
        .delete()
        .eq('id', imageId)

      if (error) throw error

      toast({ title: "Image deleted", description: "Image removed successfully" })
      onImagesUpdated?.()
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <Button
          onClick={() => inputRef.current?.click()}
          variant="outline"
          className="mb-2"
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          Add Images
        </Button>
        <p className="text-sm text-gray-500">Click to select images or drag and drop</p>
      </div>

      {/* Preview Images */}
      {imagePreviews.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">New Images</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={uploadImages} disabled={uploading} className="w-full">
            <UploadCloud className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : `Upload ${imageFiles.length} Image(s)`}
          </Button>
        </div>
      )}

      {/* Existing Images */}
      {images.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Current Images</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {images.map((image, index) => (
              <div key={image.id || index} className="relative">
                <img
                  src={image.url}
                  alt={`Aircraft image ${index + 1}`}
                  className="w-full h-24 object-cover rounded"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => image.id && deleteImage(image.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crop Dialog */}
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>Adjust the crop area and zoom level</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative h-64 bg-gray-100">
              {cropPreview && (
                <Cropper
                  image={cropPreview}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 9}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                  onImageLoaded={() => setImageLoaded(true)}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Zoom: {Math.round(zoom * 100)}%</label>
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(_, value) => setZoom(value as number)}
                className="w-full"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCropOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCropConfirm} disabled={!imageLoaded}>
                <Crop className="mr-2 h-4 w-4" />
                Crop & Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
