"use client"

import { useState } from "react"
import { useMockStore } from "@/lib/mock/store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Search, Building2, Phone, Mail, Globe } from "lucide-react"
import { FBOEditDialog } from "./fbo-edit-dialog"
import type { FBO } from "@/lib/types"

export function FBOsTable() {
  const { state, dispatch } = useMockStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingFBO, setEditingFBO] = useState<FBO | null>(null)

  const fbos = state.fbos || []

  const filteredFBOs = fbos.filter((fbo) => {
    const query = searchQuery.toLowerCase()
    return (
      fbo.name.toLowerCase().includes(query) ||
      fbo.airportCode.toLowerCase().includes(query) ||
      fbo.airportName.toLowerCase().includes(query) ||
      fbo.address.toLowerCase().includes(query)
    )
  })

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this FBO?")) {
      dispatch({ type: "DELETE_FBO", payload: id })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, airport code, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>FBO Name</TableHead>
              <TableHead>Airport</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Services</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFBOs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No FBOs found
                </TableCell>
              </TableRow>
            ) : (
              filteredFBOs.map((fbo) => (
                <TableRow key={fbo.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{fbo.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{fbo.airportCode}</div>
                      <div className="text-sm text-muted-foreground">{fbo.airportName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{fbo.address}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{fbo.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{fbo.email}</span>
                      </div>
                      {fbo.website && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <a
                            href={fbo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Website
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {fbo.services.slice(0, 3).map((service, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                      {fbo.services.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{fbo.services.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingFBO(fbo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(fbo.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingFBO && (
        <FBOEditDialog fbo={editingFBO} open={!!editingFBO} onOpenChange={(open) => !open && setEditingFBO(null)} />
      )}
    </div>
  )
}
