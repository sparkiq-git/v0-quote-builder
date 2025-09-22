"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plane, MapPin, Clock, Users } from "lucide-react"
import type { Leg } from "@/lib/types"
import { formatDate, formatAirportCode } from "@/lib/utils/format"

interface LeadLegsTimelineProps {
  legs: Leg[]
}

export function LeadLegsTimeline({ legs }: LeadLegsTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Trip Itinerary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {legs.map((leg, index) => (
            <div key={leg.id} className="relative">
              {index > 0 && <div className="absolute left-4 -top-4 h-4 w-0.5 bg-border" />}
              <div className="flex items-start space-x-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatAirportCode(leg.origin)} → {formatAirportCode(leg.destination)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Leg {index + 1}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatDate(leg.departureDate)} at {leg.departureTime}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{leg.passengers} passengers</span>
                    </div>
                    {leg.notes && <div className="text-muted-foreground">Note: {leg.notes}</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
