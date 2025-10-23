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
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { TailFormSchema, type TailFormData } from "@/lib/schemas/aircraft"
import { useToast } from "@/hooks/use-toast"
import { useAircraftModels } from "@/hooks/use-aircraft-models"
import { ModelCreateDialog } from "./model-create-dialog"
import AircraftImageManager from "./aircraft-image-manager"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"

interface TailCreateDialogProps {
  children: React.ReactNode
  tailId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TailCreateDialog({ children, tailId, open: controlledOpen, onOpenChange }: TailCreateDialogProps) {
  const { models, loading: modelsLoading } = useAircraftModels()
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const [modelComboOpen, setModelComboOpen] = useState(false)
  const [useDefaultCapacity, setUseDefaultCapacity] = useState(true)
  const [useDefaultRange, setUseDefaultRange] = useState(true)
  const [useDefaultSpeed, setUseDefaultSpeed] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [existingTail, setExistingTail] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isEditing = !!tailId

  // Fetch tenant ID
  useEffect(() => {
    if (typeof window === "undefined") return
    async function loadTenant() {
      try {
        const { data } = await supabase.auth.getUser()
        const tenantId = data?.user?.app_metadata?.tenant_id ?? null
        setTenantId(tenantId)
      } catch (err) {
        console.error("Error loading tenant ID:", err)
      }
    }
    loadTenant()
  }, [])

  // Fetch existing tail data for editing
  useEffect(() => {
    async function loadTail() {
      if (!tailId || !open) return
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("aircraft")
          .select("*")
          .eq("id", tailId)
          .single()
        
        if (error) throw error
        setExistingTail(data)
      } catch (err) {
        console.error("Error loading tail:", err)
        toast({ title: "Error", description: "Failed to load aircraft tail.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    if (open && tailId) {
      loadTail()
    } else {
      setExistingTail(null)
    }
  }, [open, tailId, toast])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TailFormData>({
    resolver: zodResolver(TailFormSchema),
    defaultValues: {
      modelId: "",
      tailNumber: "",
      operator: "",
      amenities: "",
      year: undefined,
      yearOfRefurbishment: undefined,
      status: "active",
      capacityOverride: undefined,
      rangeNmOverride: undefined,
      speedKnotsOverride: undefined,
      images: [],
    },
  })

  const selectedModelId = watch("modelId")
  const selectedModel = selectedModelId ? models.find(m => m.id === selectedModelId) : null
  const tailNumber = watch("tailNumber")

  useEffect(() => {
    if (open && existingTail) {
      reset({
        modelId: existingTail.model_id,
        tailNumber: existingTail.tail_number,
        operator: existingTail.operator_id || "",
        amenities: existingTail.notes || "",
        year: existingTail.year_of_manufacture,
        yearOfRefurbishment: existingTail.year_of_refurbish,
        status: existingTail.status,
        capacityOverride: existingTail.capacity_pax,
        rangeNmOverride: existingTail.range_nm,
        speedKnotsOverride: null, // Not stored in database yet
        images: [],
      })
      setUseDefaultCapacity(existingTail.capacity_pax === null)
      setUseDefaultRange(existingTail.range_nm === null)
      setUseDefaultSpeed(true) // Always use default for now
    } else if (open && !existingTail) {
      reset({
        modelId: "",
        tailNumber: "",
        operator: "",
        amenities: "",
        year: undefined,
        yearOfRefurbishment: undefined,
        status: "active",
        capacityOverride: undefined,
        rangeNmOverride: undefined,
        speedKnotsOverride: undefined,
        images: [],
      })
      setUseDefaultCapacity(true)
      setUseDefaultRange(true)
      setUseDefaultSpeed(true)
    }
  }, [open, existingTail, reset])

  useEffect(() => {
    if (useDefaultCapacity) {
      setValue("capacityOverride", undefined)
    }
  }, [useDefaultCapacity, setValue])

  useEffect(() => {
    if (useDefaultRange) {
      setValue("rangeNmOverride", undefined)
    }
  }, [useDefaultRange, setValue])

  useEffect(() => {
    if (useDefaultSpeed) {
      setValue("speedKnotsOverride", undefined)
    }
  }, [useDefaultSpeed, setValue])

  const onSubmit = async (data: TailFormData) => {
    try {
      if (!tenantId) {
        toast({
          title: "Error",
          description: "Tenant ID not found. Please refresh and try again.",
          variant: "destructive",
        })
        return
      }

      const aircraftData = {
        tenant_id: tenantId,
        tail_number: data.tailNumber,
        model_id: data.modelId,
        operator_id: data.operator || null,
        year_of_manufacture: data.year || null,
        year_of_refurbish: data.yearOfRefurbishment || null,
        status: data.status,
        capacity_pax: useDefaultCapacity ? null : data.capacityOverride || null,
        range_nm: useDefaultRange ? null : data.rangeNmOverride || null,
        notes: data.amenities || null,
      }

      if (isEditing && existingTail) {
        const { error } = await supabase
          .from("aircraft")
          .update(aircraftData)
          .eq("id", existingTail.id)

        if (error) throw error

        toast({
          title: "Tail updated",
          description: "The aircraft tail has been updated successfully.",
        })
      } else {
        const { error } = await supabase
          .from("aircraft")
          .insert(aircraftData)

        if (error) throw error

        toast({
          title: "Tail created",
          description: "The aircraft tail has been created successfully.",
        })
      }

      setOpen(false)
    } catch (error: any) {
      console.error("Error in form submission:", error)
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleModelSelect = (modelId: string) => {
    setValue("modelId", modelId)
    setModelComboOpen(false)
  }

  const activeModels = models.filter((model) => !model.isArchived)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Aircraft Tail" : "Create Aircraft Tail"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the aircraft tail details below."
              : "Add a new aircraft tail with specific tail number and optional overrides."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Step 1: Select Aircraft Model</Label>
              <ModelCreateDialog>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Quick Add Model
                </Button>
              </ModelCreateDialog>
            </div>

            <Controller
              name="modelId"
              control={control}
              render={({ field }) => (
                <Popover open={modelComboOpen} onOpenChange={setModelComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={modelComboOpen}
                      className="w-full justify-between bg-transparent"
                    >
                      {field.value ? activeModels.find((model) => model.id === field.value)?.name : "Select model..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search models..." />
                      <CommandList>
                        <CommandEmpty>No models found.</CommandEmpty>
                        <CommandGroup>
                          {activeModels.map((model) => (
                            <CommandItem key={model.id} value={model.name} onSelect={() => handleModelSelect(model.id)}>
                              <Check
                                className={cn("mr-2 h-4 w-4", field.value === model.id ? "opacity-100" : "opacity-0")}
                              />
                              <div className="flex flex-col">
                                <span>{model.name}</span>
                                {model.manufacturer && (
                                  <span className="text-sm text-muted-foreground">{model.manufacturer}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.modelId && <p className="text-sm text-destructive">{errors.modelId.message}</p>}
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-semibold">Basic Information</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tailNumber">Tail Number *</Label>
                <Input id="tailNumber" {...register("tailNumber")} placeholder="e.g., N123AB" />
                {errors.tailNumber && <p className="text-sm text-destructive">{errors.tailNumber.message}</p>}
                {tailNumber && !validateTailNumber(tailNumber, existingTail?.id) && (
                  <p className="text-sm text-destructive">This tail number is already in use</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="operator">Operator</Label>
                <Input id="operator" {...register("operator")} placeholder="e.g., ABC Aviation" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amenities">Amenities</Label>
              <Input
                id="amenities"
                {...register("amenities")}
                placeholder="e.g., WiFi, Entertainment System, Refreshment Center"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 5}
                  {...register("year", { valueAsNumber: true })}
                  placeholder="2020"
                />
                {errors.year && <p className="text-sm text-destructive">{errors.year.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearOfRefurbishment">Year of Refurbishment</Label>
                <Input
                  id="yearOfRefurbishment"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 5}
                  {...register("yearOfRefurbishment", { valueAsNumber: true })}
                  placeholder="2022"
                />
                {errors.yearOfRefurbishment && (
                  <p className="text-sm text-destructive">{errors.yearOfRefurbishment.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-semibold">Specification Overrides</Label>
            <p className="text-sm text-muted-foreground">
              Override model defaults for this specific aircraft. Leave unchecked to use model defaults.
            </p>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useDefaultCapacity"
                  checked={useDefaultCapacity}
                  onCheckedChange={setUseDefaultCapacity}
                />
                <Label htmlFor="useDefaultCapacity" className="text-sm">
                  Use model default capacity
                  {selectedModel?.defaultCapacity && (
                    <span className="text-muted-foreground ml-1">({selectedModel.defaultCapacity})</span>
                  )}
                </Label>
              </div>
              {!useDefaultCapacity && (
                <div className="ml-6">
                  <Input
                    type="number"
                    min="1"
                    {...register("capacityOverride", { valueAsNumber: true })}
                    placeholder={selectedModel?.defaultCapacity?.toString() || "8"}
                  />
                  {selectedModel?.defaultCapacity && (
                    <p className="text-xs text-muted-foreground mt-1">Model default: {selectedModel.defaultCapacity}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="useDefaultRange" checked={useDefaultRange} onCheckedChange={setUseDefaultRange} />
                <Label htmlFor="useDefaultRange" className="text-sm">
                  Use model default range
                  {selectedModel?.defaultRangeNm && (
                    <span className="text-muted-foreground ml-1">({selectedModel.defaultRangeNm} nm)</span>
                  )}
                </Label>
              </div>
              {!useDefaultRange && (
                <div className="ml-6">
                  <Input
                    type="number"
                    min="1"
                    {...register("rangeNmOverride", { valueAsNumber: true })}
                    placeholder={selectedModel?.defaultRangeNm?.toString() || "2000"}
                  />
                  {selectedModel?.defaultRangeNm && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Model default: {selectedModel.defaultRangeNm} nm
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="useDefaultSpeed" checked={useDefaultSpeed} onCheckedChange={setUseDefaultSpeed} />
                <Label htmlFor="useDefaultSpeed" className="text-sm">
                  Use model default speed
                  {selectedModel?.defaultSpeedKnots && (
                    <span className="text-muted-foreground ml-1">({selectedModel.defaultSpeedKnots} knots)</span>
                  )}
                </Label>
              </div>
              {!useDefaultSpeed && (
                <div className="ml-6">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    {...register("speedKnotsOverride", { valueAsNumber: true })}
                    placeholder={selectedModel?.defaultSpeedKnots?.toString() || "450"}
                  />
                  {selectedModel?.defaultSpeedKnots && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Model default: {selectedModel.defaultSpeedKnots} knots
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Image Management Section */}
          {tenantId && (isEditing ? existingTail : true) && (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Aircraft Images</h3>
              {isEditing && existingTail ? (
                <AircraftImageManager 
                  aircraftId={existingTail.id} 
                  tenantId={tenantId} 
                  onImagesUpdated={() => {
                    // Refresh the existing tail data
                    if (tailId) {
                      // Trigger a refresh of the tail data
                      setExistingTail(null)
                      setTimeout(() => {
                        // This will trigger the useEffect to reload the tail
                      }, 100)
                    }
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Save the aircraft first to manage images.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loading || modelsLoading}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Tail" : "Create Tail"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
