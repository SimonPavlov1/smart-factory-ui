import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import GadgetsBase from "./components/GadgetsBase.jsx";
import InventoryBase from "./components/InventoryBase.jsx";
import ManufacturingPage from "./components/ManufacturingPage";
import { clearToken, getToken, installAuthFetch, setToken } from "./api";
import "./index.css";

installAuthFetch();

const ROLE_LABELS = {
  admin: "Администратор",
  warehouse: "Кладовщик",
  manager: "Менеджер",
  engineer: "Технолог",
  procurement: "Закупщик",
  accounting: "Бухгалтерия",
  assembler: "Сборщик",
  tester: "Тестировщик",
  repair_engineer: "Инженер-наладчик",
  packer: "Упаковщик",
  production: "Производство",
};

const TASK_PAGE = {
  procurement_purchase: "Все заявки",
  accounting_payment: "Все заявки",
  warehouse_receive_components: "Склад ТМЦ",
  warehouse_issue_materials: "Производство",
  assembler_receive_materials: "Производство",
  assembler_build: "Производство",
  tester_check: "Производство",
  repair_defects: "Производство",
  packer_pack: "Производство",
  warehouse_finished_goods: "Склад ТМЦ",
};

const TASK_STATUS_LABELS = {
  assigned: "Назначена",
  in_progress: "В работе",
  waiting_delivery: "Ожидание комплектующих",
  done: "Закрыта",
  open: "Открыта",
};

function isPastDate(value) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date < today;
}

function taskExpectedDates(task) {
  const payload = task.payload || {};
  return [
    payload.expected_date,
    ...(payload.shortages || []).map((item) => item.expected_date),
    ...(payload.purchases || []).filter((item) => Number(item.received_qty || 0) < Number(item.qty || 0)).map((item) => item.expected_date),
  ].filter(Boolean);
}

function taskDisplayStatus(task) {
  const expectedDates = taskExpectedDates(task);
  if (task.status !== "done" && expectedDates.some(isPastDate)) return "Задержка поставки";
  if (task.status !== "done" && task.type === "warehouse_receive_components" && expectedDates.length > 0) return "Ожидание комплектующих";
  return TASK_STATUS_LABELS[task.status] || task.status;
}

function taskStatusClass(task) {
  return taskDisplayStatus(task) === "Задержка поставки"
    ? "bg-red-50 text-red-700 border-red-100"
    : "bg-blue-50 text-blue-600 border-blue-100";
}

function canManageTasks(user) {
  return ["admin", "manager"].includes(user?.role);
}

function apiErrorMessage(data, fallback) {
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((item) => {
      const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "поле";
      return `${field}: ${item.msg}`;
    }).join("; ");
  }
  return fallback;
}

function defaultCompletionPayload(task) {
  if (task.type === "procurement_purchase") {
    return {
      deliveries: (task.payload?.shortages || []).map((item) => ({
        component_id: item.component_id,
        qty: "",
        expected_date: "",
        invoice: "",
        invoice_file: null,
        invoice_file_name: "",
        supplier: "",
        comment: "",
      })),
    };
  }
  if (task.type === "warehouse_receive_components") {
    return {
      items: (task.payload?.shortages || []).map((item) => ({ component_id: item.component_id, qty: "" })),
    };
  }
  if (task.type === "assembler_build") return { assembled_qty: "" };
  if (task.type === "tester_check") return { passed_qty: "", defective_qty: "0", notes: "" };
  if (task.type === "repair_defects") return { notes: "" };
  if (task.type === "packer_pack") return { packed_qty: "" };
  if (task.type === "accounting_payment") return { payment_ref: "", notes: "" };
  return {};
}

function PayloadField({ label, name, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function componentTitle(item) {
  const details = [item.part_number, item.value, item.package].filter(Boolean).join(" · ");
  return details ? `${item.component_name || `Компонент ID ${item.component_id}`} (${details})` : item.component_name || `Компонент ID ${item.component_id}`;
}

function assigneeName(task) {
  if (!task.assigned_user) return "Группа";
  return task.assigned_user.full_name || task.assigned_user.username;
}

function TaskCard({ task, onOpenTask, onOpen }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Заказ #{task.order_id || "—"} · {ROLE_LABELS[task.role] || task.role}
          </div>
          <h3 className="text-sm font-black text-slate-900 mt-1">{task.title}</h3>
          <div className="text-[11px] text-slate-400 mt-1">Исполнитель: {assigneeName(task)}</div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${taskStatusClass(task)}`}>
          {taskDisplayStatus(task)}
        </span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{task.description}</p>
      {task.payload?.shortages?.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[11px] text-red-700">
          Дефицит: {task.payload.shortages.length} поз.
        </div>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button onClick={() => onOpen(TASK_PAGE[task.type] || "Мои задачи")} className="text-xs font-bold text-blue-600 hover:text-blue-700">Открыть раздел</button>
        <button onClick={() => onOpenTask(task.id)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Открыть задачу</button>
      </div>
    </div>
  );
}

function TaskDetailModal({ taskId, user, onClose, onChanged }) {
  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [note, setNote] = useState("");
  const [completionPayload, setCompletionPayload] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const data = await res.json();
      setTask(data);
      setCompletionPayload({ ...defaultCompletionPayload(data), ...(data.payload?.completion || {}) });
    }
  };

  useEffect(() => { load(); }, [taskId]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!task || !canManageTasks(user)) return;
      const res = await fetch(`/api/users?role=${encodeURIComponent(task.role)}`);
      if (res.ok) setUsers(await res.json());
    };
    loadUsers();
  }, [task?.id, task?.role, user?.role]);

  const changePayload = (name, value) => {
    setCompletionPayload((current) => ({ ...current, [name]: value }));
  };

  const changeLineQty = (componentId, value) => {
    setCompletionPayload((current) => {
      const items = current.items || [];
      const exists = items.some((item) => item.component_id === componentId);
      const nextItems = exists
        ? items.map((item) => item.component_id === componentId ? { ...item, qty: value } : item)
        : [...items, { component_id: componentId, qty: value }];
      return { ...current, items: nextItems };
    });
  };

  const changeDelivery = (index, patch) => {
    setCompletionPayload((current) => {
      const deliveries = [...(current.deliveries || [])];
      deliveries[index] = { ...deliveries[index], ...patch };
      return { ...current, deliveries };
    });
  };

  const addDelivery = (componentId) => {
    setCompletionPayload((current) => ({
      ...current,
      deliveries: [
        ...(current.deliveries || []),
        { component_id: componentId, qty: "", expected_date: "", invoice: "", invoice_file: null, invoice_file_name: "", supplier: "", comment: "" },
      ],
    }));
  };

  const removeDelivery = (index) => {
    setCompletionPayload((current) => ({
      ...current,
      deliveries: (current.deliveries || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const res = await fetch(`/api/tasks/${taskId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (res.ok) {
      setNote("");
      load();
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: formData });
    if (res.ok) load();
  };

  const takeTask = async () => {
    setError("");
    const res = await fetch(`/api/tasks/${taskId}/take`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось взять задачу в работу");
      return;
    }
    onChanged();
    load();
  };

  const assignTask = async (userId) => {
    setError("");
    const res = await fetch(`/api/tasks/${taskId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId ? Number(userId) : null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось назначить исполнителя");
      return;
    }
    onChanged();
    load();
  };

  const addPurchase = async (delivery) => {
    setError("");
    const qty = Number(delivery.qty || 0);
    if (!qty) {
      setError("Укажите количество закупки");
      return;
    }

    const { invoice_file, invoice_file_name, ...purchasePayload } = delivery;
    const res = await fetch(`/api/tasks/${taskId}/procurement-purchases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...purchasePayload, qty }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось добавить закупку");
      return;
    }
    if (invoice_file) await uploadFile(invoice_file);
    onChanged();
    load();
  };

  const downloadFile = async (file) => {
    const res = await fetch(`/api${file.url}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.original_name || "attachment";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const complete = async () => {
    setLoading(true);
    setError("");
    const numericPayload = { ...completionPayload };
    ["assembled_qty", "passed_qty", "defective_qty", "packed_qty"].forEach((key) => {
      if (numericPayload[key] !== undefined && numericPayload[key] !== "") numericPayload[key] = Number(numericPayload[key]);
    });
    if (Array.isArray(numericPayload.items)) {
      numericPayload.items = numericPayload.items
        .map((item) => ({ ...item, qty: Number(item.qty || 0) }))
        .filter((item) => item.qty > 0);
    }
    if (Array.isArray(numericPayload.deliveries)) {
      numericPayload.deliveries = numericPayload.deliveries
        .map((item) => ({ ...item, qty: Number(item.qty || 0) }))
        .filter((item) => item.qty > 0);
    }

    const res = await fetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: numericPayload }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      onChanged();
      if (data.result?.status === "partial") {
        load();
      } else {
        onClose();
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось завершить задачу");
    }
  };

  if (!task) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-sm text-slate-400">Загрузка задачи...</div>
      </div>
    );
  }

  const attachments = task.payload?.attachments || [];
  const notes = task.payload?.notes || [];
  const shortages = task.payload?.shortages || [];
  const purchases = task.payload?.purchases || [];
  const lineLabel = task.type === "procurement_purchase" ? "Закупить" : "Принять";
  const showComponentChecklist = ["procurement_purchase", "warehouse_receive_components"].includes(task.type);
  const deliveries = completionPayload.deliveries || [];
  const isAssignedToMe = task.assigned_user_id === user?.id;
  const canTake = ["assigned", "open"].includes(task.status) && (isAssignedToMe || (!task.assigned_user_id && (task.role === user?.role || canManageTasks(user))));
  const canComplete = ["in_progress", "open"].includes(task.status) && (canManageTasks(user) || task.assigned_user_id === user?.id);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Задача #{task.id} · Заказ #{task.order_id || "—"} · {ROLE_LABELS[task.role] || task.role}
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">{task.title}</h2>
            <p className="text-sm text-slate-500 mt-2">{task.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${taskStatusClass(task)}`}>
                {taskDisplayStatus(task)}
              </span>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-100">
                Исполнитель: {assigneeName(task)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}

          {(canTake || canManageTasks(user)) && !["done", "waiting_delivery"].includes(task.status) && (
            <section className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3 items-end">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Исполнитель</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {task.assigned_user ? `Назначен: ${assigneeName(task)}` : "Задача назначена группе. Исполнитель еще не выбран."}
                </p>
              </div>
              {canManageTasks(user) ? (
                <select
                  value={task.assigned_user_id || ""}
                  onChange={(e) => assignTask(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Не назначен</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>{item.full_name || item.username}</option>
                  ))}
                </select>
              ) : (
                <button onClick={takeTask} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
                  Взять в работу
                </button>
              )}
            </section>
          )}

          {task.type === "procurement_purchase" && purchases.length > 0 && (
            <section className="bg-white border border-slate-100 rounded-2xl p-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Закупки по задаче</h3>
              <div className="space-y-2">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_90px_90px_120px] gap-3 text-xs border-b border-slate-100 last:border-b-0 pb-2 last:pb-0">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-700 break-words">{componentTitle(purchase)}</div>
                      <div className="text-slate-400 mt-1 break-words">{[purchase.supplier, purchase.invoice, purchase.expected_date].filter(Boolean).join(" · ") || "Без реквизитов"}</div>
                    </div>
                    <div className="font-black text-slate-900">Заказано {purchase.qty}</div>
                    <div className="font-black text-emerald-700">Принято {purchase.received_qty || 0}</div>
                    <div className="text-slate-400 break-words">{purchase.comment || "—"}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {shortages.length > 0 && (
            <section className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-700 mb-3">
                {task.type === "procurement_purchase" ? "План закупки" : showComponentChecklist ? "Чеклист комплектующих" : "Дефицит комплектующих"}
              </h3>
              <div className="space-y-2">
                {shortages.map((item) => (
                  <div key={item.component_id} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px] gap-3 text-xs text-red-800 border-b border-red-100 last:border-b-0 pb-2 last:pb-0">
                    <div className="min-w-0">
                      <div className="font-bold break-words">{componentTitle(item)}</div>
                      <div className="text-red-600 mt-1">
                        Нужно {item.required_qty || item.qty || item.shortage_qty}, доступно {item.available_qty ?? "—"}, не хватает {item.shortage_qty || item.qty}
                      </div>
                      {(item.expected_date || item.invoice || item.supplier) && (
                        <div className="text-red-500 mt-1 break-words">
                          {[item.expected_date && `Дата ${item.expected_date}`, item.invoice && `Счет ${item.invoice}`, item.supplier].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    {task.type === "procurement_purchase" && (
                      <div className="md:col-span-2 space-y-2">
                        {deliveries.map((delivery, index) => delivery.component_id === item.component_id && (
                          <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[90px_140px_minmax(0,1fr)_minmax(0,1fr)_110px_90px_32px] gap-2 bg-white border border-red-100 rounded-xl p-2 min-w-0">
                            <input
                              type="number"
                              min="0"
                              max={item.shortage_qty || item.qty}
                              placeholder="Кол-во"
                              value={delivery.qty || ""}
                              onChange={(e) => changeDelivery(index, { qty: e.target.value })}
                              className="w-full min-w-0 p-2 border border-slate-100 rounded-lg text-xs outline-none focus:border-red-400"
                            />
                            <input
                              type="date"
                              value={delivery.expected_date || ""}
                              onChange={(e) => changeDelivery(index, { expected_date: e.target.value })}
                              className="w-full min-w-0 p-2 border border-slate-100 rounded-lg text-xs outline-none focus:border-red-400"
                            />
                            <input
                              placeholder="Счет / ссылка (можно пусто)"
                              value={delivery.invoice || ""}
                              onChange={(e) => changeDelivery(index, { invoice: e.target.value })}
                              className="w-full min-w-0 p-2 border border-slate-100 rounded-lg text-xs outline-none focus:border-red-400"
                            />
                            <input
                              placeholder="Поставщик / комментарий"
                              value={delivery.supplier || ""}
                              onChange={(e) => changeDelivery(index, { supplier: e.target.value })}
                              className="w-full min-w-0 p-2 border border-slate-100 rounded-lg text-xs outline-none focus:border-red-400"
                            />
                            <label className="w-full min-w-0 p-2 border border-slate-100 rounded-lg text-xs text-slate-500 bg-white cursor-pointer hover:border-red-400 truncate">
                              {delivery.invoice_file_name || "Файл счета"}
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) changeDelivery(index, { invoice_file: file, invoice_file_name: file.name });
                                }}
                              />
                            </label>
                            <button type="button" onClick={() => addPurchase(delivery)} className="bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest min-h-9">
                              Закупить
                            </button>
                            <button type="button" onClick={() => removeDelivery(index)} className="text-slate-300 hover:text-red-600 text-lg leading-none">×</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addDelivery(item.component_id)} className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-700">
                          Добавить поставку
                        </button>
                      </div>
                    )}
                    {task.type === "warehouse_receive_components" && (
                      <label className="block">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">{lineLabel}</span>
                        <input
                          type="number"
                          min="0"
                          max={item.shortage_qty || item.qty}
                          value={(completionPayload.items || []).find((line) => line.component_id === item.component_id)?.qty || ""}
                          onChange={(e) => changeLineQty(item.component_id, e.target.value)}
                          className="w-full p-2 border border-red-100 rounded-xl text-sm outline-none focus:border-red-400 bg-white"
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {task.type === "assembler_build" && <PayloadField label="Собрано изделий" name="assembled_qty" value={completionPayload.assembled_qty} onChange={changePayload} type="number" />}
            {task.type === "tester_check" && (
              <>
                <PayloadField label="Годных изделий" name="passed_qty" value={completionPayload.passed_qty} onChange={changePayload} type="number" />
                <PayloadField label="Бракованных изделий" name="defective_qty" value={completionPayload.defective_qty} onChange={changePayload} type="number" />
                <div className="md:col-span-2">
                  <PayloadField label="Комментарий тестировщика" name="notes" value={completionPayload.notes} onChange={changePayload} />
                </div>
              </>
            )}
            {task.type === "repair_defects" && <PayloadField label="Что исправлено" name="notes" value={completionPayload.notes} onChange={changePayload} />}
            {task.type === "packer_pack" && <PayloadField label="Упаковано изделий" name="packed_qty" value={completionPayload.packed_qty} onChange={changePayload} type="number" />}
            {task.type === "accounting_payment" && (
              <>
                <PayloadField label="Платеж / поручение" name="payment_ref" value={completionPayload.payment_ref} onChange={changePayload} />
                <PayloadField label="Комментарий бухгалтерии" name="notes" value={completionPayload.notes} onChange={changePayload} />
              </>
            )}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Вложения</h3>
              <input type="file" onChange={(e) => uploadFile(e.target.files?.[0])} className="text-xs" />
              <div className="mt-3 space-y-2">
                {attachments.length === 0 && <p className="text-xs text-slate-400">Файлов нет.</p>}
                {attachments.map((file) => (
                  <button key={file.stored_name} onClick={() => downloadFile(file)} className="block text-left text-xs text-blue-600 hover:text-blue-700">
                    {file.original_name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Отметки</h3>
              <div className="flex gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Добавить отметку..." className="flex-1 p-2 border border-slate-200 rounded-xl text-xs" />
                <button onClick={addNote} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">OK</button>
              </div>
              <div className="mt-3 space-y-2">
                {notes.length === 0 && <p className="text-xs text-slate-400">Отметок нет.</p>}
                {notes.map((item, index) => (
                  <div key={index} className="text-xs bg-slate-50 border border-slate-100 rounded-xl p-2">
                    <div className="font-bold text-slate-700">{item.author} · {ROLE_LABELS[item.role] || item.role}</div>
                    <div className="text-slate-500 mt-1">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-between items-center">
          <button onClick={() => onClose()} className="text-xs font-bold text-slate-500">Закрыть</button>
          {task.status !== "done" && task.type !== "procurement_purchase" && (
            canComplete ? (
              <button onClick={complete} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
                {loading ? "Сохранение..." : "Отметить выполненной"}
              </button>
            ) : canTake ? (
              <button onClick={takeTask} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
                Взять в работу
              </button>
            ) : (
              <span className="text-xs font-bold text-slate-400">Ожидает исполнителя</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function useTasks(endpoint) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      if (res.ok) setTasks(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [endpoint]);
  return { tasks, loading, reload: load };
}

function TaskList({ endpoint, user, onOpenPage, title, subtitle }) {
  const { tasks, loading, reload } = useTasks(endpoint);
  const [activeTaskId, setActiveTaskId] = useState(null);

  return (
    <div className="p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      {loading ? (
        <div className="text-sm text-slate-400">Загрузка задач...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400">Открытых задач нет.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={onOpenPage}
              onOpenTask={setActiveTaskId}
            />
          ))}
        </div>
      )}
      {activeTaskId && (
        <TaskDetailModal
          taskId={activeTaskId}
          user={user}
          onClose={() => setActiveTaskId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}

const Dashboard = ({ user, onOpenPage }) => {
  const { tasks, reload } = useTasks("/api/tasks/mine");
  const [activeTaskId, setActiveTaskId] = useState(null);
  const areaCounts = tasks.reduce((acc, task) => {
    const key = ROLE_LABELS[task.role] || task.role;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Панель</h1>
        <p className="text-sm text-slate-500 mt-2">
          {user.full_name || user.username} · {ROLE_LABELS[user.role] || user.role}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Мои задачи</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{tasks.length}</p>
        </div>
        {Object.entries(areaCounts).map(([area, count]) => (
          <div key={area} className="bg-white border border-slate-100 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{area}</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{count}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-slate-900">Ближайшие задачи</h2>
          <button onClick={() => onOpenPage("Мои задачи")} className="text-xs font-bold text-blue-600">Все мои задачи</button>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {tasks.slice(0, 4).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={onOpenPage}
              onOpenTask={setActiveTaskId}
            />
          ))}
        </div>
      </section>
      {activeTaskId && (
        <TaskDetailModal
          taskId={activeTaskId}
          user={user}
          onClose={() => setActiveTaskId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
};

const AllApplications = ({ user, onOpenPage }) => (
  <TaskList
    endpoint={["admin", "manager"].includes(user.role) ? "/api/tasks?status=all" : "/api/tasks/mine?status=all"}
    title="Все заявки"
    subtitle="Цепочка workflow-задач"
    user={user}
    onOpenPage={onOpenPage}
  />
);
const MyTasks = ({ user, onOpenPage }) => <TaskList endpoint="/api/tasks/mine" user={user} title="Мои задачи" subtitle={`${ROLE_LABELS[user.role] || user.role}: персональная очередь работ`} onOpenPage={onOpenPage} />;

function LoginPage({ onLogin, theme, onToggleTheme }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Не удалось войти");
      }

      const data = await res.json();
      setToken(data.access_token);
      const me = await fetch("/api/auth/me");
      if (!me.ok) throw new Error("Не удалось получить профиль");
      onLogin(await me.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`app-shell min-h-screen flex items-center justify-center p-6 ${theme === "dark" ? "theme-dark" : ""}`}>
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-[28px] border border-slate-100 shadow-sm p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Вход в MES</h1>
          <p className="text-xs text-slate-400 mt-1">Введите учетные данные пользователя</p>
        </div>

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Логин</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
        </div>

        <button disabled={loading} className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold text-xs uppercase tracking-widest disabled:bg-slate-300">
          {loading ? "Вход..." : "Войти"}
        </button>

        <button type="button" onClick={onToggleTheme} className="app-theme-toggle">
          {theme === "dark" ? "Ночная тема" : "Дневная тема"}
        </button>

        <p className="text-[11px] text-slate-400">Первичная dev-учетка: admin / admin123, если база пользователей пустая.</p>
      </form>
    </div>
  );
}

function Personnel() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", role: "manager" });
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setError("");
    const username = form.username.trim();
    const fullName = form.full_name.trim();

    if (username.length < 3) {
      setError("Логин должен быть не короче 3 символов");
      return;
    }
    if (form.password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, username, full_name: fullName || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(apiErrorMessage(data, "Не удалось создать пользователя"));
      return;
    }
    setForm({ username: "", password: "", full_name: "", role: "manager" });
    fetchUsers();
  };

  const updateUser = async (user, patch) => {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, ...patch, password: undefined }),
    });
    if (res.ok) fetchUsers();
  };

  return (
    <div className="p-10 space-y-6">
      <h1 className="text-2xl font-black text-slate-900">Пользователи и роли</h1>

      <form onSubmit={createUser} className="bg-white border border-slate-100 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input required minLength={3} placeholder="Логин" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="p-3 border rounded-xl text-sm" />
        <input required minLength={6} placeholder="Пароль от 6 символов" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="p-3 border rounded-xl text-sm" />
        <input placeholder="Имя" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="p-3 border rounded-xl text-sm" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="p-3 border rounded-xl text-sm">
          {Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
        </select>
        <button className="bg-slate-900 text-white rounded-xl text-xs font-bold uppercase">Создать</button>
      </form>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {users.map((user) => (
          <div key={user.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-4 border-b last:border-b-0">
            <div className="font-bold text-sm">{user.username}</div>
            <div className="text-sm text-slate-500">{user.full_name || "—"}</div>
            <select value={user.role} onChange={(e) => updateUser(user, { role: e.target.value })} className="p-2 border rounded-lg text-sm">
              {Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
            </select>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={user.is_active} onChange={(e) => updateUser(user, { is_active: e.target.checked })} />
              Активен
            </label>
            <div className="text-xs text-slate-400">ID {user.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("Панель");
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("smart_factory_theme");
    if (savedTheme) return savedTheme;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const logout = () => {
    clearToken();
    setUser(null);
  };

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  useEffect(() => {
    localStorage.setItem("smart_factory_theme", theme);
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const loadUser = async () => {
      if (!getToken()) {
        setBooting(false);
        return;
      }
      const res = await fetch("/api/auth/me");
      if (res.ok) setUser(await res.json());
      setBooting(false);
    };
    loadUser();
  }, []);

  const canOpen = (page) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (page === "Персонал") return false;
    if (["Панель", "Все заявки", "Мои задачи"].includes(page)) return true;
    if (page === "База изделий") return ["engineer", "manager", "production", "assembler", "tester", "repair_engineer"].includes(user.role);
    if (page === "Склад ТМЦ") return ["warehouse", "manager", "engineer", "procurement", "packer"].includes(user.role);
    if (page === "Производство") return ["warehouse", "manager", "production", "assembler", "tester", "repair_engineer", "packer", "procurement"].includes(user.role);
    return true;
  };

  const openPage = (page) => {
    setActivePage(canOpen(page) ? page : "Мои задачи");
  };

  const renderContent = () => {
    if (!canOpen(activePage)) return <Dashboard user={user} onOpenPage={openPage} />;

    switch (activePage) {
      case "Панель": return <Dashboard user={user} onOpenPage={openPage} />;
      case "Все заявки": return <AllApplications user={user} onOpenPage={openPage} />;
      case "Мои задачи": return <MyTasks user={user} onOpenPage={openPage} />;
      case "Персонал": return <Personnel />;
      case "База изделий": return <GadgetsBase />;
      case "Склад ТМЦ": return <InventoryBase user={user} />;
      case "Производство": return <ManufacturingPage />;
      default: return <Dashboard user={user} onOpenPage={openPage} />;
    }
  };

  if (booting) return <div className={`min-h-screen app-shell ${theme === "dark" ? "theme-dark" : ""}`} />;
  if (!user) return <LoginPage onLogin={setUser} theme={theme} onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")} />;

  return (
    <div className={`app-shell flex h-screen p-5 gap-5 ${theme === "dark" ? "theme-dark" : ""}`}>
      <Sidebar
        activePage={activePage}
        setActivePage={openPage}
        user={user}
        onLogout={logout}
        canOpen={canOpen}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
      />
      <main className="app-main">
        {renderContent()}
      </main>
    </div>
  );
}
