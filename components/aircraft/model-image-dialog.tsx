"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ModelImageManager } from "./model-image-manager"
import { useToast } from "@/hooks/use-toast"

interface ModelImageDialogProps {
  modelId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModelImageDialog({ modelId, open, onOpenChange }: ModelImageDialogProps) {
  const { toast } = useToast()
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    // Get tenant ID from user metadata
    const getTenantId = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user?.app_metadata?.tenant_id) {
          setTenantId(user.app_metadata.tenant_id)
        } else {
          toast({
            title: "Authentication Error",
            description: "Unable to get tenant information. Please try logging in again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error getting tenant ID:", error)
        toast({
          title: "Error",
          description: "Unable to authenticate. Please try again.",
          variant: "destructive",
        })
      }
    }

    if (open && modelId) {
      getTenantId()
    }
  }, [open, modelId, toast])

  if (!modelId || !tenantId) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Model Images</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload and manage images for this aircraft model. Images will be visible to all users.
          </p>
          
          <ModelImageManager 
            modelId={modelId} 
            tenantId={tenantId}
            onImagesUpdated={() => {
              // Refresh the models list when images are updated
              window.location.reload()
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
