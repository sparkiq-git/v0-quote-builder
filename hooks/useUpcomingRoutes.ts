import { useEffect, useState } from "react";
import { getUpcomingRoutes } from "@/lib/supabase/queries/getUpcomingRoutes";

export function useUpcomingRoutes(limit = 10) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await getUpcomingRoutes(limit);
        if (active) setRoutes(data);
      } catch (err: any) {
        if (active) setError(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [limit]);

  return { routes, loading, error };
}
