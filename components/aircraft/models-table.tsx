"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  MoreHorizontal,
  Edit,
  Archive,
  Trash2,
  ArchiveRestore,
} from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { useAircraftModels } from "@/hooks/use-aircraft-models"
import { updateModel, deleteModel } from "@/lib/supabase/queries/models"
import { ModelEditDialog } from "./model-edit-dialog"

export function ModelsTable() {
  const { models, loading, error } = useAircraftModels()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "mine">("all")
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)
  const [editModelId, setEditModelId] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const filtered = (models || []).filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || (statusFilter === "mine" && m.createdBy)
    return matchesSearch && matchesStatus
  })

  // Archive functionality removed for public catalog

  const handleDelete = async (id: string) => {
    try {
      await deleteModel(id)
      toast({ title: "Model deleted" })
      setDeleteModelId(null)
      // Refresh will happen automatically via the hook
    } catch (err) {
      toast({
        title: "Error deleting model",
        description: String(err),
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-lg font-semibold mb-2">Error loading models</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
      </div>
    )
  }

  return (
    <>
      {/* ✈️ Controlled Edit dialog only */}
      {editModelId && (
        <ModelEditDialog
          modelId={editModelId}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onUpdated={onRefresh}
        />
      )}

      <div className="space-y-4">
        {/* 🔍 Search */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 w-full">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* 🧾 Table */}
        {filtered.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Specifications</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow
                    key={m.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      if (m.createdBy) {
                        setEditModelId(m.id)
                        setIsEditOpen(true)
                      }
                    }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {m.name}
                        </p>
                        {m.manufacturer && (
                          <p className="text-sm text-muted-foreground">
                            {m.manufacturer}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.createdBy ? (
                        <Badge variant="default">My Model</Badge>
                      ) : (
                        <Badge variant="outline">Public</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm space-y-1">
                      {m.capacityPax && <div>Cap: {m.capacityPax} pax</div>}
                      {m.rangeNm && <div>Range: {m.rangeNm} nm</div>}
                      {m.cruisingSpeed && <div>Speed: {m.cruisingSpeed} kt</div>}
                      {m.mtowKg && <div>MTOW: {m.mtowKg} kg</div>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {m.createdBy && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditModelId(m.id)
                                  setIsEditOpen(true)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteModelId(m.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                          {!m.createdBy && (
                            <DropdownMenuItem disabled>
                              <span className="text-muted-foreground">View Only</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10">
            No models found.
          </p>
        )}

        {/* 🗑️ Delete Confirm */}
        <AlertDialog
          open={!!deleteModelId}
          onOpenChange={() => setDeleteModelId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Aircraft Model</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteModelId && handleDelete(deleteModelId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  )
}
