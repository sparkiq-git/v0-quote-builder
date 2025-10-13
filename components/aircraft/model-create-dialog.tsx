"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ModelFormSchema, type ModelFormData } from "@/lib/schemas/aircraft"
import { useMockStore } from "@/lib/mock/store"
import { useToast } from "@/hooks/use-toast"
import type { AircraftModel } from "@/lib/types"
import { Plus, X } from "lucide-react"

interface ModelCreateDialogProps {
  children?: React.ReactNode
  modelId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ModelCreateDialog({ children, modelId, open: controlledOpen, onOpenChange }: ModelCreateDialogProps) {
  const { state, dispatch, getModelById, getCategoryById } = useMockStore()
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const [images, setImages] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")
  const isEditing = !!modelId
  const existingModel = modelId ? getModelById(modelId) : null

  useEffect(() => {
    console.log("[v0] Dialog state changed:", { open, isEditing, modelId, existingModel: !!existingModel })
  }, [open, isEditing, modelId, existingModel])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ModelFormData>({
    resolver: zodResolver(ModelFormSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      manufacturer: "",
      defaultCapacity: undefined,
      defaultRangeNm: undefined,
      defaultSpeedKnots: undefined,
      images: [],
    },
  })

  const selectedCategoryId = watch("categoryId")

  useEffect(() => {
    if (open && existingModel) {
      const modelImages = existingModel.images || []
      setImages(modelImages)
      reset({
        name: existingModel.name,
        categoryId: existingModel.categoryId,
        manufacturer: existingModel.manufacturer || "",
        defaultCapacity: existingModel.defaultCapacity,
        defaultRangeNm: existingModel.defaultRangeNm,
        defaultSpeedKnots: existingModel.defaultSpeedKnots,
        images: modelImages,
      })
    } else if (open && !existingModel) {
      setImages([])
      setNewImageUrl("")
      reset({
        name: "",
        categoryId: "",
        manufacturer: "",
        defaultCapacity: undefined,
        defaultRangeNm: undefined,
        defaultSpeedKnots: undefined,
        images: [],
      })
    }
  }, [open, existingModel, reset, state.categories])

  useEffect(() => {
    setValue("images", images)
  }, [images, setValue])

  const addImage = () => {
    if (newImageUrl.trim() && !images.includes(newImageUrl.trim())) {
      const updatedImages = [...images, newImageUrl.trim()]
      setImages(updatedImages)
      setNewImageUrl("")
    }
  }

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index)
    setImages(updatedImages)
  }

  const handleImageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addImage()
    }
  }

  const onSubmit = async (data: ModelFormData) => {
    try {
      console.log("[v0] Form submission started", { isEditing, data, images })

      console.log("[v0] Form validation data:", {
        name: data.name,
        categoryId: data.categoryId,
        images: data.images,
        imagesState: images,
        errors: errors,
      })

      if (isEditing && existingModel) {
        console.log("[v0] Updating existing model", { modelId: existingModel.id, updates: data })
        dispatch({
          type: "UPDATE_MODEL",
          payload: {
            id: existingModel.id,
            updates: {
              ...data,
              defaultCapacity: data.defaultCapacity || undefined,
              defaultRangeNm: data.defaultRangeNm || undefined,
              defaultSpeedKnots: data.defaultSpeedKnots || undefined,
              images: images,
            },
          },
        })
        console.log("[v0] Model update dispatched successfully")
        toast({
          title: "Model updated",
          description: "The aircraft model has been updated successfully.",
        })
      } else {
        console.log("[v0] Creating new model", { data })
        const newModel: AircraftModel = {
          id: `model-${Date.now()}`,
          ...data,
          defaultCapacity: data.defaultCapacity || undefined,
          defaultRangeNm: data.defaultRangeNm || undefined,
          defaultSpeedKnots: data.defaultSpeedKnots || undefined,
          images: images,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        dispatch({ type: "ADD_MODEL", payload: newModel })
        console.log("[v0] Model creation dispatched successfully")
        toast({
          title: "Model created",
          description: "The aircraft model has been created successfully.",
        })
      }
      console.log("[v0] Closing dialog")
      setOpen(false)
    } catch (error) {
      console.error("[v0] Error in form submission:", error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Aircraft Model" : "Create Aircraft Model"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the aircraft model details below."
              : "Add a new aircraft model to your catalog with default specifications."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Model Name *</Label>
              <Input id="name" {...register("name")} placeholder="e.g., Phenom 300E" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category *</Label>
              <Select value={selectedCategoryId} onValueChange={(value) => setValue("categoryId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(state.categories || []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input id="manufacturer" {...register("manufacturer")} placeholder="e.g., Embraer" />
          </div>

          <div className="space-y-2">
            <Label>Aircraft Images *</Label>
            <div className="flex gap-2">
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyPress={handleImageKeyPress}
                placeholder="Enter image URL"
                className="flex-1"
              />
              <Button type="button" onClick={addImage} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((image, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    <span className="max-w-[200px] truncate">Image {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            {errors.images && <p className="text-sm text-destructive">{errors.images.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultCapacity">Default Capacity</Label>
              <Input
                id="defaultCapacity"
                type="number"
                min="1"
                {...register("defaultCapacity", { valueAsNumber: true })}
                placeholder="8"
              />
              {errors.defaultCapacity && <p className="text-sm text-destructive">{errors.defaultCapacity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultRangeNm">Range (nm)</Label>
              <Input
                id="defaultRangeNm"
                type="number"
                min="1"
                {...register("defaultRangeNm", { valueAsNumber: true })}
                placeholder="2010"
              />
              {errors.defaultRangeNm && <p className="text-sm text-destructive">{errors.defaultRangeNm.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultSpeedKnots">Speed (knots)</Label>
            <Input
              id="defaultSpeedKnots"
              type="number"
              min="1"
              {...register("defaultSpeedKnots", { valueAsNumber: true })}
              placeholder="450"
            />
            {errors.defaultSpeedKnots && <p className="text-sm text-destructive">{errors.defaultSpeedKnots.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Model" : "Create Model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
