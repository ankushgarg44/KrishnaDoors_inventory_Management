"use client";

import { useMemo, useState } from "react";
import { getSupabase, type Company, type Item, type StockRow } from "@/lib/supabase";
import { Button, Empty, Field, Sheet, inputCls } from "./ui";

type Props = {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  companies: Company[];
  reload: () => Promise<void>;
};

const total = (i: Item) => i.stock.reduce((s, r) => s + r.quantity, 0);

export default function ItemsView({ items, setItems, companies, reload }: Props) {
  const supabase = getSupabase()!;
  const [q, setQ] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [linkFor, setLinkFor] = useState<Item | null>(null);
  const [editStock, setEditStock] = useState<{ item: Item; row: StockRow } | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(s) ||
        i.stock.some((r) => r.companies?.name.toLowerCase().includes(s)),
    );
  }, [items, q]);

  async function bump(row: StockRow, delta: number) {
    if (row.quantity + delta < 0) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id !== row.item_id
          ? i
          : {
              ...i,
              stock: i.stock.map((r) =>
                r.id === row.id ? { ...r, quantity: r.quantity + delta } : r,
              ),
            },
      ),
    );
    const { error } = await supabase.rpc("adjust_stock", {
      p_stock_id: row.id,
      p_delta: delta,
    });
    if (error) {
      alert(error.message);
      reload();
    }
  }

  return (
    <>
      <input
        className={`${inputCls} mb-4`}
        placeholder="Search items or companies…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {filtered.length === 0 ? (
        <Empty>
          {items.length === 0
            ? "No items yet. Tap + to add your first item."
            : "Nothing matches your search."}
        </Empty>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const t = total(item);
            const s = q.trim().toLowerCase();
            const companyMatch =
              !!s && item.stock.some((r) => r.companies?.name.toLowerCase().includes(s));
            const isOpen = openIds.has(item.id) || companyMatch;
            return (
              <li key={item.id} className="rounded-2xl bg-white shadow-sm">
                <div
                  className={`flex items-center gap-2 p-4 ${
                    isOpen ? "border-b border-slate-100 pb-3" : ""
                  }`}
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => toggle(item.id)}
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`shrink-0 text-lg text-slate-400 transition ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    >
                      ›
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold">
                        {item.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {item.stock.length}{" "}
                        {item.stock.length === 1 ? "company" : "companies"}
                      </span>
                    </span>
                  </button>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                      t === 0 ? "bg-red-50 text-red-600" : "bg-slate-100"
                    }`}
                  >
                    Total {t}
                  </span>
                  <button
                    aria-label="Edit item"
                    className="shrink-0 rounded-lg px-2 py-1 text-slate-400 active:bg-slate-100"
                    onClick={() => setEditItem(item)}
                  >
                    ✎
                  </button>
                </div>

                {isOpen && (<>
                <ul className="divide-y divide-slate-100 px-4">
                  {item.stock.map((row) => (
                    <li key={row.id} className="flex items-center gap-2 py-2.5">
                      <p className="min-w-0 flex-1 truncate text-slate-700">
                        {row.companies?.name ?? "—"}
                      </p>
                      <button
                        aria-label={`Decrease ${row.companies?.name}`}
                        className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-bold active:bg-slate-200 disabled:opacity-40"
                        disabled={row.quantity === 0}
                        onClick={() => bump(row, -1)}
                      >
                        −
                      </button>
                      <button
                        className={`h-10 min-w-12 rounded-xl px-2 text-lg font-bold tabular-nums active:bg-slate-100 ${
                          row.quantity === 0 ? "text-red-600" : ""
                        }`}
                        onClick={() => setEditStock({ item, row })}
                      >
                        {row.quantity}
                      </button>
                      <button
                        aria-label={`Increase ${row.companies?.name}`}
                        className="h-10 w-10 rounded-xl bg-slate-900 text-xl font-bold text-white active:bg-slate-700"
                        onClick={() => bump(row, 1)}
                      >
                        +
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  className="w-full rounded-b-2xl border-t border-slate-100 py-3 text-sm font-medium text-slate-600 active:bg-slate-50"
                  onClick={() => setLinkFor(item)}
                >
                  + Add company
                </button>
                </>)}
              </li>
            );
          })}
        </ul>
      )}

      <button
        aria-label="Add item"
        onClick={() => setAdding(true)}
        className="pb-safe fixed bottom-6 right-[max(1rem,calc(50%-14rem+1rem))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-3xl text-white shadow-lg active:scale-95"
      >
        +
      </button>

      <datalist id="company-names">
        {companies.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>

      <AddItemSheet
        open={adding}
        onClose={() => setAdding(false)}
        onDone={() => {
          setAdding(false);
          reload();
        }}
      />
      <EditItemSheet item={editItem} onClose={() => setEditItem(null)} reload={reload} />
      <LinkCompanySheet item={linkFor} onClose={() => setLinkFor(null)} reload={reload} />
      <StockSheet target={editStock} onClose={() => setEditStock(null)} reload={reload} />
    </>
  );
}

/** Find a company by name (case-insensitive) or create it. Returns its id. */
async function companyId(rawName: string) {
  const supabase = getSupabase()!;
  const name = rawName.trim().replace(/\s+/g, " ");
  const pattern = name.replace(/[\\%_]/g, (c) => "\\" + c);
  const { data: found, error: e1 } = await supabase
    .from("companies")
    .select("id")
    .ilike("name", pattern)
    .limit(1);
  if (e1) throw e1;
  if (found && found.length) return found[0].id as string;
  const { data, error } = await supabase
    .from("companies")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

type Line = { company: string; qty: string };
const blankLine = (): Line => ({ company: "", qty: "" });

function AddItemSheet({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const supabase = getSupabase()!;
  const [name, setName] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setName("");
    setLines([blankLine()]);
    setErr(null);
  }

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const filled = lines.filter((l) => l.company.trim());
    const names = filled.map((l) => l.company.trim().toLowerCase());
    if (new Set(names).size !== names.length)
      return setErr("The same company is listed twice.");
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("items")
        .insert({ name: name.trim() })
        .select("id")
        .single();
      if (error) throw error;
      for (const l of filled) {
        const cid = await companyId(l.company);
        const { error: e2 } = await supabase.from("stock").insert({
          item_id: data.id,
          company_id: cid,
          quantity: Math.max(0, parseInt(l.qty) || 0),
        });
        if (e2) throw e2;
      }
      reset();
      onDone();
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      title="New item"
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <form onSubmit={submit}>
        <Field label="Item name">
          <input
            className={inputCls}
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <p className="mb-1 text-sm font-medium text-slate-600">Companies & quantity</p>
        <div className="mb-2 space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <div className="min-w-0 flex-1">
                <input
                  className={inputCls}
                  placeholder="Company"
                  list="company-names"
                  value={l.company}
                  onChange={(e) => setLine(i, { company: e.target.value })}
                />
              </div>
              <div className="w-20 shrink-0">
              <input
                className={`${inputCls} text-center`}
                placeholder="Qty"
                type="number"
                inputMode="numeric"
                min={0}
                value={l.qty}
                onChange={(e) => setLine(i, { qty: e.target.value })}
              />
              </div>
              {lines.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove company row"
                  className="w-10 shrink-0 rounded-xl text-xl text-slate-400 active:bg-slate-100"
                  onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mb-4 text-sm font-medium text-slate-600"
          onClick={() => setLines((ls) => [...ls, blankLine()])}
        >
          + Another company
        </button>

        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
        <Button type="submit" disabled={busy || !name.trim()}>
          {busy ? "Saving…" : "Add item"}
        </Button>
      </form>
    </Sheet>
  );
}

function EditItemSheet({
  item,
  onClose,
  reload,
}: {
  item: Item | null;
  onClose: () => void;
  reload: () => Promise<void>;
}) {
  const supabase = getSupabase()!;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  if (item && item.id !== lastId) {
    setLastId(item.id);
    setName(item.name);
    setErr(null);
  }

  function close() {
    setLastId(null);
    onClose();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setBusy(true);
    const { error } = await supabase
      .from("items")
      .update({ name: name.trim() })
      .eq("id", item.id);
    setBusy(false);
    if (error) return setErr(friendly(error));
    close();
    reload();
  }

  async function remove() {
    if (!item || !confirm(`Delete "${item.name}" and all its stock?`)) return;
    setBusy(true);
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    setBusy(false);
    if (error) return setErr(friendly(error));
    close();
    reload();
  }

  return (
    <Sheet open={!!item} title="Edit item" onClose={close}>
      <form onSubmit={save}>
        <Field label="Item name">
          <input
            className={inputCls}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
        <Button type="submit" disabled={busy || !name.trim()}>
          Save
        </Button>
        <Button type="button" variant="danger" className="mt-2" disabled={busy} onClick={remove}>
          Delete item
        </Button>
      </form>
    </Sheet>
  );
}

function LinkCompanySheet({
  item,
  onClose,
  reload,
}: {
  item: Item | null;
  onClose: () => void;
  reload: () => Promise<void>;
}) {
  const supabase = getSupabase()!;
  const [company, setCompany] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function close() {
    setCompany("");
    setQty("");
    setErr(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const n = company.trim().toLowerCase();
    if (item.stock.some((r) => r.companies?.name.toLowerCase() === n))
      return setErr(`${company.trim()} is already on this item.`);
    setBusy(true);
    setErr(null);
    try {
      const cid = await companyId(company);
      const { error } = await supabase.from("stock").insert({
        item_id: item.id,
        company_id: cid,
        quantity: Math.max(0, parseInt(qty) || 0),
      });
      if (error) throw error;
      close();
      reload();
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!item} title={`Add company · ${item?.name ?? ""}`} onClose={close}>
      <form onSubmit={submit}>
        <Field label="Company">
          <input
            className={inputCls}
            required
            autoFocus
            list="company-names"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </Field>
        <Field label="Quantity">
          <input
            className={inputCls}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </Field>
        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
        <Button type="submit" disabled={busy || !company.trim()}>
          Add
        </Button>
      </form>
    </Sheet>
  );
}

function StockSheet({
  target,
  onClose,
  reload,
}: {
  target: { item: Item; row: StockRow } | null;
  onClose: () => void;
  reload: () => Promise<void>;
}) {
  const supabase = getSupabase()!;
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function close() {
    setAmount("");
    setErr(null);
    onClose();
  }

  const n = parseInt(amount);
  const valid = !isNaN(n) && n >= 0;

  async function run(fn: () => PromiseLike<{ error: unknown }>) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return setErr(friendly(error));
    close();
    reload();
  }

  if (!target) return null;
  const { item, row } = target;

  return (
    <Sheet open title={`${item.name} · ${row.companies?.name ?? ""}`} onClose={close}>
      <p className="mb-4 text-center">
        <span className="text-sm text-slate-500">Current quantity</span>
        <br />
        <span className="text-4xl font-bold tabular-nums">{row.quantity}</span>
      </p>
      <Field label="Amount">
        <input
          className={`${inputCls} text-center text-xl`}
          type="number"
          inputMode="numeric"
          min={0}
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="secondary"
          disabled={busy || !valid || n > row.quantity}
          onClick={() =>
            run(() => supabase.rpc("adjust_stock", { p_stock_id: row.id, p_delta: -n }))
          }
        >
          − Remove
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !valid}
          onClick={() =>
            run(() =>
              supabase
                .from("stock")
                .update({ quantity: n, updated_at: new Date().toISOString() })
                .eq("id", row.id),
            )
          }
        >
          Set
        </Button>
        <Button
          disabled={busy || !valid}
          onClick={() =>
            run(() => supabase.rpc("adjust_stock", { p_stock_id: row.id, p_delta: n }))
          }
        >
          + Add
        </Button>
      </div>
      <button
        className="mt-5 w-full text-sm text-red-600"
        disabled={busy}
        onClick={() => {
          if (confirm(`Remove ${row.companies?.name} from ${item.name}?`))
            run(() => supabase.from("stock").delete().eq("id", row.id));
        }}
      >
        Remove this company from item
      </button>
    </Sheet>
  );
}

function friendly(e: unknown): string {
  const err = e as { code?: string; message?: string };
  if (err?.code === "23505") return "That name already exists.";
  return err?.message ?? "Something went wrong";
}
