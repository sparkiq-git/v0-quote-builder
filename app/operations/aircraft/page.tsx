"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Grid3x3, TableIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { ModelsTable } from "@/components/aircraft/models-table"
import { ModelsGrid } from "@/components/aircraft/models-grid"
import { TailsTable } from "@/components/aircraft/tails-table"
import { TailsGrid } from "@/components/aircraft/tails-grid"
import { ModelCreateDialog } from "@/components/aircraft/model-create-dialog"
import { TailCreateDialog } from "@/components/aircraft/tail-create-dialog"

import { getModels } from "@/lib/supabase/queries/models"
import { getAircraft } from "@/lib/supabase/queries/aircraft"
import type { AircraftModelRecord, AircraftRecord } from "@/lib/types"

export default function AircraftPage() {
  const { toast } = useToast()
  const [view, setView] = useState<"grid" | "table">("grid")
  const [activeTab, setActiveTab] = useState<"models" | "tails">("models")
  const [showModelDialog, setShowModelDialog] = useState(false)
  const [showTailDialog, setShowTailDialog] = useState(false)
  const [models, setModels] = useState<AircraftModelRecord[]>([])
  const [tails, setTails] = useState<AircraftRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshModels = useCallback(async () => setModels(await getModels()), [])
  const refreshTails = useCallback(async () => setTails(await getAircraft()), [])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [m, t] = await Promise.all([getModels(), getAircraft()])
        setModels(m)
        setTails(t)
      } catch (e: any) {
        toast({ title: "Error loading data", description: e.message, variant: "destructive" })
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [toast])

  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <p className="text-muted-foreground">Loading aircraft data...</p>
      </div>
    )

  if (error)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <p className="text-red-500">Error: {error}</p>
      </div>
    )

  return (
    <>
      {/* Single, top-level dialogs */}
      <ModelCreateDialog open={showModelDialog} onOpenChange={setShowModelDialog} onCreated={refreshModels} />
      <TailCreateDialog open={showTailDialog} onOpenChange={setShowTailDialog} onCreated={refreshTails} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
            <p className="text-muted-foreground">Manage aircraft models and tail numbers</p>
          </div>
          <div className="flex gap-2">
            {activeTab === "models" ? (
              <Button onClick={() => setShowModelDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Model
              </Button>
            ) : (
              <Button onClick={() => setShowTailDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Tail
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "models" | "tails")} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="models">Models</TabsTrigger>
              <TabsTrigger value="tails">Tails</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={() => setView(view === "grid" ? "table" : "grid")}>
              {view === "grid" ? (
                <>
                  <TableIcon className="h-4 w-4 mr-2" /> Table View
                </>
              ) : (
                <>
                  <Grid3x3 className="h-4 w-4 mr-2" /> Grid View
                </>
              )}
            </Button>
          </div>

          <TabsContent value="models">
            <Card>
              <CardHeader>
                <CardTitle>Aircraft Models</CardTitle>
                <CardDescription>Browse and manage aircraft models</CardDescription>
              </CardHeader>
              <CardContent>
                {view === "grid" ? (
                  <ModelsGrid models={models} onRefresh={refreshModels} />
                ) : (
                  <ModelsTable models={models} onRefresh={refreshModels} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tails">
            <Card>
              <CardHeader>
                <CardTitle>Aircraft Tails</CardTitle>
                <CardDescription>Manage tail numbers</CardDescription>
              </CardHeader>
              <CardContent>
                {view === "grid" ? <TailsGrid tails={tails} /> : <TailsTable tails={tails} />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
