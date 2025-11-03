"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Building2 } from "lucide-react"
import { FBOsTable } from "@/components/fbos/fbos-table"
import { FBOCreateDialog } from "@/components/fbos/fbo-create-dialog"
import { useMockStore } from "@/lib/mock/store"

export default function FBOsPage() {
  const { state } = useMockStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FBOs</h1>
          <p className="text-muted-foreground">Manage Fixed Base Operators and their services</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add FBO
        </Button>
      </div>

      {state.fbos && state.fbos.length > 0 ? (
        <Card>
          <CardContent>
            <FBOsTable data={state.fbos} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No FBOs yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start by adding your first FBO. Track locations, services, and contact information for Fixed Base
              Operators.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First FBO
            </Button>
          </CardContent>
        </Card>
      )}

      <FBOCreateDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  )
}
