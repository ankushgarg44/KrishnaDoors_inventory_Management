"use client";

import { useMemo, useState } from "react";
import { getSupabase, type Company, type Item } from "@/lib/supabase";
import { Button, Empty, Field, Sheet, inputCls } from "./ui";
import { friendly } from "./ItemsView";

type Props = {
  companies: Company[];
  items: Item[];
  reload: () => Promise<void>;
};

export default function CompaniesView({ companies, items, reload }: Props) {
  const supabase = getSupabase()!;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Company | "new" | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // company id -> list of { item name, qty }
  const byCompany = useMemo(() => {
    const m = new Map<string, { item: string; qty: number }[]>();
    for (const i of items)
      for (const r of i.stock) {
        const list = m.get(r.company_id) ?? [];
        list.push({ item: i.name, qty: r.quantity });
        m.set(r.company_id, list);
      }
    return m;
  }, [items]);

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  function startEdit(c: Company | "new") {
    setEditing(c);
    setName(c === "new" ? "" : c.name);
    setErr(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } =
      editing === "new"
        ? await supabase.from("companies").insert({ name: name.trim() })
        : await supabase
            .from("companies")
            .update({ name: name.trim() })
            .eq("id", (editing as Company).id);
    setBusy(false);
    if (error) return setErr(friendly(error));
    setEditing(null);
    reload();
  }

  async function remove() {
    if (editing === "new" || !editing) return;
    const n = byCompany.get(editing.id)?.length ?? 0;
    if (
      !confirm(
        n
          ? `Delete "${editing.name}"? Its stock in ${n} item(s) will be removed.`
          : `Delete "${editing.name}"?`,
      )
    )
      return;
    setBusy(true);
    const { error } = await supabase.from("companies").delete().eq("id", editing.id);
    setBusy(false);
    if (error) return setErr(friendly(error));
    setEditing(null);
    reload();
  }

  return (
    <>
      <input
        className={`${inputCls} mb-4`}
        placeholder="Search companies…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {filtered.length === 0 ? (
        <Empty>
          {companies.length === 0
            ? "No companies yet. Tap + to add one."
            : "Nothing matches your search."}
        </Empty>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => {
            const rows = byCompany.get(c.id) ?? [];
            const total = rows.reduce((s, r) => s + r.qty, 0);
            const isOpen = open === c.id;
            return (
              <li key={c.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <button
                  className="flex w-full items-center gap-3 p-4 text-left active:bg-slate-50"
                  onClick={() => setOpen(isOpen ? null : c.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="text-sm text-slate-500">
                      {rows.length} {rows.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
                    {total}
                  </span>
                  <span className={`text-slate-400 transition ${isOpen ? "rotate-90" : ""}`}>›</span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4">
                    {rows.length === 0 ? (
                      <p className="py-3 text-sm text-slate-500">No items for this company.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {rows
                          .sort((a, b) => a.item.localeCompare(b.item))
                          .map((r) => (
                            <li key={r.item} className="flex justify-between py-2.5">
                              <span className="truncate">{r.item}</span>
                              <span
                                className={`font-semibold tabular-nums ${
                                  r.qty === 0 ? "text-red-600" : ""
                                }`}
                              >
                                {r.qty}
                              </span>
                            </li>
                          ))}
                      </ul>
                    )}
                    <Button variant="secondary" className="mt-2" onClick={() => startEdit(c)}>
                      Edit company
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button
        aria-label="Add company"
        onClick={() => startEdit("new")}
        className="fixed bottom-24 right-[max(1rem,calc(50%-14rem+1rem))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-3xl text-white shadow-lg active:scale-95"
      >
        +
      </button>

      <Sheet
        open={editing !== null}
        title={editing === "new" ? "New company" : "Edit company"}
        onClose={() => setEditing(null)}
      >
        <form onSubmit={save}>
          <Field label="Company name">
            <input
              className={inputCls}
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
          <Button type="submit" disabled={busy || !name.trim()}>
            Save
          </Button>
          {editing !== "new" && (
            <Button type="button" variant="danger" className="mt-2" disabled={busy} onClick={remove}>
              Delete company
            </Button>
          )}
        </form>
      </Sheet>
    </>
  );
}
