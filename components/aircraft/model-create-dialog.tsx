"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { ModelFormSchema, type ModelFormData } from "@/lib/schemas/aircraft"
import { insertModel } from "@/lib/supabase/queries/models"
import ModelImageManager from "@/components/aircraft/model-image-manager"
import type { AircraftModelRecord } from "@/lib/types"

interface ModelCreateDialogProps {
  children?: React.ReactNode
  onCreated?: () => Promise<void> | void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ModelCreateDialog({
  children,
  onCreated,
  open: controlledOpen,
  onOpenChange,
}: ModelCreateDialogProps) {
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [createdModel, setCreatedModel] = useState<AircraftModelRecord | null>(null)
  const [loading, setLoading] = useState(false)

  // 🔹 Fetch tenant ID on client only
  useEffect(() => {
    if (typeof window === "undefined") return
    async function loadTenant() {
      try {
        const { data } = await supabase.auth.getUser()
        setTenantId(data?.user?.app_metadata?.tenant_id ?? null)
      } catch (err) {
        console.error("Error fetching tenant ID:", err)
      }
    }
    loadTenant()
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ModelFormData>({
    resolver: zodResolver(ModelFormSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      manufacturer: "",
      defaultCapacity: undefined,
      defaultRangeNm: undefined,
      defaultSpeedKnots: undefined,
    },
  })

  const categoryId = watch("categoryId")

  const handleCreate = async (data: ModelFormData) => {
    try {
      if (!tenantId) throw new Error("Tenant ID not found.")
      setLoading(true)
      const created = await insertModel({ ...data, tenant_id: tenantId })
      setCreatedModel(created)
      toast({ title: "Model created", description: "Now add images for this model." })
      await onCreated?.()
    } catch (err: any) {
      toast({ title: "Error creating model", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setCreatedModel(null)
      reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {createdModel ? "Upload Images" : "Create Aircraft Model"}
          </DialogTitle>
          <DialogDescription>
            {createdModel
              ? `Upload and manage images for ${createdModel.name}`
              : "Add a new aircraft model to your catalog."}
          </DialogDescription>
        </DialogHeader>

        {/* --- STEP 1: Basic form --- */}
        {!createdModel && (
          <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Model Name *</Label>
                <Input id="name" {...register("name")} placeholder="Phenom 300E" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="categoryId">Category *</Label>
                <Select value={categoryId} onValueChange={(v) => setValue("categoryId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light-jet">Light Jet</SelectItem>
                    <SelectItem value="midsize">Midsize</SelectItem>
                    <SelectItem value="heavy-jet">Heavy Jet</SelectItem>
                  </SelectContent>
                </Select>
                {errors.categoryId && (
                  <p className="text-sm text-destructive">{errors.categoryId.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input id="manufacturer" {...register("manufacturer")} placeholder="Embraer" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defaultCapacity">Default Capacity</Label>
                <Input
                  id="defaultCapacity"
                  type="number"
                  min="1"
                  {...register("defaultCapacity", { 
                    valueAsNumber: true,
                    setValueAs: (value) => isNaN(value) ? undefined : value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="defaultRangeNm">Range (nm)</Label>
                <Input
                  id="defaultRangeNm"
                  type="number"
                  min="1"
                  {...register("defaultRangeNm", { 
                    valueAsNumber: true,
                    setValueAs: (value) => isNaN(value) ? undefined : value
                  })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="defaultSpeedKnots">Speed (knots)</Label>
              <Input
                id="defaultSpeedKnots"
                type="number"
                min="1"
                {...register("defaultSpeedKnots", { 
                  valueAsNumber: true,
                  setValueAs: (value) => isNaN(value) ? undefined : value
                })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loading}>
                {loading ? "Creating..." : "Create Model"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* --- STEP 2: Image upload --- */}
        {createdModel && tenantId && (
          <div className="mt-6 border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold">Upload Images</h3>
            <ModelImageManager modelId={createdModel.id} tenantId={tenantId} />

            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
