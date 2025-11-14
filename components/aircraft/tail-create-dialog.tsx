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
import { useOperators } from "@/hooks/use-operators"
import { useAircraftAmenities } from "@/hooks/use-amenities"
import { ModelCreateDialog } from "./model-create-dialog"
import AircraftImageManager from "./aircraft-image-manager"
import { AmenitySelector } from "./amenity-selector"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface TailCreateDialogProps {
  children?: React.ReactNode
  tailId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TailCreateDialog({ children, tailId, open: controlledOpen, onOpenChange }: TailCreateDialogProps) {
  const { models, loading: modelsLoading, refetch: refetchModels } = useAircraftModels()
  const { operators, loading: operatorsLoading, createOperator } = useOperators()
  const { aircraftAmenities, loading: amenitiesLoading } = useAircraftAmenities(tailId || undefined)
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const [modelComboOpen, setModelComboOpen] = useState(false)
  const [operatorComboOpen, setOperatorComboOpen] = useState(false)
  const [createOperatorDialogOpen, setCreateOperatorDialogOpen] = useState(false)
  const [newOperator, setNewOperator] = useState({ name: "", icao_code: "", iata_code: "" })
  const [creatingOperator, setCreatingOperator] = useState(false)
  const [useDefaultCapacity, setUseDefaultCapacity] = useState(true)
  const [useDefaultRange, setUseDefaultRange] = useState(true)
  const [useDefaultSpeed, setUseDefaultSpeed] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [existingTail, setExistingTail] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [defaultTypeRatingId, setDefaultTypeRatingId] = useState<string | null>(null)
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([])
  const [pendingModelId, setPendingModelId] = useState<string | null>(null)

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isEditing = !!tailId

  // Fetch tenant ID and default type rating
  useEffect(() => {
    if (typeof window === "undefined") return
    async function loadTenantAndTypeRating() {
      try {
        // Only run on client side
        if (typeof window === 'undefined') return;
        
        const { getCurrentTenantIdClient } = await import("@/lib/supabase/client-member-helpers");
        const tenantId = await getCurrentTenantIdClient()
        setTenantId(tenantId)
        
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        
        // Get a default type rating (first available)
        if (tenantId) {
          const { data: typeRatings, error } = await supabase
            .from("type_ratings")
            .select("id")
            .limit(1)
          
          if (!error && typeRatings && typeRatings.length > 0) {
            setDefaultTypeRatingId(typeRatings[0].id)
          }
        }
      } catch (err) {
        console.error("Error loading tenant ID:", err)
      }
    }
    loadTenantAndTypeRating()
  }, [])

  // Fetch existing tail data for editing
  useEffect(() => {
    async function loadTail() {
      if (!tailId || !open) return
      try {
        setLoading(true)
        // Only run on client side
        if (typeof window === 'undefined') return;
        
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        
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
    getValues,
    getFieldState,
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


  // Load existing amenities when editing
  useEffect(() => {
    if (isEditing && aircraftAmenities.length > 0) {
      const amenityIds = aircraftAmenities.map(aa => aa.amenity_id)
      setSelectedAmenityIds(amenityIds)
    }
  }, [isEditing, aircraftAmenities])

  const selectedModelId = watch("modelId")
  const selectedModel = selectedModelId ? models.find(m => m.id === selectedModelId) : null
  const tailNumber = watch("tailNumber")

  useEffect(() => {
    if (!pendingModelId) return
    const modelExists = models.find((model) => model.id === pendingModelId)
    if (modelExists) {
      setValue("modelId", pendingModelId, { shouldValidate: true, shouldDirty: true })
      setPendingModelId(null)
      setModelComboOpen(false)
      toast({
        title: "Model selected",
        description: `${modelExists.name} has been added to this tail.`,
      })
    }
  }, [pendingModelId, models, setValue, toast])

  useEffect(() => {
    if (open && existingTail) {
      reset({
        modelId: existingTail.model_id,
        tailNumber: existingTail.tail_number,
        operator: existingTail.operator_id || "",
        year: existingTail.year_of_manufacture,
        yearOfRefurbishment: existingTail.year_of_refurbish || undefined,
        status: existingTail.status?.toLowerCase() || "active",
        capacityOverride: existingTail.capacity_pax || undefined,
        rangeNmOverride: existingTail.range_nm || undefined,
        speedKnotsOverride: existingTail.cruising_speed || undefined,
        images: [],
      })
      setUseDefaultCapacity(existingTail.capacity_pax === null)
      setUseDefaultRange(existingTail.range_nm === null)
      setUseDefaultSpeed(existingTail.cruising_speed === null)
    } else if (open && !existingTail) {
      reset({
        modelId: "",
        tailNumber: "",
        operator: "",
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

  // Validate tail number uniqueness
  const validateTailNumber = async (tailNumber: string, excludeId?: string) => {
    if (!tenantId) return false
    
    try {
      // Only run on client side
      if (typeof window === 'undefined') return false;
      
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      let query = supabase
        .from("aircraft")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("tail_number", tailNumber)
      
      if (excludeId) {
        query = query.neq("id", excludeId)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      return data.length === 0
    } catch (error) {
      console.error("Error validating tail number:", error)
      return false
    }
  }

  const onSubmit = async (data: TailFormData) => {
    try {
      
      if (!tenantId) {
        console.error("❌ No tenant ID found")
        toast({
          title: "Error",
          description: "Tenant ID not found. Please refresh and try again.",
          variant: "destructive",
        })
        return
      }

      // Validate tail number uniqueness
      const isTailNumberValid = await validateTailNumber(data.tailNumber, existingTail?.id)
      if (!isTailNumberValid) {
        toast({
          title: "Tail number already exists",
          description: "Please choose a different tail number.",
          variant: "destructive",
        })
        return
      }

      const aircraftData = {
        tenant_id: tenantId,
        tail_number: data.tailNumber,
        model_id: data.modelId,
        operator_id: data.operator || null,
        type_rating_id: defaultTypeRatingId, // Required field
        year_of_manufacture: data.year || null,
        year_of_refurbish: data.yearOfRefurbishment || null,
        status: data.status.toUpperCase(), // Convert to uppercase to match enum
        capacity_pax: useDefaultCapacity ? null : data.capacityOverride || null,
        range_nm: useDefaultRange ? null : data.rangeNmOverride || null,
        notes: null, // Notes field is now handled separately from amenities
        cruising_speed: useDefaultSpeed ? null : data.speedKnotsOverride || null,
      }

      // Only run on client side
      if (typeof window === 'undefined') return;
      
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      let createdTailId: string | undefined = undefined;

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
        createdTailId = existingTail.id
      } else {
        const { data: newTail, error } = await supabase
          .from("aircraft")
          .insert(aircraftData)
          .select()
          .single()

        if (error) throw error

        toast({
          title: "Tail created",
          description: "The aircraft tail has been created successfully.",
        })

        // Set the new tail data to allow image management
        setExistingTail(newTail)
        createdTailId = newTail.id
        
        // Dispatch custom event to trigger data refresh in parent components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aircraft-data-updated'))
        }
        
        // Update amenities for the new aircraft before returning
        if (selectedAmenityIds.length > 0 && createdTailId) {
          try {
            const amenitiesResponse = await fetch(`/api/aircraft/${createdTailId}/amenities`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                amenityIds: selectedAmenityIds
              })
            })

            if (!amenitiesResponse.ok) {
              console.warn("Failed to update amenities, but aircraft was saved successfully")
            }
          } catch (amenitiesError) {
            console.warn("Error updating amenities:", amenitiesError)
          }
        }
        
        // Don't close the dialog, allow user to add images
        return
      }

      // Update amenities for the aircraft (when editing)
      if (selectedAmenityIds.length > 0 && createdTailId) {
        try {
          const amenitiesResponse = await fetch(`/api/aircraft/${createdTailId}/amenities`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amenityIds: selectedAmenityIds
            })
          })

          if (!amenitiesResponse.ok) {
            console.warn("Failed to update amenities, but aircraft was saved successfully")
          }
        } catch (amenitiesError) {
          console.warn("Error updating amenities:", amenitiesError)
        }
      }

      // Close the dialog after successful update
      setOpen(false)
      
      // Dispatch custom event to trigger data refresh in parent components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aircraft-data-updated'))
      }
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

  const handleOperatorSelect = (operatorId: string) => {
    setValue("operator", operatorId)
    setOperatorComboOpen(false)
  }

  const handleCreateOperator = async () => {
    if (!newOperator.name.trim()) {
      toast({ title: "Operator name is required", variant: "destructive" })
      return
    }

    setCreatingOperator(true)
    try {
      const result = await createOperator({
        name: newOperator.name.trim(),
        icao_code: newOperator.icao_code.trim() || null,
        iata_code: newOperator.iata_code.trim() || null,
      })

      if (result.success && result.data) {
        toast({ title: "Operator created", description: `${result.data.name} has been added.` })
        
        // Close the create dialog first
        setCreateOperatorDialogOpen(false)
        setNewOperator({ name: "", icao_code: "", iata_code: "" })
        
        // Wait for React to process state updates, then set the value and re-open combobox
        // This ensures the operators list has been refreshed in the component
        setTimeout(() => {
          setValue("operator", result.data.id, { shouldValidate: true, shouldDirty: true })
          // Re-open the combobox to show the newly created item is selected
          setOperatorComboOpen(true)
        }, 150)
      } else {
        toast({ title: "Error", description: result.error || "Failed to create operator", variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create operator", variant: "destructive" })
    } finally {
      setCreatingOperator(false)
    }
  }

  const activeModels = models.filter((model) => !model.isArchived)

  return (
    <>
      {/* Create Operator Dialog */}
      <Dialog open={createOperatorDialogOpen} onOpenChange={setCreateOperatorDialogOpen}>
        <DialogContent className="max-w-full md:max-w-md overflow-y-auto max-h-[100vh]">
          <DialogHeader>
            <DialogTitle>Create Operator</DialogTitle>
            <DialogDescription>Add a new operator to your fleet</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="operator-name">Name *</Label>
              <Input
                id="operator-name"
                value={newOperator.name}
                onChange={(e) => setNewOperator({ ...newOperator, name: e.target.value })}
                placeholder="e.g., NetJets"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newOperator.name.trim()) {
                    e.preventDefault()
                    handleCreateOperator()
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="operator-icao">ICAO Code</Label>
                <Input
                  id="operator-icao"
                  value={newOperator.icao_code}
                  onChange={(e) => setNewOperator({ ...newOperator, icao_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., NJA"
                  maxLength={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="operator-iata">IATA Code</Label>
                <Input
                  id="operator-iata"
                  value={newOperator.iata_code}
                  onChange={(e) => setNewOperator({ ...newOperator, iata_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., 1I"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOperatorDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOperator} disabled={creatingOperator || !newOperator.name.trim()}>
              {creatingOperator ? "Creating..." : "Create Operator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-full md:max-w-[65rem] overflow-y-auto max-h-[100vh]">
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
              <ModelCreateDialog
                onCreated={async (modelId: string) => {
                  setPendingModelId(modelId)
                  await refetchModels()
                }}
              >
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
                <Popover open={modelComboOpen} onOpenChange={setModelComboOpen} modal={true}>
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
                <Controller
                  name="operator"
                  control={control}
                  render={({ field }) => (
                    <Popover open={operatorComboOpen} onOpenChange={setOperatorComboOpen} modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={operatorComboOpen}
                          className="w-full justify-between bg-transparent"
                        >
                          {field.value ? operators.find((op) => op.id === field.value)?.name : "Select operator..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search operators..." />
                          <CommandList>
                            <CommandEmpty>
                              <div className="py-2 text-center text-sm">
                                <p className="mb-2">No operators found.</p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setOperatorComboOpen(false)
                                    setCreateOperatorDialogOpen(true)
                                  }}
                                  className="h-8"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Create Operator
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              <CommandItem value="" onSelect={() => handleOperatorSelect("")}>
                                <Check
                                  className={cn("mr-2 h-4 w-4", field.value === "" ? "opacity-100" : "opacity-0")}
                                />
                                <span>No operator</span>
                              </CommandItem>
                              {operators.map((operator) => (
                                <CommandItem key={operator.id} value={operator.name} onSelect={() => handleOperatorSelect(operator.id)}>
                                  <Check
                                    className={cn("mr-2 h-4 w-4", field.value === operator.id ? "opacity-100" : "opacity-0")}
                                  />
                                  <div className="flex flex-col">
                                    <span>{operator.name}</span>
                                    {(operator.icao_code || operator.iata_code) && (
                                      <span className="text-sm text-muted-foreground">
                                        {operator.icao_code && operator.iata_code 
                                          ? `${operator.icao_code} / ${operator.iata_code}`
                                          : operator.icao_code || operator.iata_code
                                        }
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                              <CommandItem
                                value="__create_operator__"
                                onSelect={() => {
                                  setOperatorComboOpen(false)
                                  setCreateOperatorDialogOpen(true)
                                }}
                                className="text-primary border-t"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Create new operator...</span>
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 5}
                  {...register("year", { 
                    valueAsNumber: true,
                    setValueAs: (value) => isNaN(value) ? undefined : value
                  })}
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
                  {...register("yearOfRefurbishment", { 
                    valueAsNumber: true,
                    setValueAs: (value) => isNaN(value) ? undefined : value
                  })}
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
                    {...register("capacityOverride", { 
                      valueAsNumber: true,
                      setValueAs: (value) => isNaN(value) ? undefined : value
                    })}
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
                    {...register("rangeNmOverride", { 
                      valueAsNumber: true,
                      setValueAs: (value) => isNaN(value) ? undefined : value
                    })}
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
                    {...register("speedKnotsOverride", { 
                      valueAsNumber: true,
                      setValueAs: (value) => isNaN(value) ? undefined : value
                    })}
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

          {/* Amenities Section */}
          <div className="mt-8 border-t pt-6">
            <AmenitySelector
              selectedAmenityIds={selectedAmenityIds}
              onSelectionChange={setSelectedAmenityIds}
              disabled={isSubmitting}
            />
          </div>

          {/* Image Management Section */}
          {tenantId && (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Aircraft Images</h3>
              {isEditing && existingTail && tenantId ? (
                <AircraftImageManager 
                  aircraftId={existingTail.id} 
                  tenantId={tenantId} 
                  onImagesUpdated={async () => {
                    // Refresh the existing tail data after image upload
                    if (tailId) {
                      try {
                        console.log("🔄 Refreshing tail data after image upload...")
                        // Only run on client side
                        if (typeof window === 'undefined') return;
                        
                        const { createClient } = await import("@/lib/supabase/client");
                        const supabase = createClient();
                        
                        const { data, error } = await supabase
                          .from("aircraft")
                          .select("*")
                          .eq("id", tailId)
                          .single()
                        
                        if (error) {
                          return
                        }
                        
                        setExistingTail(data)
                        
                        // Update the form with the refreshed data
                        reset({
                          modelId: data.model_id,
                          tailNumber: data.tail_number,
                          operator: data.operator_id || "",
                          year: data.year_of_manufacture,
                          yearOfRefurbishment: data.year_of_refurbish || undefined,
                          status: data.status?.toLowerCase() || "active",
                          capacityOverride: data.capacity_pax || undefined,
                          rangeNmOverride: data.range_nm || undefined,
                          speedKnotsOverride: data.cruising_speed || undefined,
                          images: [],
                        })
                        
                      } catch (error) {
                      }
                    }
                  }}
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {!isEditing ? "Save the aircraft first to manage images." : "Loading..."}
                  </p>
                  {!tenantId && (
                    <p className="text-sm text-destructive">
                      Unable to load tenant information. Please refresh the page.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || loading || modelsLoading || operatorsLoading || !defaultTypeRatingId}
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Tail" : "Create Tail"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
