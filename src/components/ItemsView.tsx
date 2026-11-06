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
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
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
            const isOpen = open === item.id;
            const t = total(item);
            return (
              <li key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <button
                  className="flex w-full items-center gap-3 p-4 text-left active:bg-slate-50"
                  onClick={() => setOpen(isOpen ? null : item.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.name}</p>
                    <p className="text-sm text-slate-500">
                      {item.stock.length}{" "}
                      {item.stock.length === 1 ? "company" : "companies"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${
                      t === 0 ? "bg-red-50 text-red-600" : "bg-slate-100"
                    }`}
                  >
                    {t}
                  </span>
                  <span className={`text-slate-400 transition ${isOpen ? "rotate-90" : ""}`}>›</span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4">
                    {item.stock.length === 0 && (
                      <p className="py-3 text-sm text-slate-500">
                        No companies linked yet.
                      </p>
                    )}
                    <ul className="divide-y divide-slate-100">
                      {item.stock.map((row) => (
                        <li key={row.id} className="flex items-center gap-2 py-3">
                          <p className="min-w-0 flex-1 truncate">
                            {row.companies?.name ?? "—"}
                          </p>
                          <button
                            aria-label="Decrease"
                            className="h-11 w-11 rounded-xl bg-slate-100 text-xl font-bold active:bg-slate-200 disabled:opacity-40"
                            disabled={row.quantity === 0}
                            onClick={() => bump(row, -1)}
                          >
                            −
                          </button>
                          <button
                            className={`h-11 min-w-14 rounded-xl px-2 text-lg font-bold tabular-nums active:bg-slate-100 ${
                              row.quantity === 0 ? "text-red-600" : ""
                            }`}
                            onClick={() => setEditStock({ item, row })}
                          >
                            {row.quantity}
                          </button>
                          <button
                            aria-label="Increase"
                            className="h-11 w-11 rounded-xl bg-slate-900 text-xl font-bold text-white active:bg-slate-700"
                            onClick={() => bump(row, 1)}
                          >
                            +
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button variant="secondary" onClick={() => setLinkFor(item)}>
                        + Company
                      </Button>
                      <Button variant="secondary" onClick={() => setEditItem(item)}>
                        Edit item
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button
        aria-label="Add item"
        onClick={() => setAdding(true)}
        className="fixed bottom-24 right-[max(1rem,calc(50%-14rem+1rem))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-3xl text-white shadow-lg active:scale-95"
      >
        +
      </button>

      <AddItemSheet
        open={adding}
        onClose={() => setAdding(false)}
        companies={companies}
        onDone={async (id) => {
          setAdding(false);
          await reload();
          setOpen(id);
        }}
      />
      <EditItemSheet item={editItem} onClose={() => setEditItem(null)} reload={reload} />
      <LinkCompanySheet
        item={linkFor}
        companies={companies}
        onClose={() => setLinkFor(null)}
        reload={reload}
      />
      <StockSheet target={editStock} onClose={() => setEditStock(null)} reload={reload} />
    </>
  );
}

/** Pick an existing company or type a new one. Returns its id. */
async function resolveCompany(companyId: string, newName: string) {
  const supabase = getSupabase()!;
  if (companyId !== "__new") return companyId;
  const name = newName.trim();
  if (!name) throw new Error("Enter a company name");
  const { data: found } = await supabase
    .from("companies")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (found) return found.id as string;
  const { data, error } = await supabase
    .from("companies")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

function CompanyPicker({
  companies,
  value,
  onChange,
  newName,
  onNewName,
}: {
  companies: Company[];
  value: string;
  onChange: (v: string) => void;
  newName: string;
  onNewName: (v: string) => void;
}) {
  return (
    <>
      <Field label="Company">
        <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— None —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="__new">+ New company…</option>
        </select>
      </Field>
      {value === "__new" && (
        <Field label="New company name">
          <input
            className={inputCls}
            value={newName}
            onChange={(e) => onNewName(e.target.value)}
            autoFocus
          />
        </Field>
      )}
    </>
  );
}

function AddItemSheet({
  open,
  onClose,
  companies,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  onDone: (id: string) => void;
}) {
  const supabase = getSupabase()!;
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [qty, setQty] = useState("0");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function close() {
    setName("");
    setCompanyId("");
    setNewCompany("");
    setQty("0");
    setErr(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("items")
        .insert({ name: name.trim() })
        .select("id")
        .single();
      if (error) throw error;
      if (companyId) {
        const cid = await resolveCompany(companyId, newCompany);
        const { error: e2 } = await supabase.from("stock").insert({
          item_id: data.id,
          company_id: cid,
          quantity: Math.max(0, parseInt(qty) || 0),
        });
        if (e2) throw e2;
      }
      const id = data.id as string;
      close();
      onDone(id);
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} title="New item" onClose={close}>
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
        <CompanyPicker
          companies={companies}
          value={companyId}
          onChange={setCompanyId}
          newName={newCompany}
          onNewName={setNewCompany}
        />
        {companyId && (
          <Field label="Starting quantity">
            <input
              className={inputCls}
              type="number"
              inputMode="numeric"
              min={0}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
        )}
        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
        <Button type="submit" disabled={busy || !name.trim()}>
          Add item
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
    onClose();
    setLastId(null);
    reload();
  }

  async function remove() {
    if (!item || !confirm(`Delete "${item.name}" and all its stock?`)) return;
    setBusy(true);
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    setBusy(false);
    if (error) return setErr(friendly(error));
    onClose();
    setLastId(null);
    reload();
  }

  return (
    <Sheet
      open={!!item}
      title="Edit item"
      onClose={() => {
        onClose();
        setLastId(null);
      }}
    >
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
  companies,
  onClose,
  reload,
}: {
  item: Item | null;
  companies: Company[];
  onClose: () => void;
  reload: () => Promise<void>;
}) {
  const supabase = getSupabase()!;
  const [companyId, setCompanyId] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [qty, setQty] = useState("0");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const available = item
    ? companies.filter((c) => !item.stock.some((r) => r.company_id === c.id))
    : [];

  function close() {
    setCompanyId("");
    setNewCompany("");
    setQty("0");
    setErr(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item || !companyId) return;
    setBusy(true);
    setErr(null);
    try {
      const cid = await resolveCompany(companyId, newCompany);
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
    <Sheet open={!!item} title={`Add company to ${item?.name ?? ""}`} onClose={close}>
      <form onSubmit={submit}>
        <CompanyPicker
          companies={available}
          value={companyId}
          onChange={setCompanyId}
          newName={newCompany}
          onNewName={setNewCompany}
        />
        <Field label="Quantity">
          <input
            className={inputCls}
            type="number"
            inputMode="numeric"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </Field>
        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
        <Button type="submit" disabled={busy || !companyId}>
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

export function friendly(e: unknown): string {
  const err = e as { code?: string; message?: string };
  if (err?.code === "23505") return "That name already exists.";
  return err?.message ?? "Something went wrong";
}
