"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, UserCircle } from "lucide-react"
import { PassengersTable } from "@/components/passengers/passengers-table"
import { PassengerCreateDialog } from "@/components/passengers/passenger-create-dialog"
import { useMockStore } from "@/lib/mock/store"

export default function PassengersPage() {
  const { state } = useMockStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Passengers</h1>
          <p className="text-muted-foreground">Manage passenger profiles and travel history</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Passenger
        </Button>
      </div>

      {state.passengers && state.passengers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Passenger Directory</CardTitle>
            <CardDescription>View and manage passenger profiles, preferences, and travel history</CardDescription>
          </CardHeader>
          <CardContent>
            <PassengersTable data={state.passengers} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No passengers yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start by adding your first passenger. Track passenger profiles, preferences, and travel history.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Passenger
            </Button>
          </CardContent>
        </Card>
      )}

      <PassengerCreateDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  )
}
