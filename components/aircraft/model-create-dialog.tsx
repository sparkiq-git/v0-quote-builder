"use client"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { ModelFormSchema, type ModelFormData } from "@/lib/schemas/aircraft"
import { insertModel } from "@/lib/supabase/queries/models"
import ModelImageManager from "@/components/aircraft/model-image-manager"
import type { AircraftModelRecord } from "@/lib/types"
import { useAircraftSizes } from "@/hooks/use-aircraft-sizes"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const { sizes, loading: sizesLoading, createSize } = useAircraftSizes()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [createdModel, setCreatedModel] = useState<AircraftModelRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [sizeComboOpen, setSizeComboOpen] = useState(false)
  const [createSizeDialogOpen, setCreateSizeDialogOpen] = useState(false)
  const [newSize, setNewSize] = useState({ code: "", display_name: "", description: "", size: "" })
  const [creatingSize, setCreatingSize] = useState(false)

  // 🔹 Fetch tenant ID on client only
  useEffect(() => {
    if (typeof window === "undefined") return
    async function loadTenant() {
      try {
        // Only run on client side
        if (typeof window === 'undefined') return;
        
        const { getCurrentTenantIdClient } = await import("@/lib/supabase/client-member-helpers");
        const tenantId = await getCurrentTenantIdClient()
        setTenantId(tenantId)
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
    control,
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

  const handleSizeSelect = (sizeCode: string) => {
    setValue("categoryId", sizeCode)
    setSizeComboOpen(false)
  }

  const handleCreateSize = async () => {
    if (!newSize.code.trim() || !newSize.display_name.trim()) {
      toast({ title: "Code and display name are required", variant: "destructive" })
      return
    }

    setCreatingSize(true)
    try {
      const result = await createSize({
        code: newSize.code.trim(),
        display_name: newSize.display_name.trim(),
        description: newSize.description.trim() || null,
        size: newSize.size ? parseInt(newSize.size) : null,
        aircraft_pref: null,
      })

      if (result.success && result.data) {
        toast({ title: "Aircraft size created", description: `${result.data.display_name} has been added.` })
        setValue("categoryId", result.data.code)
        setNewSize({ code: "", display_name: "", description: "", size: "" })
        setCreateSizeDialogOpen(false)
        setSizeComboOpen(false)
      } else {
        toast({ title: "Error", description: result.error || "Failed to create aircraft size", variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create aircraft size", variant: "destructive" })
    } finally {
      setCreatingSize(false)
    }
  }

  const handleCreate = async (data: ModelFormData) => {
    try {
      if (!tenantId) throw new Error("Tenant ID not found.")
      setLoading(true)
      // Map categoryId to size_code for the database
      const { categoryId, ...rest } = data
      const created = await insertModel({ 
        ...rest, 
        size_code: categoryId || null,
        tenant_id: tenantId 
      })
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
      setNewSize({ code: "", display_name: "", description: "", size: "" })
      setSizeComboOpen(false)
      setCreateSizeDialogOpen(false)
    }
  }

  return (
    <>
      {/* Create Aircraft Size Dialog */}
      <Dialog open={createSizeDialogOpen} onOpenChange={setCreateSizeDialogOpen}>
        <DialogContent className="max-w-full md:max-w-md overflow-y-auto max-h-[100vh]">
          <DialogHeader>
            <DialogTitle>Create Aircraft Size</DialogTitle>
            <DialogDescription>Add a new aircraft size category</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="size-code">Code *</Label>
                <Input
                  id="size-code"
                  value={newSize.code}
                  onChange={(e) => setNewSize({ ...newSize, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., LIGHT"
                  maxLength={20}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="size-display-name">Display Name *</Label>
                <Input
                  id="size-display-name"
                  value={newSize.display_name}
                  onChange={(e) => setNewSize({ ...newSize, display_name: e.target.value })}
                  placeholder="e.g., Light Jet"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="size-description">Description</Label>
              <Input
                id="size-description"
                value={newSize.description}
                onChange={(e) => setNewSize({ ...newSize, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="size-numeric">Size (numeric order)</Label>
              <Input
                id="size-numeric"
                type="number"
                min="1"
                value={newSize.size}
                onChange={(e) => setNewSize({ ...newSize, size: e.target.value })}
                placeholder="e.g., 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateSizeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSize} disabled={creatingSize || !newSize.code.trim() || !newSize.display_name.trim()}>
              {creatingSize ? "Creating..." : "Create Size"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={handleDialogChange}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}

        <DialogContent className="max-w-full md:max-w-[65rem] overflow-y-auto max-h-[100vh]">
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
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category *</Label>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <Popover open={sizeComboOpen} onOpenChange={setSizeComboOpen} modal={true}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={sizeComboOpen}
                            className="w-full justify-between bg-transparent"
                            disabled={sizesLoading}
                          >
                            {field.value
                              ? sizes.find((s) => s.code === field.value)?.display_name || "Select category..."
                              : "Select category..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search categories..." />
                            <CommandList>
                              <CommandEmpty>
                                <div className="py-2 text-center text-sm">
                                  <p className="mb-2">No categories found.</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSizeComboOpen(false)
                                      setCreateSizeDialogOpen(true)
                                    }}
                                    className="h-8"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Create Category
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                {sizes.map((size) => (
                                  <CommandItem
                                    key={size.code}
                                    value={size.display_name}
                                    onSelect={() => handleSizeSelect(size.code)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === size.code ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{size.display_name}</span>
                                      {size.description && (
                                        <span className="text-sm text-muted-foreground">{size.description}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                                <CommandItem
                                  value="__create_size__"
                                  onSelect={() => {
                                    setSizeComboOpen(false)
                                    setCreateSizeDialogOpen(true)
                                  }}
                                  className="text-primary border-t"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  <span>Create new category...</span>
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
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
    </>
  )
}
