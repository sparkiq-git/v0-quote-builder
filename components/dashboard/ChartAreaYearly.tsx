"use client"

import { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ChartPoint {
  month: string
  cost_operator: number
  price_commission: number
}

export function ChartAreaYearly() {
  const [data, setData] = useState<ChartPoint[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => setIsClient(true), [])

  useEffect(() => {
    if (!isClient) return

    const loadData = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const currentYear = new Date().getFullYear()
      const startOfYear = new Date(currentYear, 0, 1).toISOString()
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).toISOString()
      const allowedStatuses = ["accepted", "invoiced", "paid", "pending_approval"]

      // Step 1: Get allowed quote IDs
      const { data: quotes, error: quoteError } = await supabase
        .from("quote")
        .select("id")
        .in("status", allowedStatuses)

      if (quoteError) {
        console.error("Error loading quotes:", quoteError)
        return
      }

      const quoteIds = quotes?.map((q) => q.id) ?? []
      if (quoteIds.length === 0) {
        setData([])
        return
      }

      // Step 2: Get related quote_option rows
      const { data: options, error } = await supabase
        .from("quote_option")
        .select("created_at, cost_operator, price_commission, quote_id")
        .in("quote_id", quoteIds)
        .gte("created_at", startOfYear)
        .lte("created_at", endOfYear)

      if (error) {
        console.error("Error loading chart data:", error)
        return
      }

      // Step 3: Aggregate per month
      const monthly = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(0, i).toLocaleString("default", { month: "short" }),
        cost_operator: 0,
        price_commission: 0,
      }))

      options?.forEach((row) => {
        const monthIndex = new Date(row.created_at).getMonth()
        monthly[monthIndex].cost_operator += row.cost_operator || 0
        monthly[monthIndex].price_commission += row.price_commission || 0
      })

      setData(monthly)
    }

    loadData()
  }, [isClient])

  return (
    <Card className="border border-border shadow-sm rounded-xl bg-card hover:shadow-md transition-shadow h-[400px]">
      <CardHeader>
        <CardTitle>Cost & Commission (Yearly)</CardTitle>
        <CardDescription>Showing total cost and commission by month for {new Date().getFullYear()}</CardDescription>
      </CardHeader>

      <CardContent className="h-[300px] pt-2">
        <ChartContainer
          config={{
            cost_operator: { label: "Cost Operator", color: "var(--chart-1)" },
            price_commission: { label: "Price Commission", color: "var(--chart-2)" },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <defs>
                <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillCommission" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area
                type="natural"
                dataKey="price_commission"
                stroke="var(--chart-2)"
                fill="url(#fillCommission)"
                fillOpacity={0.4}
                stackId="a"
              />
              <Area
                type="natural"
                dataKey="cost_operator"
                stroke="var(--chart-1)"
                fill="url(#fillCost)"
                fillOpacity={0.4}
                stackId="a"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Trending up by 12.4% this year <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Jan – Dec {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
