import { supabaseServer } from "../supabase/server";

export async function getLeadCount(): Promise<number> {
  const supabase = supabaseServer();

  const { count, error } = await supabase
    .from("lead")
    .select("*", { count: "exact", head: true })
    .in("status", ["opened", "new"]);

  if (error) {
    console.error("Lead count error:", error);
    return 0;
  }
  return count ?? 0;
}
