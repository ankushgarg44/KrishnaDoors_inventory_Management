"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase, type Company, type Item } from "@/lib/supabase";
import ItemsView from "./ItemsView";
import CompaniesView from "./CompaniesView";

export default function InventoryApp() {
  if (!getSupabase()) return <SetupNotice />;
  return <Main />;
}

function SetupNotice() {
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-2xl font-bold">Connect Supabase</h1>
      <p className="text-slate-600">
        Copy <code>.env.local.example</code> to <code>.env.local</code>, fill in
        your Supabase URL and anon key, then restart <code>npm run dev</code>.
      </p>
    </div>
  );
}

function Main() {
  const supabase = getSupabase()!;
  const [tab, setTab] = useState<"items" | "companies">("items");
  const [items, setItems] = useState<Item[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [it, co] = await Promise.all([
      supabase
        .from("items")
        .select(
          "id, name, stock(id, item_id, company_id, quantity, companies(id, name))",
        )
        .order("name"),
      supabase.from("companies").select("id, name").order("name"),
    ]);
    if (it.error || co.error) {
      setError((it.error ?? co.error)!.message);
    } else {
      setError(null);
      const list = (it.data as unknown as Item[]).map((i) => ({
        ...i,
        stock: [...i.stock].sort((a, b) =>
          (a.companies?.name ?? "").localeCompare(b.companies?.name ?? ""),
        ),
      }));
      setItems(list);
      setCompanies(co.data as Company[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-30 flex items-center bg-slate-900 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <h1 className="text-lg font-bold">
          Krishna Doors
        </h1>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <p className="py-10 text-center text-slate-400">Loading…</p>
        ) : tab === "items" ? (
          <ItemsView
            items={items}
            setItems={setItems}
            companies={companies}
            reload={reload}
          />
        ) : (
          <CompaniesView companies={companies} items={items} reload={reload} />
        )}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-md grid-cols-2">
          {(["items", "companies"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-col items-center gap-0.5 py-3 text-xs font-medium ${
                tab === t ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <span className="text-xl leading-none">
                {t === "items" ? "▦" : "⌂"}
              </span>
              {t === "items" ? "Items" : "Companies"}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
