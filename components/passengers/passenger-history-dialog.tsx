"use client"

import { useMockStore } from "@/lib/mock/store"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileText, Plane, Users, Calendar } from "lucide-react"
import type { Passenger } from "@/lib/types"

interface PassengerHistoryDialogProps {
  passenger: Passenger
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PassengerHistoryDialog({ passenger, open, onOpenChange }: PassengerHistoryDialogProps) {
  const { state } = useMockStore()

  const quotes = state.quotes.filter((q) => passenger.quotesReceived.includes(q.id))
  const coPassengers = state.passengers?.filter((p) => passenger.pastCoPassengers.includes(p.id)) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Passenger History: {passenger.name}</DialogTitle>
          <DialogDescription>View complete travel history and preferences</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Quotes Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{passenger.quotesReceived.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Flights Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{passenger.flightsCompleted}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Co-Passengers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{passenger.pastCoPassengers.length}</div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold mb-3">Contact Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span> {passenger.email}
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span> {passenger.phone}
              </div>
              {passenger.company && (
                <div>
                  <span className="text-muted-foreground">Company:</span> {passenger.company}
                </div>
              )}
            </div>
          </div>

          {/* Preferences */}
          {(passenger.specialRequests || passenger.dietaryRestrictions || passenger.accessibilityNeeds) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Preferences & Requirements</h3>
                <div className="space-y-3">
                  {passenger.specialRequests && (
                    <div>
                      <div className="text-sm font-medium mb-1">Special Requests</div>
                      <div className="text-sm text-muted-foreground">{passenger.specialRequests}</div>
                    </div>
                  )}
                  {passenger.dietaryRestrictions && (
                    <div>
                      <div className="text-sm font-medium mb-1">Dietary Restrictions</div>
                      <div className="text-sm text-muted-foreground">{passenger.dietaryRestrictions}</div>
                    </div>
                  )}
                  {passenger.accessibilityNeeds && (
                    <div>
                      <div className="text-sm font-medium mb-1">Accessibility Needs</div>
                      <div className="text-sm text-muted-foreground">{passenger.accessibilityNeeds}</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Quote History */}
          {quotes.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Quote History</h3>
                <div className="space-y-2">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {quote.legs[0]?.origin} → {quote.legs[quote.legs.length - 1]?.destination}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant={quote.status === "payment_received" ? "default" : "secondary"}>
                        {quote.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Co-Passengers */}
          {coPassengers.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Past Co-Passengers</h3>
                <div className="flex flex-wrap gap-2">
                  {coPassengers.map((coPassenger) => (
                    <Badge key={coPassenger.id} variant="outline">
                      {coPassenger.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
