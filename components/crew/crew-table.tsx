"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Edit, UserCog, Plus } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { useToast } from "@/hooks/use-toast"
import { CrewCreateDialog } from "./crew-create-dialog"

const roleLabels = {
  PIC: "Captain",
  SIC: "First Officer",
  FA: "Flight Attendant",
  Ground: "Ground Crew",
}

export function CrewTable() {
  const { state } = useMockStore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [editCrewId, setEditCrewId] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const filteredCrew = (state.crewMembers || []).filter((crew) => {
    const matchesSearch =
      crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roleLabels[crew.role].toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || crew.role === roleFilter
    const matchesStatus = statusFilter === "all" || crew.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search crew members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="PIC">Captain</SelectItem>
            <SelectItem value="SIC">First Officer</SelectItem>
            <SelectItem value="FA">Flight Attendant</SelectItem>
            <SelectItem value="Ground">Ground Crew</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(value) => value && setStatusFilter(value as "active" | "all")}
        >
          <ToggleGroupItem value="active">Active</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Table */}
      {filteredCrew.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Flight Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCrew.map((crew) => (
                <TableRow
                  key={crew.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setEditCrewId(crew.id)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{crew.name}</p>
                      {crew.email && <p className="text-sm text-muted-foreground">{crew.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{roleLabels[crew.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{crew.yearsOfExperience} years</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{crew.totalFlightHours.toLocaleString()} hours</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={crew.status === "active" ? "default" : "secondary"}>
                      {crew.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <CrewCreateDialog crewId={crew.id}>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        </CrewCreateDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCog className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm || roleFilter !== "all" ? "No crew members found" : "No crew members"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {searchTerm || roleFilter !== "all"
              ? "Try adjusting your search terms or filters."
              : "Start by adding your first crew member."}
          </p>
          {!searchTerm && roleFilter === "all" && (
            <CrewCreateDialog>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Crew Member
              </Button>
            </CrewCreateDialog>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <CrewCreateDialog crewId={editCrewId || undefined} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
    </div>
  )
}
