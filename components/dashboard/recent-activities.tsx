"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Activity, FileText, Users, Receipt } from "lucide-react";

// --- Utility: format timestamps like "2h ago" ---
function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000; // seconds
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

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

      // ✅ Invoice uses "number" column
      const [leads, quotes, invoices] = await Promise.all([
        supabase
          .from("lead")
          .select("id, customer_name, status, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("quote")
          .select("id, contact_name, status, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("invoice")
          .select("id, number, status, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
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

      // Invoices (now using "number")
      (invoices.data ?? []).forEach((inv) =>
        combined.push({
          id: `invoice-${inv.id}`,
          type: "invoice",
          action: "created",
          status: inv.status,
          timestamp: inv.created_at,
          description: `New invoice generated: #${inv.number} (${inv.status})`,
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

  // ---------------- Realtime listeners ----------------
  useEffect(() => {
    const setupRealtime = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const addEvent = (event: ActivityEvent) =>
        setActivities((prev) => [event, ...prev].slice(0, 50));

      // Leads
      supabase
        .channel("lead-activity")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "lead" },
          (payload) => {
            addEvent({
              id: `lead-${payload.new.id}-${Date.now()}`,
              type: "lead",
              action: "created",
              status: payload.new.status,
              timestamp: payload.new.created_at,
              description: `New lead created: ${payload.new.customer_name} (${payload.new.status})`,
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "lead" },
          (payload) => {
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
          }
        )
        .subscribe();

      // Quotes
      supabase
        .channel("quote-activity")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "quote" },
          (payload) => {
            addEvent({
              id: `quote-${payload.new.id}-${Date.now()}`,
              type: "quote",
              action: "created",
              status: payload.new.status,
              timestamp: payload.new.created_at,
              description: `New quote added: ${payload.new.contact_name} (${payload.new.status})`,
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "quote" },
          (payload) => {
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
          }
        )
        .subscribe();

      // Invoices (using number)
      supabase
        .channel("invoice-activity")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "invoice" },
          (payload) => {
            addEvent({
              id: `invoice-${payload.new.id}-${Date.now()}`,
              type: "invoice",
              action: "created",
              status: payload.new.status,
              timestamp: payload.new.created_at,
              description: `New invoice generated: #${payload.new.number} (${payload.new.status})`,
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "invoice" },
          (payload) => {
            if (payload.old.status !== payload.new.status) {
              addEvent({
                id: `invoice-${payload.new.id}-${Date.now()}`,
                type: "invoice",
                action: "status_changed",
                status: payload.new.status,
                timestamp: new Date().toISOString(),
                description: `Invoice #${payload.new.number} status changed: ${payload.old.status} → ${payload.new.status}`,
              });
            }
          }
        )
        .subscribe();
    };

    setupRealtime();
  }, []);

  // ---------------- Helpers ----------------
  const getIcon = (type: string) => {
    switch (type) {
      case "lead":
        return <Users className="w-4 h-4 text-blue-500" />;
      case "quote":
        return <FileText className="w-4 h-4 text-green-500" />;
      case "invoice":
        return <Receipt className="w-4 h-4 text-amber-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "lead":
        return "default";
      case "quote":
        return "secondary";
      case "invoice":
        return "outline";
      default:
        return "secondary";
    }
  };

  // ---------------- Render ----------------
  return (
    <Card className="w-full h-full flex flex-col border border-gray-200 bg-white rounded-2xl shadow-sm">
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
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 border-b last:border-0 pb-3 last:pb-0"
                >
                  {getIcon(a.type)}
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{a.description}</span>
                      <Badge
                        variant={getBadgeVariant(a.type)}
                        className="text-[10px] uppercase"
                      >
                        {a.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {timeAgo(a.timestamp)}
                    </div>
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
