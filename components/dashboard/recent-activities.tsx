"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Activity } from "lucide-react";

type ActivityEvent = {
  id: string;
  type: "lead" | "quote" | "invoice";
  action: "created" | "status_changed";
  status?: string;
  timestamp: string;
  description: string;
};

export function RecentActivities() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------------- Fetch initial events ----------------
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // Fetch latest items from each table
      const [leads, quotes, invoices] = await Promise.all([
        supabase.from("lead").select("id, customer_name, status, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("quote").select("id, contact_name, status, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("invoice").select("id, customer_name, status, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const combined: ActivityEvent[] = [];

      // Leads
      (leads.data ?? []).forEach((lead) =>
        combined.push({
          id: `lead-${lead.id}`,
          type: "lead",
          action: "created",
          status: lead.status,
          timestamp: lead.created_at,
          description: `New lead created: ${lead.customer_name} (${lead.status})`,
        })
      );

      // Quotes
      (quotes.data ?? []).forEach((quote) =>
        combined.push({
          id: `quote-${quote.id}`,
          type: "quote",
          action: "created",
          status: quote.status,
          timestamp: quote.created_at,
          description: `New quote added: ${quote.contact_name} (${quote.status})`,
        })
      );

      // Invoices
      (invoices.data ?? []).forEach((inv) =>
        combined.push({
          id: `invoice-${inv.id}`,
          type: "invoice",
          action: "created",
          status: inv.status,
          timestamp: inv.created_at,
          description: `New invoice generated for ${inv.customer_name} (${inv.status})`,
        })
      );

      // Sort newest first
      combined.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(combined);
      setLoading(false);
    };

    fetchActivities();
  }, []);

  // ---------------- Real-time listeners ----------------
  useEffect(() => {
    const setupRealtime = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // Helper: insert event into state
      const addEvent = (event: ActivityEvent) =>
        setActivities((prev) => [event, ...prev].slice(0, 50));

      // Lead inserts and updates
      supabase
        .channel("lead-activity")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "lead" }, (payload) => {
          addEvent({
            id: `lead-${payload.new.id}-${Date.now()}`,
            type: "lead",
            action: "created",
            status: payload.new.status,
            timestamp: payload.new.created_at,
            description: `New lead created: ${payload.new.customer_name} (${payload.new.status})`,
          });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lead" }, (payload) => {
          if (payload.old.status !== payload.new.status) {
            addEvent({
              id: `lead-${payload.new.id}-${Date.now()}`,
              type: "lead",
              action: "status_changed",
              status: payload.new.status,
              timestamp: new Date().toISOString(),
              description: `Lead ${payload.new.customer_name} status changed: ${payload.old.status} → ${payload.new.status}`,
            });
          }
        })
        .subscribe();

      // Quote inserts and updates
      supabase
        .channel("quote-activity")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "quote" }, (payload) => {
          addEvent({
            id: `quote-${payload.new.id}-${Date.now()}`,
            type: "quote",
            action: "created",
            status: payload.new.status,
            timestamp: payload.new.created_at,
            description: `New quote added: ${payload.new.contact_name} (${payload.new.status})`,
          });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quote" }, (payload) => {
          if (payload.old.status !== payload.new.status) {
            addEvent({
              id: `quote-${payload.new.id}-${Date.now()}`,
              type: "quote",
              action: "status_changed",
              status: payload.new.status,
              timestamp: new Date().toISOString(),
              description: `Quote ${payload.new.contact_name} status changed: ${payload.old.status} → ${payload.new.status}`,
            });
          }
        })
        .subscribe();

      // Invoice inserts and updates
      supabase
        .channel("invoice-activity")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "invoice" }, (payload) => {
          addEvent({
            id: `invoice-${payload.new.id}-${Date.now()}`,
            type: "invoice",
            action: "created",
            status: payload.new.status,
            timestamp: payload.new.created_at,
            description: `New invoice generated for ${payload.new.customer_name} (${payload.new.status})`,
          });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "invoice" }, (payload) => {
          if (payload.old.status !== payload.new.status) {
            addEvent({
              id: `invoice-${payload.new.id}-${Date.now()}`,
              type: "invoice",
              action: "status_changed",
              status: payload.new.status,
              timestamp: new Date().toISOString(),
              description: `Invoice ${payload.new.customer_name} status changed: ${payload.old.status} → ${payload.new.status}`,
            });
          }
        })
        .subscribe();
    };

    setupRealtime();
  }, []);

  // ---------------- Render ----------------
  return (
    <Card className="w-full h-[400px] flex flex-col">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Activity className="w-4 h-4 text-muted-foreground" />
          Recent Activities
        </CardTitle>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="animate-spin w-5 h-5 mr-2" /> Loading activity...
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No recent activity.
          </div>
        ) : (
          <ScrollArea className="h-[340px]">
            <div className="p-4 space-y-3">
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col border-b last:border-0 pb-3 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{a.description}</span>
                    <Badge
                      variant={
                        a.type === "lead"
                          ? "default"
                          : a.type === "quote"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] uppercase"
                    >
                      {a.type}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(a.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
