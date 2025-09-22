"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Button } from "@/components/ui/button"
import { Plus, List, Grid3X3 } from "lucide-react"
import { ModelsTable } from "@/components/aircraft/models-table"
import { TailsTable } from "@/components/aircraft/tails-table"
import { ModelsGrid } from "@/components/aircraft/models-grid"
import { TailsGrid } from "@/components/aircraft/tails-grid"
import { ModelCreateDialog } from "@/components/aircraft/model-create-dialog"
import { TailCreateDialog } from "@/components/aircraft/tail-create-dialog"

export default function AircraftPage() {
  const [activeTab, setActiveTab] = useState("models")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Catalog</h1>
          <p className="text-muted-foreground">Manage your aircraft models and tail numbers</p>
        </div>
        <div className="flex items-center gap-4">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "list" | "grid")}
          >
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {activeTab === "models" ? (
            <ModelCreateDialog>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Model
              </Button>
            </ModelCreateDialog>
          ) : (
            <TailCreateDialog>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Tail
              </Button>
            </TailCreateDialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="tails">Tails</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aircraft Models</CardTitle>
              <CardDescription>
                {viewMode === "list"
                  ? "Manage your aircraft model templates with default specifications"
                  : "Visual overview of your aircraft models with images and detailed information"}
              </CardDescription>
            </CardHeader>
            <CardContent>{viewMode === "list" ? <ModelsTable /> : <ModelsGrid />}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tails" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aircraft Tails</CardTitle>
              <CardDescription>
                {viewMode === "list"
                  ? "Manage individual aircraft with tail numbers and custom specifications"
                  : "Visual overview of your aircraft tails with images and detailed information"}
              </CardDescription>
            </CardHeader>
            <CardContent>{viewMode === "list" ? <TailsTable /> : <TailsGrid />}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
