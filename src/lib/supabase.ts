import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

export type Company = { id: string; name: string };
export type StockRow = {
  id: string;
  item_id: string;
  company_id: string;
  quantity: number;
  companies: Company | null;
};
export type Item = { id: string; name: string; stock: StockRow[] };
