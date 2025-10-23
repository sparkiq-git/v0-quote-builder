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
import { TailCreateDialog } from "@/components/aircraft/tail-create-dialog"

export default function AircraftPage() {
  const [view, setView] = useState<"grid" | "table">("grid")
  const [activeTab, setActiveTab] = useState<"models" | "tails">("models")
  const [showTailDialog, setShowTailDialog] = useState(false)

  return (
    <>
             {/* Single, top-level dialog for tails only */}
             <TailCreateDialog open={showTailDialog} onOpenChange={setShowTailDialog} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
            <p className="text-muted-foreground">Manage aircraft models and tail numbers</p>
          </div>
                 <div className="flex gap-2">
                   {activeTab === "tails" && (
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
                {view === "grid" ? <ModelsGrid /> : <ModelsTable />}
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
                {view === "grid" ? <TailsGrid /> : <TailsTable />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
