"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import AircraftImageManager from "./aircraft-image-manager"
import { useToast } from "@/hooks/use-toast"

interface TailImageDialogProps {
  tailId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TailImageDialog({ tailId, open, onOpenChange }: TailImageDialogProps) {
  const { toast } = useToast()
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    // Get tenant ID from member table
    const getTenantId = async () => {
      try {
        const { getCurrentTenantIdClient } = await import("@/lib/supabase/client-member-helpers")
        const tenantId = await getCurrentTenantIdClient()
        
        if (tenantId) {
          setTenantId(tenantId)
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

    if (open && tailId) {
      getTenantId()
    }
  }, [open, tailId, toast])

  if (!tailId || !tenantId) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Tail Images</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload and manage images for this aircraft tail. Images will be visible to all users.
          </p>
          
          <AircraftImageManager 
            aircraftId={tailId} 
            tenantId={tenantId}
            onImagesUpdated={() => {
              // Close the dialog after successful image upload
              onOpenChange(false)
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
