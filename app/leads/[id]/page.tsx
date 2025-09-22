"use client"

import { notFound, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileText, Mail, Phone, Building2, Calendar, User } from "lucide-react"
import { LeadLegsTimeline } from "@/components/leads/lead-legs-timeline"
import { useMockStore } from "@/lib/mock/store"
import { formatDate, formatTimeAgo } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

interface LeadDetailPageProps {
  params: {
    id: string
  }
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { getLeadById, convertLeadToQuote } = useMockStore()
  const router = useRouter()
  const { toast } = useToast()

  const lead = getLeadById(params.id)

  if (!lead) {
    notFound()
  }

  const handleConvertToQuote = () => {
    try {
      const quote = convertLeadToQuote(lead.id)
      toast({
        title: "Lead converted to quote",
        description: "The lead has been successfully converted to a quote.",
      })
      router.push(`/quotes/${quote.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert lead to quote.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new":
        return "default"
      case "converted":
        return "secondary"
      case "deleted":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lead Details</h1>
            <p className="text-muted-foreground">Manage lead information and convert to quote</p>
          </div>
        </div>
        {lead.status === "new" && (
          <Button onClick={handleConvertToQuote}>
            <FileText className="mr-2 h-4 w-4" />
            Convert to Quote
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
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
                  {lead.customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{lead.customer.name}</h3>
                <Badge variant={getStatusBadgeVariant(lead.status)}>{lead.status.replace("_", " ")}</Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{lead.customer.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{lead.customer.phone}</span>
              </div>
              {lead.customer.company && (
                <div className="flex items-center space-x-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.customer.company}</span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Created {formatDate(lead.createdAt)} ({formatTimeAgo(lead.createdAt)})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Summary</CardTitle>
            <CardDescription>Quick overview of the trip request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Legs</p>
                <p className="text-2xl font-bold">{lead.legs.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Passengers</p>
                <p className="text-2xl font-bold">{Math.max(...lead.legs.map((leg) => leg.passengers))}</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Route Overview</p>
              <div className="space-y-1">
                {lead.legs.map((leg, index) => (
                  <div key={leg.id} className="text-sm">
                    <span className="font-medium">
                      {leg.origin} → {leg.destination}
                    </span>
                    <span className="text-muted-foreground ml-2">{formatDate(leg.departureDate)}</span>
                  </div>
                ))}
              </div>
            </div>

            {lead.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Internal Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{lead.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trip Timeline */}
      <LeadLegsTimeline legs={lead.legs} />
    </div>
  )
}
