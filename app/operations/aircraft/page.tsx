"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Grid3x3, TableIcon } from "lucide-react"
import { ModelsTable } from "@/components/aircraft/models-table"
import { ModelsGrid } from "@/components/aircraft/models-grid"
import { TailsTable } from "@/components/aircraft/tails-table"
import { TailsGrid } from "@/components/aircraft/tails-grid"
import { ModelCreateDialog } from "@/components/aircraft/model-create-dialog"
import { TailCreateDialog } from "@/components/aircraft/tail-create-dialog"
import { useMockStore } from "@/lib/mock/store"

export default function AircraftPage() {
  const { state } = useMockStore()
  const [view, setView] = useState<"grid" | "table">("grid")
  const [showModelDialog, setShowModelDialog] = useState(false)
  const [showTailDialog, setShowTailDialog] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
          <p className="text-muted-foreground">Manage aircraft models and tail numbers</p>
        </div>
      </div>

      <Tabs defaultValue="models" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="tails">Tails</TabsTrigger>
          </TabsList>

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
          </div>
        </div>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Aircraft Models</CardTitle>
                  <CardDescription>Browse and manage aircraft models in your catalog</CardDescription>
                </div>
                <Button onClick={() => setShowModelDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Model
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {view === "grid" ? (
                <ModelsGrid models={state.aircraftModels} />
              ) : (
                <ModelsTable models={state.aircraftModels} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tails" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Aircraft Tails</CardTitle>
                  <CardDescription>Manage specific aircraft tail numbers and their details</CardDescription>
                </div>
                <Button onClick={() => setShowTailDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tail
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {view === "grid" ? <TailsGrid tails={state.aircraftTails} /> : <TailsTable tails={state.aircraftTails} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ModelCreateDialog open={showModelDialog} onOpenChange={setShowModelDialog} />
      <TailCreateDialog open={showTailDialog} onOpenChange={setShowTailDialog} />
    </div>
  )
}
