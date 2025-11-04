"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DollarSign, TrendingUp } from "lucide-react"

/**
 * DashboardMetrics
 * - Displays Cost Operator (sum for this month)
 * - Displays Price Commission (sum for this month)
 * - Includes only quotes where status is 'accepted', 'invoiced', 'paid', or 'pending_approval'
 */
export default function DashboardMetrics() {
  const [costOperator, setCostOperator] = useState(0)
  const [priceCommission, setPriceCommission] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMetrics = async () => {
      if (typeof window === "undefined") return

      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      try {
        // ✅ One query joining quote_option → quote.id
        const { data: quoteOptions, error } = await supabase
          .from("quote_option")
          .select(`
            cost_operator,
            price_commission,
            created_at,
            quote:quote_option_quote_id_fkey!inner(status)
          `)
          .gte("created_at", firstDay.toISOString())
          .lte("created_at", lastDay.toISOString())
          .in("quote.status", ["accepted", "invoiced", "paid", "pending_approval"])

        if (error) {
          console.error("quote_option query error:", error)
          return
        }

        if (quoteOptions?.length) {
          const totalCost = quoteOptions.reduce(
            (sum, q) => sum + (Number.parseFloat(q.cost_operator) || 0),
            0
          )
          const totalCommission = quoteOptions.reduce(
            (sum, q) => sum + (Number.parseFloat(q.price_commission) || 0),
            0
          )

          setCostOperator(totalCost)
          setPriceCommission(totalCommission)
        }
      } catch (err) {
        console.error("loadMetrics error:", err)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [])

  // --- Reusable Metric Card
  function MetricCard({
    title,
    icon: Icon,
    value,
    color = "text-foreground",
    description,
  }: {
    title: string
    icon: any
    value: number | string
    color?: string
    description?: string
  }) {
    return (
      <Card className="col-span-1 h-full flex flex-col hover:shadow-lg transition-all duration-200 border border-border bg-card rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6 px-6">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-rows-[auto_auto] gap-2 flex-1 px-6 pb-6">
          <div className={`text-3xl font-bold leading-none tracking-tight ${color}`}>{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-0 truncate">
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 justify-center">
        {[...Array(2)].map((_, i) => (
          <Card
            key={i}
            className="h-full flex flex-col border border-border rounded-xl animate-pulse bg-card"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6 px-6">
              <div className="h-4 bg-muted rounded w-16" />
              <div className="h-6 bg-muted rounded w-12" />
            </CardHeader>
            <CardContent className="grid gap-2 flex-1 px-6 pb-6">
              <div className="h-8 bg-muted rounded w-20" />
              <div className="h-3 bg-muted rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 justify-center">
      <MetricCard
        title="Cost Operator"
        icon={DollarSign}
        value={`$${costOperator.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`}
        color="text-foreground"
        description="Operator costs this month"
      />
      <MetricCard
        title="Price Commission"
        icon={TrendingUp}
        value={`$${priceCommission.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`}
        color="text-foreground"
        description="Price commissions this month"
      />
    </div>
  )
}
