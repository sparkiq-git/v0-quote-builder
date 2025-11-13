"use client"

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
import { useToast } from "@/hooks/use-toast"
import { getModels, updateModel } from "@/lib/supabase/queries/models"
import type { AircraftModelRecord } from "@/lib/types"
import ModelImageManager from "@/components/aircraft/model-image-manager"

interface ModelEditDialogProps {
  children?: React.ReactNode
  modelId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onUpdated?: () => Promise<void> | void
}

export function ModelEditDialog({
  children,
  modelId,
  open: controlledOpen,
  onOpenChange,
  onUpdated,
}: ModelEditDialogProps) {
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [model, setModel] = useState<AircraftModelRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 🔹 Fetch tenant ID (client only)
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
        console.error("Error loading tenant ID:", err)
      }
    }
    loadTenant()
  }, [])

  // 🔹 Load model when dialog opens
  useEffect(() => {
    async function loadModel() {
      if (!modelId || !open) return
      try {
        setLoading(true)
        const all = await getModels()
        const found = all.find((m) => m.id === modelId) || null
        setModel(found)
      } catch (err) {
        console.error("Error loading model:", err)
        toast({ title: "Error", description: "Failed to load model.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    if (open) loadModel()
    else setModel(null)
  }, [open, modelId, toast])

  // 🔹 Save handler
  async function handleSave() {
    if (!model) return
    try {
      setSaving(true)
      await updateModel(model.id, {
        name: model.name,
        // Note: manufacturer_id is not editable in this dialog
        // It would require a separate manufacturer selection interface
      })
      toast({ title: "Model updated", description: "Changes saved successfully." })
      await onUpdated?.()
      setOpen(false)
    } catch (err: any) {
      toast({ title: "Error updating model", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // 🔹 Reset when closed
  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setModel(null)
      setLoading(false)
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Aircraft Model</DialogTitle>
          <DialogDescription>Update details and manage images.</DialogDescription>
        </DialogHeader>

        {loading && <p className="text-muted-foreground">Loading model...</p>}

        {model && (
          <>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Model Name</Label>
                <Input
                  id="name"
                  value={model.name}
                  onChange={(e) => setModel({ ...model, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={model.manufacturer?.name || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Manufacturer cannot be changed here. Contact admin to modify.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => handleDialogChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>

            {(tenantId || model?.tenant_id) && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-2">Model Images</h3>
                <ModelImageManager 
                  modelId={model.id} 
                  tenantId={tenantId || model?.tenant_id || ""} 
                  onImagesUpdated={onUpdated}
                />
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
