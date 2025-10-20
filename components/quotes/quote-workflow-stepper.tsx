"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface Step {
  id: string
  label: string
  description: string
}

interface QuoteWorkflowStepperProps {
  currentStep?: number
  className?: string
}

const steps: Step[] = [
  {
    id: "pending",
    label: "Pending",
    description: "Awaiting client",
  },
  {
    id: "availability",
    label: "Availability",
    description: "Contract/Invoice sent",
  },
  {
    id: "itinerary",
    label: "Itinerary",
    description: "Building & confirming",
  },
  {
    id: "finished",
    label: "Finished",
    description: "Sent to client",
  },
]

export function QuoteWorkflowStepper({ currentStep = 0, className }: QuoteWorkflowStepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isUpcoming = index > currentStep
          const isLast = index === steps.length - 1

          return (
            <div key={step.id} className="flex items-center flex-1">
              <Card
                className={cn(
                  "transition-all flex-1",
                  isCurrent && "border-primary shadow-md bg-primary/5",
                  isCompleted && "border-primary/50 bg-primary/5",
                  isUpcoming && "border-muted",
                )}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all flex-shrink-0",
                      isCompleted && "bg-primary border-primary text-primary-foreground",
                      isCurrent && "bg-primary border-primary text-primary-foreground",
                      isUpcoming && "bg-background border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div
                      className={cn(
                        "text-sm font-semibold truncate",
                        (isCompleted || isCurrent) && "text-foreground",
                        isUpcoming && "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{step.description}</div>
                  </div>
                </CardContent>
              </Card>

              {!isLast && (
                <div
                  className={cn(
                    "h-[2px] w-4 flex-shrink-0 transition-colors",
                    index < currentStep ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
