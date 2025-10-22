"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  FileText,
  Trash2,
  Mail,
  Phone,
  Building2,
  Calendar,
  User,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { formatDate, formatTimeAgo } from "@/lib/utils/format"
import type { Lead } from "@/lib/types"
import { LeadLegsTimeline } from "@/components/leads/lead-legs-timeline"

interface LeadDetailModalProps {
  leadId: string | null
  open: boolean
  onClose: () => void
}

export function LeadDetailModal({
  leadId,
  open,
  onClose,
}: LeadDetailModalProps) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (!leadId || !open) return
    const fetchLead = async () => {
      setLoading(true)

      // ✅ Fetch lead with its related details (segments/legs)
      const { data, error } = await supabase
        .from("lead")
        .select(
          `
          *,
          details:lead_detail(*)
        `
        )
        .eq("id", leadId)
        .single()

      if (error) {
        console.error("Error fetching lead:", error)

        // fallback: just load lead without details
        const { data: basicData, error: basicError } = await supabase
          .from("lead")
          .select("*")
          .eq("id", leadId)
          .single()

        if (basicError) {
          console.error("Error fetching lead (fallback):", basicError)
        } else {
          setLead(basicData)
        }
      } else {
        const leadWithDetails = {
          ...data,
          details: data.details || [],
        }
        setLead(leadWithDetails)
      }

      setLoading(false)
    }

    fetchLead()
  }, [leadId, open])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new":
      case "active":
        return "default"
      case "opened":
        return "secondary"
      case "converted":
        return "outline"
      case "deleted":
        return "destructive"
      default:
        return "outline"
    }
  }

const handleConvertToQuote = async () => {
  if (!lead) return

  try {
    const { data: newQuoteId, error } = await supabase.rpc("rpc_convert_lead_to_quote", {
      p_lead_id: lead.id,
    })

    if (error) {
      console.error("Convert error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to convert lead.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Lead converted",
      description: "Lead successfully converted to quote.",
    })

    // Navigate to the new quote page
    window.location.href = `/quotes/${newQuoteId}`
  } catch (err) {
    console.error("Unexpected convert error:", err)
    toast({
      title: "Error",
      description: "Something went wrong while converting the lead.",
      variant: "destructive",
    })
  }
}


const handleDeleteLead = async () => {
  if (!lead) return

  try {
    const { error } = await supabase.rpc("rpc_delete_lead", {
      p_lead_id: lead.id,
    })

    if (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Lead updated",
      description:
        "Lead visibility handled successfully. It has been deleted or marked as deleted depending on its visibility.",
    })

    onClose()
  } catch (err) {
    console.error("Unexpected delete error:", err)
    toast({
      title: "Error",
      description: "Something went wrong while deleting the lead.",
      variant: "destructive",
    })
  }
}


  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* ✅ increased width */}
      <DialogContent className="max-w-full md:max-w-[65rem] overflow-y-auto max-h-[100vh]">
        <DialogHeader>
          <DialogTitle>Lead Details</DialogTitle>
          <DialogDescription>
            Manage lead information and convert to quote
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading lead...
          </div>
        ) : !lead ? (
          <div className="py-12 text-center text-muted-foreground">
            No lead found.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Controls */}
            <div className="flex justify-end gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive bg-transparent"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Lead
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the lead as deleted. You can still view
                      deleted leads in the leads list by filtering for deleted
                      status.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteLead}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete Lead
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {lead.status === "new" || lead.status === "opened" ? (
                <Button onClick={handleConvertToQuote}>
                  <FileText className="mr-2 h-4 w-4" />
                  Convert to Quote
                </Button>
              ) : null}
            </div>

            {/* Lead Info */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Customer Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {lead.customer_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {lead.customer_name}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(lead.status)}>
                        {lead.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    {lead.customer_email && (
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.customer_email}</span>
                      </div>
                    )}
                    {lead.customer_phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.customer_phone}</span>
                      </div>
                    )}
                    {lead.company && (
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.company}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Created {formatDate(lead.created_at)} (
                        {formatTimeAgo(lead.created_at)})
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trip Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Summary</CardTitle>
                  <CardDescription>
                    Quick overview of the trip request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Legs
                      </p>
                      <p className="text-2xl font-bold">
                        {lead.leg_count ?? "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Passengers
                      </p>
                      <p className="text-2xl font-bold">
                        {lead.total_pax ?? "-"}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  {lead.trip_summary && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Internal Notes
                      </p>
                      <p className="text-sm bg-muted p-3 rounded-md">
                        {lead.trip_summary}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ✅ Trip Timeline */}
            {lead.details && lead.details.length > 0 && (
              <LeadLegsTimeline legs={lead.details} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
