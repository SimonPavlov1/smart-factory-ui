import React, { useEffect, useState } from "react";

function hasRole(user, roles) {
  const userRoles = Array.isArray(user?.roles) && user.roles.length ? user.roles : user?.role ? [user.role] : [];
  return userRoles.some((role) => roles.includes(role));
}

export default function FinishedGoodsBase({ user }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [issueQty, setIssueQty] = useState("");
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const canIssue = hasRole(user, ["admin", "warehouse"]);

  const loadItems = async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/inventory/finished-goods?${params.toString()}`);
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => {
    const timer = setTimeout(loadItems, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!selected?.product_id) return;
    fetch(`/api/inventory/movements?product_id=${selected.product_id}&limit=200`)
      .then((res) => res.ok ? res.json() : { items: [] })
      .then((data) => setMovements(data.items || []));
  }, [selected?.product_id]);

  const issue = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/finished-goods/${selected.product_id}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: Number(issueQty), recipient, note: note || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Не удалось выдать продукцию");
        return;
      }
      setIssueQty(""); setRecipient(""); setNote("");
      await loadItems();
      const historyRes = await fetch(`/api/inventory/movements?product_id=${selected.product_id}&limit=200`);
      if (historyRes.ok) setMovements((await historyRes.json()).items || []);
      const updated = items.find((item) => item.product_id === selected.product_id);
      if (updated) setSelected({ ...selected, quantity: (selected.quantity || 0) - Number(issueQty) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none p-4 sm:p-6 lg:p-10">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-bold text-slate-400">Склад</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Склад готовой продукции</h1>
        <p className="mt-2 text-sm text-slate-500">Остатки изделий и полный журнал прихода и расхода.</p>
      </div>

      <div className="my-5 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию, артикулу или чертежу" className="min-h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) => (
          <button key={item.product_id} onClick={() => setSelected(item)} className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h2 className="truncate text-base font-black text-slate-900">{item.name}</h2><p className="mt-1 truncate font-mono text-xs text-slate-400">{item.sku || item.drawing_number || "Без артикула"}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${item.quantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>{item.quantity} шт.</span>
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-400">{item.location || "Finished Goods"}</p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-sm">
          <button className="hidden flex-1 md:block" onClick={() => setSelected(null)} aria-label="Закрыть" />
          <div className="h-full w-full max-w-3xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><p className="text-xs font-bold text-slate-400">Готовая продукция</p><h2 className="mt-1 text-xl font-black text-slate-900">{selected.name}</h2><p className="mt-2 text-sm font-bold text-emerald-700">Остаток: {selected.quantity} шт.</p></div><button onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Закрыть</button></div>

            {canIssue && (
              <form onSubmit={issue} className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                <h3 className="text-sm font-black text-rose-700">Выдать готовую продукцию</h3>
                {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input required type="number" min="0.0001" max={selected.quantity} step="any" value={issueQty} onChange={(e) => setIssueQty(e.target.value)} placeholder="Количество" className="rounded-xl border border-rose-100 bg-white p-3 text-sm outline-none" />
                  <input required value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Кому выдано" className="rounded-xl border border-rose-100 bg-white p-3 text-sm outline-none" />
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Примечание" className="rounded-xl border border-rose-100 bg-white p-3 text-sm outline-none sm:col-span-2" />
                </div>
                <button disabled={loading} className="mt-3 rounded-xl bg-rose-600 px-5 py-3 text-xs font-black text-white disabled:bg-slate-300">{loading ? "Сохранение…" : "Выдать и списать"}</button>
              </form>
            )}

            <div className="mt-6"><h3 className="text-sm font-black text-slate-900">История движения</h3><div className="mt-3 space-y-2">
              {movements.length ? movements.map((movement) => <div key={movement.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex justify-between gap-3"><p className={`font-black ${movement.direction === "incoming" ? "text-emerald-700" : "text-rose-700"}`}>{movement.direction === "incoming" ? "Приход" : "Расход"} · {movement.quantity} шт.</p><span className="text-xs font-bold text-slate-500">Остаток {movement.balance_after}</span></div><p className="mt-1 text-xs text-slate-400">{movement.created_at ? new Date(movement.created_at).toLocaleString("ru-RU") : "—"}{movement.order_id ? ` · Заказ №${movement.order_id}` : ""}{movement.task_id ? ` · Задача №${movement.task_id}` : ""}</p><p className="mt-2 text-xs text-slate-600">Операцию выполнил: <b>{movement.actor_name || "Не указан"}</b></p>{movement.direction === "outgoing" && <p className="mt-1 text-xs text-slate-600">Получатель: <b>{movement.counterparty_name || movement.recipient || "Не указан"}</b></p>}{movement.note && <p className="mt-1 text-xs text-slate-500">{movement.note}</p>}</div>) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">Движений пока нет.</div>}
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
}
