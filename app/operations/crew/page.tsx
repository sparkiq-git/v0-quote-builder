"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Grid3x3, TableIcon, UserCog } from "lucide-react"
import { CrewTable } from "@/components/crew/crew-table"
import { CrewGrid } from "@/components/crew/crew-grid"
import { CrewCreateDialog } from "@/components/crew/crew-create-dialog"
import { useMockStore } from "@/lib/mock/store"

export default function CrewPage() {
  const { state } = useMockStore()
  const [view, setView] = useState<"grid" | "table">("grid")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crew</h1>
          <p className="text-muted-foreground">Manage flight crew members and their qualifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(view === "grid" ? "table" : "grid")}>
            {view === "grid" ? (
              <>
                <TableIcon className="h-4 w-4 mr-2" />
                Table View
              </>
            ) : (
              <>
                <Grid3x3 className="h-4 w-4 mr-2" />
                Grid View
              </>
            )}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Crew Member
          </Button>
        </div>
      </div>

      {state.crew && state.crew.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Crew Directory</CardTitle>
            <CardDescription>View and manage flight crew members, their roles, and qualifications</CardDescription>
          </CardHeader>
          <CardContent>
            {view === "grid" ? <CrewGrid crew={state.crew} /> : <CrewTable crew={state.crew} />}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserCog className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No crew members yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start by adding your first crew member. Track pilots, flight attendants, and their qualifications.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Crew Member
            </Button>
          </CardContent>
        </Card>
      )}

      <CrewCreateDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  )
}
