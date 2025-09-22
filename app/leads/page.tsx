"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Users, Archive } from "lucide-react"
import { LeadTable } from "@/components/leads/lead-table"
import { useMockStore } from "@/lib/mock/store"

export default function LeadsPage() {
  const { state } = useMockStore()
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived" | "all">("active") // Added archive filter state

  const getFilteredLeads = () => {
    const filteredLeads = state.leads.filter((lead) => lead.status !== "deleted")

    switch (archiveFilter) {
      case "active":
        return filteredLeads.filter((lead) => !lead.isArchived)
      case "archived":
        return filteredLeads.filter((lead) => lead.isArchived)
      case "all":
        return filteredLeads
      default:
        return filteredLeads.filter((lead) => !lead.isArchived)
    }
  }

  const filteredLeads = getFilteredLeads()
  const activeLeadsCount = state.leads.filter((lead) => lead.status !== "deleted" && !lead.isArchived).length
  const archivedLeadsCount = state.leads.filter((lead) => lead.status !== "deleted" && lead.isArchived).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Manage customer inquiries and convert them to quotes</p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={archiveFilter}
            onValueChange={(value: "active" | "archived" | "all") => setArchiveFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <Archive className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active ({activeLeadsCount})</SelectItem>
              <SelectItem value="archived">Archived ({archivedLeadsCount})</SelectItem>
              <SelectItem value="all">All Leads</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredLeads.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {archiveFilter === "archived" ? "Archived Leads" : archiveFilter === "all" ? "All Leads" : "Lead Inbox"}
            </CardTitle>
            <CardDescription>
              {archiveFilter === "archived"
                ? "View and manage archived leads. You can unarchive them to restore to active status."
                : archiveFilter === "all"
                  ? "View all leads including active and archived. Use the archive filter to focus on specific groups."
                  : "Track and manage customer inquiries. Convert leads to quotes when ready."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeadTable data={filteredLeads} showArchived={archiveFilter !== "active"} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {archiveFilter === "archived" ? "No archived leads" : "No leads yet"}
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {archiveFilter === "archived"
                ? "You don't have any archived leads. Leads that are archived will appear here."
                : "Start by adding your first lead. Customer inquiries will appear here where you can track and convert them to quotes."}
            </p>
            {archiveFilter !== "archived" && (
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Lead
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
