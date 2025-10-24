"use client"

import { useState, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import type { Quote } from "@/lib/types"
import { QuoteDetailsTab } from "./sections/QuoteDetailsTab"
import { QuoteLegsTab } from "./sections/QuoteLegsTab"
import { QuoteOptionsTab } from "./sections/QuoteOptionsTab"
import { QuoteServicesTab } from "./sections/QuoteServicesTab"
import { QuoteSummaryTab } from "./sections/QuoteSummaryTab"

interface Props {
  quote: Quote
  onUpdate: (updates: Partial<Quote>) => void
  onLegsChange?: (legs: any[]) => void
  onNavigate?: () => Promise<void> | void // 🔥 New optional prop
}

export function QuoteBuilderTabs({
  quote,
  onUpdate,
  onLegsChange,
  onNavigate,
}: Props) {
  const [currentTab, setCurrentTab] = useState("details")

  /* -------------------- NAVIGATION HELPERS -------------------- */
  const goTo = useCallback(
    async (nextTab: string) => {
      // 🧠 Force-save queued edits before moving away
      if (onNavigate) {
        try {
          await onNavigate()
        } catch (e) {
          console.error("⚠️ Save before navigation failed:", e)
          return // Don't navigate if save fails
        }
      }
      setCurrentTab(nextTab)
    },
    [onNavigate],
  )

  const next = (tab: string) => goTo(tab)
  const back = (tab: string) => goTo(tab)

  /* -------------------- RENDER -------------------- */
  return (
    <Card className="p-4">
      <Tabs
        value={currentTab}
        onValueChange={setCurrentTab}
        className="w-full space-y-4"
      >
        {/* --- Header Tabs --- */}
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="details">1. Details</TabsTrigger>
          <TabsTrigger value="legs">2. Trip Legs</TabsTrigger>
          <TabsTrigger value="options">3. Aircraft</TabsTrigger>
          <TabsTrigger value="services">4. Services</TabsTrigger>
          <TabsTrigger value="summary">5. Summary</TabsTrigger>
        </TabsList>

        {/* --- 1️⃣ Details --- */}
        <TabsContent value="details" className="mt-4">
          <QuoteDetailsTab quote={quote} onUpdate={onUpdate} onNext={() => next("legs")} />
        </TabsContent>

        {/* --- 2️⃣ Legs --- */}
        <TabsContent value="legs" className="mt-4">
          <QuoteLegsTab
            quote={quote}
            onUpdate={onUpdate}
            onLegsChange={onLegsChange}
            onNext={() => next("options")}
            onBack={() => back("details")}
          />
        </TabsContent>

        {/* --- 3️⃣ Aircraft Options --- */}
        <TabsContent value="options" className="mt-4">
          <QuoteOptionsTab
            quote={quote}
            onUpdate={onUpdate}
            onNext={() => next("services")}
            onBack={() => back("legs")}
          />
        </TabsContent>

        {/* --- 4️⃣ Services --- */}
        <TabsContent value="services" className="mt-4">
          <QuoteServicesTab
            quote={quote}
            onUpdate={onUpdate}
            onNext={() => next("summary")}
            onBack={() => back("options")}
          />
        </TabsContent>

        {/* --- 5️⃣ Summary --- */}
        <TabsContent value="summary" className="mt-4">
          <QuoteSummaryTab quote={quote} onBack={() => back("services")} />
        </TabsContent>
      </Tabs>
    </Card>
  )
}
