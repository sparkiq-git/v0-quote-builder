"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Op = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "is";
type Filter =
  | { col: string; op: Exclude<Op, "in" | "is">; value: string | number | boolean | Date }
  | { col: string; op: "in"; value: (string | number)[] }
  | { col: string; op: "is"; value: null | boolean };

type Options = {
  table: string;
  filters?: Filter[];
  schema?: string;        // default "public"
  realtime?: boolean;     // default true
  realtimeTable?: string; // defaults to `table`
  channelName?: string;   // optional override
};

export function useSupabaseCount({
  table,
  filters = [],
  schema = "public",
  realtime = true,
  realtimeTable,
  channelName,
}: Options) {
  const [supabase, setSupabase] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize supabase client on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initSupabase = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      setSupabase(createClient());
    };
    
    initSupabase();
  }, []);

  // Create a deterministic unique name per call
  const uniqueChannelName = useMemo(() => {
    if (channelName) return channelName;
    const hash = btoa(
      JSON.stringify({ table: realtimeTable ?? table, filters })
    ).slice(0, 12); // short & stable
    return `${schema}:${realtimeTable ?? table}-count-${hash}`;
  }, [schema, table, realtimeTable, filters, channelName]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    for (const f of filters) {
      switch (f.op) {
        case "eq":  q = q.eq(f.col, f.value as any); break;
        case "neq": q = q.neq(f.col, f.value as any); break;
        case "gt":  q = q.gt(f.col, f.value as any); break;
        case "gte": q = q.gte(f.col, f.value as any); break;
        case "lt":  q = q.lt(f.col, f.value as any); break;
        case "lte": q = q.lte(f.col, f.value as any); break;
        case "in":  q = q.in(f.col, (f as any).value); break;
        case "is":  q = q.is(f.col, (f as any).value); break;
      }
    }
    const { count, error } = await q;
    if (error) { setError(error.message); setCount(0); }
    else { setCount(count ?? 0); }
    setLoading(false);
  }, [supabase, table, filters]);

  useEffect(() => {
    if (!supabase) return;
    
    refresh();
    if (!realtime) return;

    const rtTable = realtimeTable ?? table;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        "postgres_changes",
        { event: "*", schema, table: rtTable },
        () => refresh()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refresh, supabase, table, realtime, realtimeTable, schema, uniqueChannelName]);

  return { count, loading, error, refresh };
}
