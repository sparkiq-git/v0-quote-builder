import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function getLeadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('lead')
    .select('*', { count: 'exact', head: true })
    .in('status', ['opened', 'new']);

  if (error) {
    console.error('Error fetching lead count:', error);
    return 0;
  }

  return count ?? 0;
}
