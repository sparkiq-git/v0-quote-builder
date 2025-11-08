"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SimpleSelect } from "@/components/ui/simple-select"
import { Input } from "@/components/ui/input"
import { Eye, Search, Plus, MapPin, Calendar, Users, Plane, MoreHorizontal } from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import { useAppHeader } from "@/components/app-header-context"

interface Itinerary {
  id: string
  quote_id: string
  invoice_id: string | null
  contact_id: string
  lead_id: string | null
  tenant_id: string
  status: string
  title: string | null
  trip_summary: string | null
  trip_type: string | null
  leg_count: number
  total_pax: number
  domestic_trip: boolean | null
  asap: boolean | null
  aircraft_id: string | null
  aircraft_tail_id: string | null
  aircraft_tail_no: string | null
  earliest_departure: string | null
  latest_return: string | null
  created_at: string
  updated_at: string
  contact?: {
    id: string
    full_name: string
    email: string
    company: string | null
  }
  quote?: {
    id: string
    title: string | null
    contact_name: string | null
    contact_email: string | null
  }
}

export default function ItinerariesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dropdownPositions, setDropdownPositions] = useState<{
    [key: string]: { top: number; right: number; position: "top" | "bottom" }
  }>({})

  const { setContent } = useAppHeader()

  useEffect(() => {
    setContent({
      title: "Itineraries",
      subtitle: "Manage trip itineraries and travel details",
      actions: (
        <Button asChild>
          <Link href="/quotes">
            <Plus className="mr-2 h-4 w-4" />
            View Quotes
          </Link>
        </Button>
      ),
    })

    const fetchItineraries = async () => {
      try {
        console.log("[v0] Fetching itineraries with filters:", { searchQuery, statusFilter })
        const params = new URLSearchParams()
        if (searchQuery) params.append("search", searchQuery)
        if (statusFilter !== "all") params.append("status", statusFilter)

        const response = await fetch(`/api/itineraries?${params.toString()}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to fetch itineraries")
        }

        const { data } = await response.json()
        console.log("[v0] Fetched itineraries:", data)
        setItineraries(data || [])
      } catch (err: any) {
        console.error("❌ Error loading itineraries:", err)
        toast({
          title: "Failed to load itineraries",
          description: err.message || "Could not fetch itineraries.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchItineraries()

    return () => setContent({})
  }, [setContent, toast, searchQuery, statusFilter])

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null)
    if (openDropdown) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [openDropdown])

  const filteredItineraries = itineraries

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading itineraries...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, summary, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <SimpleSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "draft", label: "Draft" },
                { value: "trip_confirmed", label: "Trip Confirmed" },
                { value: "in_progress", label: "In Progress" },
                { value: "completed", label: "Completed" },
                { value: "cancelled", label: "Cancelled" },
              ]}
              triggerClassName="w-[180px]"
            />
          </div>

          {filteredItineraries.length > 0 ? (
            <div className="relative overflow-visible max-w-full max-h-[700px] rounded-lg border">
              <div className="overflow-auto max-h-[700px]">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Details</TableHead>
                      <TableHead>Trip Info</TableHead>
                      <TableHead>Aircraft</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredItineraries.map((itin) => (
                      <TableRow key={itin.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {itin.contact?.full_name
                                  ?.split(" ")
                                  .map((n: string) => n[0])
                                  .join("") || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{itin.contact?.full_name || "Unknown Contact"}</div>
                              <div className="text-sm text-muted-foreground">
                                {itin.title || itin.trip_summary || "Untitled Itinerary"}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {itin.leg_count} leg{itin.leg_count !== 1 ? "s" : ""}
                              </span>
                              <Users className="h-3 w-3 text-muted-foreground ml-2" />
                              <span>{itin.total_pax} pax</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  itin.status === "completed"
                                    ? "default"
                                    : itin.status === "in_progress"
                                      ? "secondary"
                                      : itin.status === "cancelled"
                                        ? "destructive"
                                        : "outline"
                                }
                              >
                                {itin.status.replace("_", " ")}
                              </Badge>
                              {itin.asap && (
                                <Badge variant="destructive" className="text-xs">
                                  ASAP
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {itin.aircraft_tail_no ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Plane className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{itin.aircraft_tail_no}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">—</div>
                          )}
                          {itin.trip_type && <div className="text-xs text-muted-foreground mt-1">{itin.trip_type}</div>}
                        </TableCell>

                        <TableCell>
                          {itin.earliest_departure ? (
                            <div>
                              <div className="text-sm flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {formatDate(itin.earliest_departure)}
                              </div>
                              {itin.latest_return && itin.latest_return !== itin.earliest_departure && (
                                <div className="text-xs text-muted-foreground">to {formatDate(itin.latest_return)}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">—</div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const button = e.currentTarget as HTMLElement
                                const rect = button.getBoundingClientRect()
                                const spaceBelow = window.innerHeight - rect.bottom
                                const spaceAbove = rect.top

                                console.log("[v0] Three-dot menu clicked, spaces:", { spaceBelow, spaceAbove })

                                // Calculate position
                                const position = spaceBelow < 120 && spaceAbove > spaceBelow ? "top" : "bottom"
                                const top = position === "top" ? rect.top - 80 : rect.bottom + 5
                                const right = window.innerWidth - rect.right

                                setDropdownPositions({
                                  ...dropdownPositions,
                                  [itin.id]: { top, right, position },
                                })

                                setOpenDropdown(openDropdown === itin.id ? null : itin.id)
                              }}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-white border border-neutral-200 text-black hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {openDropdown === itin.id && dropdownPositions[itin.id] && (
                              <div
                                className="fixed bg-white rounded-md shadow-lg border border-neutral-200 z-[9999]"
                                style={{
                                  top: `${dropdownPositions[itin.id].top}px`,
                                  right: `${dropdownPositions[itin.id].right}px`,
                                  minWidth: "140px",
                                  width: "auto",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="py-1">
                                  <div className="px-3 py-1.5 text-xs font-semibold text-neutral-500 border-b border-neutral-100">
                                    Actions
                                  </div>
                                  <button
                                    onClick={() => {
                                      router.push(`/itineraries/${itin.id}`)
                                      setOpenDropdown(null)
                                    }}
                                    className="w-full px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-neutral-900 hover:text-white transition-colors rounded-md whitespace-nowrap"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No itineraries found matching your filters."
                : "No itineraries yet. They will be created automatically when quotes are accepted."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
