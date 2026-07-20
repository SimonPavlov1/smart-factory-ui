import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import GadgetsBase from "./components/GadgetsBase.jsx";
import InventoryBase from "./components/InventoryBase.jsx";
import FinishedGoodsBase from "./components/FinishedGoodsBase.jsx";
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
  repair_issue_materials: "Производство",
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
  ready_to_issue: "Готово к выдаче",
  hold: "На холде",
  done: "Закрыта",
  open: "Открыта",
};

const TASK_KANBAN_COLUMNS = [
  { key: "assigned", title: "Назначены", description: "Нужно взять или назначить исполнителя" },
  { key: "in_progress", title: "В работе", description: "Задачи, которые уже выполняются" },
  { key: "hold", title: "Холд", description: "Пауза по решению исполнителя или менеджера" },
  { key: "waiting_delivery", title: "Ожидание", description: "Поставка или комплектующие еще не готовы" },
  { key: "delayed", title: "Задержка", description: "Плановая дата уже прошла" },
  { key: "done", title: "Готово", description: "Закрытые за последние 24 часа" },
];

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
  if (task.status === "hold") return "bg-amber-50 text-amber-700 border-amber-100";
  return taskDisplayStatus(task) === "Задержка поставки"
    ? "bg-red-50 text-red-700 border-red-100"
    : "bg-blue-50 text-blue-600 border-blue-100";
}

function taskKanbanColumn(task) {
  const displayStatus = taskDisplayStatus(task);
  if (displayStatus === "Задержка поставки") return "delayed";
  if (displayStatus === "Ожидание комплектующих") return "waiting_delivery";
  if (task.status === "open" || task.status === "assigned") return "assigned";
  if (task.status === "hold") return "hold";
  if (task.status === "waiting_delivery") return "waiting_delivery";
  if (task.status === "ready_to_issue") return "in_progress";
  if (task.status === "done") return "done";
  return "in_progress";
}

function canManageTasks(user) {
  return userHasRole(user, ["admin", "manager"]);
}

function userRoles(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.length ? roles : user?.role ? [user.role] : [];
}

function userHasRole(user, roles) {
  return userRoles(user).some((role) => roles.includes(role));
}

function roleListLabel(user) {
  return userRoles(user).map((role) => ROLE_LABELS[role] || role).join(", ");
}

function normalizePhoneInput(value) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  return value;
}

function defaultPhoneInput(value) {
  return value.trim() ? normalizePhoneInput(value) : "+7";
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
      invoice: "",
      expected_date: "",
      supplier: "",
      comment: "",
      invoice_file: null,
      invoice_file_name: "",
      deliveries: (task.payload?.shortages || []).map((item) => ({
        component_id: item.component_id,
        line_uid: item.line_uid,
        qty: "",
      })),
    };
  }
  if (task.type === "warehouse_receive_components") {
    return {
      closing_docs_file: null,
      closing_docs_file_name: "",
      comment: "",
      items: (task.payload?.shortages || []).map((item) => ({ component_id: item.component_id, line_uid: item.line_uid, qty: "" })),
    };
  }
  if (task.type === "assembler_build") {
    const context = task.payload?.product_context || {};
    const assignments = (task.payload?.assembly_assignments?.length ? task.payload.assembly_assignments : [{
      id: "default",
      product_id: context.product_id,
      product_name: context.product_name,
      drawing_number: context.drawing_number,
      user_id: task.assigned_user_id || "",
      planned_qty: task.payload?.planned_qty || context.qty || "",
      produced_qty: 0,
    }]).map((item) => ({
      id: item.id || "default",
      order_item_id: item.order_item_id || context.order_item_id,
      product_id: item.product_id || context.product_id,
      product_name: item.product_name || context.product_name,
      drawing_number: item.drawing_number || context.drawing_number,
      user_id: item.user_id || "",
      planned_qty: item.planned_qty ?? "",
      produced_qty: item.produced_qty || 0,
    }));
    return {
      assembled_qty: "",
      daily_qty: "",
      daily_comment: "",
      assembly_assignments: assignments,
      daily_entries: assignments.map((item) => ({
        assignment_id: item.id,
        user_id: item.user_id || "",
        qty: "",
        comment: "",
        transfer_from_user_id: "",
      })),
      extra_components: [],
      save_only: false,
    };
  }
  if (task.type === "tester_check") {
    return {
      passed_qty: "",
      defective_qty: "0",
      notes: "",
      defective_products: (task.payload?.product_lines || []).map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        drawing_number: item.drawing_number,
        defective_qty: "",
      })),
      test_checklist: (task.payload?.test_checklist || task.payload?.product_lines?.[0]?.test_checklist || []).map((item, index) => ({
        id: item.id || `check-${index + 1}`,
        label: item.label || String(item),
        checked: Boolean(item.checked),
      })),
    };
  }
  if (task.type === "repair_defects") return { notes: "", extra_components: [] };
  if (task.type === "packer_pack") return { packed_qty: "" };
  if (task.type === "accounting_payment") return { payment_ref: "", payment_order_file: null, payment_order_file_name: "", notes: "" };
  if (task.type === "warehouse_finished_goods") return { accepted_goods: [], notes: "" };
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

function lineProductLabel(item) {
  return item.product_name || item.product_context?.product_name || item.device || "Изделие не указано";
}

function taskFileUrl(file) {
  return `/api${file.url}`;
}

function productFileUrl(file) {
  return `/api/production${file.url}`;
}

function assigneeName(task) {
  if (!task.assigned_user) return "Группа";
  return task.assigned_user.full_name || task.assigned_user.username;
}

function TaskCard({
  task,
  onOpenTask,
  onOpen,
  compact = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging = false,
  dropPlacement = "",
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm transition-all ${
        compact ? "gap-3 p-4" : "gap-4 p-5"
      } ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "scale-[0.98] opacity-50" : ""}`}
    >
      {dropPlacement === "before" && (
        <div className="absolute -top-2 left-4 right-4 z-20 h-1 rounded-full bg-[#3F8CFF] shadow-[0_0_0_4px_rgba(63,140,255,0.14)]" />
      )}
      {dropPlacement === "after" && (
        <div className="absolute -bottom-2 left-4 right-4 z-20 h-1 rounded-full bg-[#3F8CFF] shadow-[0_0_0_4px_rgba(63,140,255,0.14)]" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Заказ #{task.order_id || "—"} · {ROLE_LABELS[task.role] || task.role}
          </div>
          <h3 className={`${compact ? "line-clamp-2" : ""} text-sm font-black text-slate-900 mt-1`}>{task.title}</h3>
          <div className="text-[11px] text-slate-400 mt-1">Исполнитель: {assigneeName(task)}</div>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border ${taskStatusClass(task)}`}>
          {taskDisplayStatus(task)}
        </span>
      </div>
      {!compact && <p className="text-xs text-slate-500 leading-relaxed">{task.description}</p>}
      {task.payload?.shortages?.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[11px] text-red-700">
          Дефицит: {task.payload.shortages.length} поз.
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
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
  const [bomComponentOptions, setBomComponentOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const load = async () => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const data = await res.json();
      setTask(data);
      setCompletionPayload(
        data.type === "assembler_build"
          ? defaultCompletionPayload(data)
          : { ...defaultCompletionPayload(data), ...(data.payload?.completion || {}) }
      );
    }
  };

  useEffect(() => { load(); }, [taskId]);

  useEffect(() => {
    const loadBomOptions = async () => {
      if (!["repair_defects", "assembler_build"].includes(task?.type) || !task.order_id || task.payload?.component_options?.length) return;
      if (task.type === "assembler_build" && task.payload?.product_context?.product_id) {
        setBomComponentOptions([]);
        return;
      }
      const res = await fetch(`/api/manufacturing/orders/${task.order_id}/bom-summary`);
      if (!res.ok) return;
      const rows = await res.json();
      const optionsById = {};
      rows.forEach((row) => {
        if (!row.component_id) return;
        const current = optionsById[row.component_id];
        const qty = Number(row.qty || 0);
        if (current) {
          current.required_qty += qty;
          return;
        }
        optionsById[row.component_id] = {
          component_id: row.component_id,
          component_name: row.name,
          part_number: row.sku && row.sku !== "—" ? row.sku : "",
          category: row.category,
          required_qty: qty,
          device: row.device,
          assembly: row.assembly,
          designators: row.designators,
        };
      });
      setBomComponentOptions(Object.values(optionsById).sort((a, b) => `${a.category || ""}${a.component_name}`.localeCompare(`${b.category || ""}${b.component_name}`)));
    };
    loadBomOptions();
  }, [task?.id, task?.type, task?.order_id]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!task || (!canManageTasks(user) && task.type !== "assembler_build")) return;
      const endpoint = canManageTasks(user) ? "/api/users" : "/api/tasks/assignees";
      const res = await fetch(`${endpoint}?role=${encodeURIComponent(task.role)}`);
      if (res.ok) setUsers(await res.json());
    };
    loadUsers();
  }, [task?.id, task?.role, user?.role, JSON.stringify(user?.roles || [])]);

  const changePayload = (name, value) => {
    setCompletionPayload((current) => ({ ...current, [name]: value }));
  };

  const changeLineQty = (componentId, value, lineUid = "") => {
    setCompletionPayload((current) => {
      const items = current.items || [];
      const exists = items.some((item) => lineUid ? item.line_uid === lineUid : item.component_id === componentId);
      const nextItems = exists
        ? items.map((item) => (lineUid ? item.line_uid === lineUid : item.component_id === componentId) ? { ...item, qty: value } : item)
        : [...items, { component_id: componentId, line_uid: lineUid, qty: value }];
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

  const changeChecklist = (index, checked) => {
    setCompletionPayload((current) => {
      const checklist = [...(current.test_checklist || [])];
      checklist[index] = { ...checklist[index], checked };
      return { ...current, test_checklist: checklist };
    });
  };

  const addExtraComponent = () => {
    setCompletionPayload((current) => ({
      ...current,
      extra_components: [...(current.extra_components || []), { component_id: "", component_query: "", qty: "", reason: "" }],
    }));
  };

  const changeExtraComponent = (index, patch) => {
    setCompletionPayload((current) => {
      const items = [...(current.extra_components || [])];
      items[index] = { ...items[index], ...patch };
      return { ...current, extra_components: items };
    });
  };

  const repairComponentMatches = (query) => {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return [];
    return repairComponentOptions.filter((component) => [
      component.designators,
      component.component_name,
      component.part_number,
      component.value,
      component.package,
      component.category,
      component.device,
      component.assembly,
    ].filter(Boolean).join(" ").toLowerCase().includes(normalized)).slice(0, 10);
  };

  const changeAcceptedGood = (productId, qty) => {
    setCompletionPayload((current) => {
      const accepted = current.accepted_goods || [];
      const exists = accepted.some((item) => item.product_id === productId);
      const next = exists
        ? accepted.map((item) => item.product_id === productId ? { ...item, qty } : item)
        : [...accepted, { product_id: productId, qty }];
      return { ...current, accepted_goods: next };
    });
  };

  const changeDefectiveProduct = (productId, qty) => {
    setCompletionPayload((current) => {
      const defectiveProducts = current.defective_products || [];
      const exists = defectiveProducts.some((item) => item.product_id === productId);
      const productLine = (task?.payload?.product_lines || []).find((item) => item.product_id === productId);
      const maxQty = Number(productLine?.qty || 0);
      const normalizedQty = qty === "" ? "" : String(Math.min(Math.max(Number(qty || 0), 0), maxQty || Number(qty || 0)));
      const next = exists
        ? defectiveProducts.map((item) => item.product_id === productId ? { ...item, defective_qty: normalizedQty } : item)
        : [...defectiveProducts, {
            product_id: productId,
            product_name: productLine?.product_name,
            drawing_number: productLine?.drawing_number,
            defective_qty: normalizedQty,
          }];
      const totalDefective = next.reduce((sum, item) => sum + Number(item.defective_qty || 0), 0);
      const totalQty = (task?.payload?.product_lines || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
      return { ...current, defective_products: next, defective_qty: String(totalDefective), passed_qty: String(Math.max(totalQty - totalDefective, 0)) };
    });
  };

  const addAssemblyAssignment = () => {
    setCompletionPayload((current) => {
      const productLines = task?.payload?.product_lines || [];
      const context = productLines[0] || task?.payload?.product_context || {};
      const key = context.order_item_id || context.product_id;
      const alreadyPlanned = (current.assembly_assignments || []).reduce((sum, item) => (
        (item.order_item_id || item.product_id) === key ? sum + Number(item.planned_qty || 0) : sum
      ), 0);
      const remainingQty = Math.max(Number(context.qty || 0) - alreadyPlanned, 0);
      const assignment = {
        id: `new-${Date.now()}`,
        order_item_id: context.order_item_id,
        product_id: context.product_id,
        product_name: context.product_name,
        drawing_number: context.drawing_number,
        user_id: "",
        planned_qty: remainingQty ? String(remainingQty) : "",
        produced_qty: 0,
      };
      return {
        ...current,
        assembly_assignments: [...(current.assembly_assignments || []), assignment],
        daily_entries: [...(current.daily_entries || []), {
          assignment_id: assignment.id,
          user_id: "",
          qty: "",
          comment: "",
          transfer_from_user_id: "",
        }],
      };
    });
  };

  const changeAssemblyAssignment = (assignmentId, patch) => {
    setCompletionPayload((current) => ({
      ...current,
      assembly_assignments: (current.assembly_assignments || []).map((item) => (
        item.id === assignmentId ? { ...item, ...patch } : item
      )),
      daily_entries: (current.daily_entries || []).map((item) => (
        item.assignment_id === assignmentId && patch.user_id !== undefined ? { ...item, user_id: patch.user_id } : item
      )),
    }));
  };

  const changeAssemblyPlannedQty = (assignmentId, value) => {
    setCompletionPayload((current) => {
      const targetQty = Number(task?.payload?.planned_qty || task?.payload?.product_context?.qty || 0);
      const productLines = task?.payload?.product_lines || [];
      const assignments = current.assembly_assignments || [];
      const currentAssignment = assignments.find((item) => item.id === assignmentId) || {};
      const currentKey = currentAssignment.order_item_id || currentAssignment.product_id;
      const currentLine = productLines.find((line) => (line.order_item_id || line.product_id) === currentKey);
      const otherPlanned = assignments.reduce((sum, item) => (
        item.id === assignmentId ? sum : sum + Number(item.planned_qty || 0)
      ), 0);
      const otherPlannedForDevice = assignments.reduce((sum, item) => (
        item.id !== assignmentId && (item.order_item_id || item.product_id) === currentKey ? sum + Number(item.planned_qty || 0) : sum
      ), 0);
      const deviceLimit = currentLine ? Number(currentLine.qty || 0) - otherPlannedForDevice : targetQty - otherPlanned;
      const maxForLine = Math.max(Math.min(targetQty - otherPlanned, deviceLimit), 0);
      const rawQty = value === "" ? "" : Math.max(Number(value || 0), 0);
      const plannedQty = rawQty === "" ? "" : Math.min(rawQty, maxForLine);
      return {
        ...current,
        assembly_assignments: assignments.map((item) => (
          item.id === assignmentId ? { ...item, planned_qty: plannedQty === "" ? "" : String(plannedQty) } : item
        )),
      };
    });
  };

  const changeAssemblyProduct = (assignmentId, productKey) => {
    setCompletionPayload((current) => {
      const productLines = task?.payload?.product_lines || [];
      const line = productLines.find((item) => String(item.order_item_id || item.product_id) === String(productKey));
      if (!line) return current;
      return {
        ...current,
        assembly_assignments: (current.assembly_assignments || []).map((item) => (
          item.id === assignmentId
            ? {
                ...item,
                order_item_id: line.order_item_id,
                product_id: line.product_id,
                product_name: line.product_name,
                drawing_number: line.drawing_number,
                planned_qty: "",
              }
            : item
        )),
      };
    });
  };

  const removeAssemblyAssignment = (assignmentId) => {
    setCompletionPayload((current) => {
      const assignments = current.assembly_assignments || [];
      if (assignments.length <= 1) return current;
      const assignment = assignments.find((item) => item.id === assignmentId);
      if (Number(assignment?.produced_qty || 0) > 0) return current;
      return {
        ...current,
        assembly_assignments: assignments.filter((item) => item.id !== assignmentId),
        daily_entries: (current.daily_entries || []).filter((item) => item.assignment_id !== assignmentId),
      };
    });
  };

  const autoDistributeAssembly = () => {
    setCompletionPayload((current) => {
      const assignments = current.assembly_assignments || [];
      if (assignments.length === 0) return current;
      const targetQty = Number(task?.payload?.planned_qty || task?.payload?.product_context?.qty || 0);
      const baseQty = Math.floor(targetQty / assignments.length);
      let remainder = targetQty - baseQty * assignments.length;
      return {
        ...current,
        assembly_assignments: assignments.map((item) => {
          const plannedQty = baseQty + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder -= 1;
          return { ...item, planned_qty: String(plannedQty) };
        }),
      };
    });
  };

  const changeAssemblyDailyEntry = (assignmentId, patch) => {
    setCompletionPayload((current) => {
      const entries = current.daily_entries || [];
      const exists = entries.some((item) => item.assignment_id === assignmentId);
      const next = exists
        ? entries.map((item) => item.assignment_id === assignmentId ? { ...item, ...patch } : item)
        : [...entries, { assignment_id: assignmentId, qty: "", comment: "", transfer_from_user_id: "", ...patch }];
      return { ...current, daily_entries: next };
    });
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
    if (res.ok) {
      const attachment = await res.json();
      load();
      return attachment;
    }
    return null;
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

  const downloadMaterialForm = async () => {
    const res = await fetch(`/api/tasks/${taskId}/form.xlsx`);
    if (!res.ok) {
      setError("Не удалось сформировать Excel-форму");
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const action = task.type === "assembler_receive_materials" ? "Получение" : "Выдача";
    link.href = url;
    link.download = `${action} комплектующих заказ ${task.order_id}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const complete = async (saveOnly = false) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    const numericPayload = { ...completionPayload, save_only: saveOnly };
    const invoiceFile = numericPayload.invoice_file;
    const paymentOrderFile = numericPayload.payment_order_file;
    const closingDocsFile = numericPayload.closing_docs_file;
    delete numericPayload.invoice_file;
    delete numericPayload.invoice_file_name;
    delete numericPayload.payment_order_file;
    delete numericPayload.payment_order_file_name;
    delete numericPayload.closing_docs_file;
    delete numericPayload.closing_docs_file_name;
    ["assembled_qty", "daily_qty", "passed_qty", "defective_qty", "packed_qty"].forEach((key) => {
      if (numericPayload[key] !== undefined && numericPayload[key] !== "") numericPayload[key] = Number(numericPayload[key]);
    });
    if (Array.isArray(numericPayload.items)) {
      numericPayload.items = numericPayload.items
        .map((item) => ({ ...item, qty: Number(item.qty || 0) }))
        .filter((item) => item.qty > 0);
    }
    if (Array.isArray(numericPayload.deliveries)) {
      numericPayload.deliveries = numericPayload.deliveries
        .map((item) => ({
          ...item,
          qty: Number(item.qty || 0),
          invoice: numericPayload.invoice,
          expected_date: numericPayload.expected_date,
          supplier: numericPayload.supplier,
          comment: numericPayload.comment,
        }))
        .filter((item) => item.qty > 0);
    }
    if (Array.isArray(numericPayload.extra_components)) {
      numericPayload.extra_components = numericPayload.extra_components
        .map((item) => ({
          ...item,
          component_id: Number(item.component_id || 0),
          qty: Number(item.qty || 0),
          reason: String(item.reason || "").trim(),
        }))
        .filter((item) => item.component_id > 0 && item.qty > 0);
    }
    if (Array.isArray(numericPayload.accepted_goods)) {
      numericPayload.accepted_goods = numericPayload.accepted_goods
        .map((item) => ({ ...item, qty: Number(item.qty || 0) }))
        .filter((item) => item.qty > 0);
    }
    if (Array.isArray(numericPayload.defective_products)) {
      numericPayload.defective_products = numericPayload.defective_products
        .map((item) => ({ ...item, defective_qty: Number(item.defective_qty || 0) }))
        .filter((item) => item.defective_qty > 0);
    }
    if (Array.isArray(numericPayload.assembly_assignments)) {
      numericPayload.assembly_assignments = numericPayload.assembly_assignments.map((item) => ({
        ...item,
        user_id: item.user_id ? Number(item.user_id) : null,
        planned_qty: Number(item.planned_qty || 0),
        produced_qty: Number(item.produced_qty || 0),
      }));
    }
    if (Array.isArray(numericPayload.daily_entries)) {
      numericPayload.daily_entries = numericPayload.daily_entries
        .map((item) => ({
          ...item,
          user_id: item.user_id ? Number(item.user_id) : null,
          transfer_from_user_id: item.transfer_from_user_id ? Number(item.transfer_from_user_id) : null,
          qty: Number(item.qty || 0),
        }))
        .filter((item) => item.qty > 0);
    }
    if (task.type === "assembler_build" && Array.isArray(numericPayload.daily_entries)) {
      const dailyQty = numericPayload.daily_entries.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      if (dailyQty > assemblyAvailableRemaining) {
        setLoading(false);
        setError(`Нельзя отметить ${dailyQty} шт.: доступно максимум ${assemblyAvailableRemaining} шт. по заказу и выданным комплектам.`);
        return;
      }

      const assignmentsById = (numericPayload.assembly_assignments || []).reduce((result, item) => {
        result[item.id] = item;
        return result;
      }, {});
      const lineLimitByKey = assemblyProductLines.reduce((result, line) => {
        result[assemblyKey(line)] = Number(line.qty || 0);
        return result;
      }, {});
      const producedByKey = (numericPayload.assembly_assignments || []).reduce((result, item) => {
        const key = assemblyKey(item);
        if (key) result[key] = (result[key] || 0) + Number(item.produced_qty || 0);
        return result;
      }, {});
      const dailyByKey = numericPayload.daily_entries.reduce((result, entry) => {
        const key = assemblyKey(assignmentsById[entry.assignment_id]);
        if (key) result[key] = (result[key] || 0) + Number(entry.qty || 0);
        return result;
      }, {});
      const overLimitLine = Object.entries(dailyByKey).find(([key, qty]) => {
        const limit = Number(lineLimitByKey[key] || assemblyTargetQty || 0);
        return limit > 0 && Number(producedByKey[key] || 0) + qty > limit;
      });
      if (overLimitLine) {
        const [key] = overLimitLine;
        const line = assemblyLineByKey[key];
        const limit = Number(lineLimitByKey[key] || assemblyTargetQty || 0);
        const produced = Number(producedByKey[key] || 0);
        setLoading(false);
        setError(`Нельзя собрать больше заказа для ${line?.product_name || "изделия"}: осталось ${Math.max(limit - produced, 0)} шт.`);
        return;
      }
    }
    if (
      task.type === "procurement_purchase"
      && numericPayload.deliveries.length === 0
    ) {
      setLoading(false);
      setError("Укажите количество хотя бы для одной позиции счета");
      return;
    }
    if (task.type === "assembler_build" && assemblyPlanOverflow) {
      setLoading(false);
      setError(`Нельзя назначить ${assemblyPlannedTotal} шт.: в заказе запланировано ${assemblyTargetQty} шт.`);
      return;
    }
    if (invoiceFile) numericPayload.invoice_attachment = await uploadFile(invoiceFile);
    if (paymentOrderFile) numericPayload.payment_order_attachment = await uploadFile(paymentOrderFile);
    if (closingDocsFile) numericPayload.closing_docs_attachment = await uploadFile(closingDocsFile);

    const res = await fetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: numericPayload }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      onChanged();
      if (["partial", "waiting_delivery"].includes(data.result?.status)) {
        if (data.result?.materials?.created) {
          const issueIds = data.result.materials.issue_task_ids || [];
          const procurementIds = data.result.materials.procurement_task_ids || [];
          const taskLabels = [
            ...issueIds.map((id) => `выдача #${id}`),
            ...procurementIds.map((id) => `закупка #${id}`),
          ];
          setSuccessMessage(taskLabels.length ? `Заявка создана: ${taskLabels.join(", ")}` : "Заявка создана");
          setCompletionPayload((current) => ({ ...current, extra_components: [] }));
        }
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
  const orderedItems = task.payload?.ordered_items || (task.type === "warehouse_receive_components" ? shortages : []);
  const receiptHistory = task.payload?.receipt_history || [];
  const transferMaterials = task.payload?.materials || [];
  const productDocuments = task.payload?.product_documents || [];
  const finishedGoods = task.payload?.finished_goods || [];
  const testProductLines = task.payload?.product_lines || [];
  const testTotalQty = testProductLines.reduce((sum, item) => sum + Number(item.qty || 0), testProductLines.length ? 0 : Number(task.payload?.assembled_qty || 0));
  const testDefectiveTotal = (completionPayload.defective_products || []).reduce((sum, item) => sum + Number(item.defective_qty || 0), Number(testProductLines.length ? 0 : completionPayload.defective_qty || 0));
  const testPassedTotal = Math.max(testTotalQty - testDefectiveTotal, 0);
  const testChecklist = completionPayload.test_checklist || [];
  const testCheckedCount = testChecklist.filter((item) => item.checked).length;
  const dailyProgress = task.payload?.daily_progress || [];
  const materialRequests = task.payload?.material_requests || [];
  const openMaterialFlow = task.payload?.open_material_flow || [];
  const repairDefectiveProducts = task.payload?.defective_products || [];
  const repairDefectiveQty = Number(task.payload?.defective_qty || repairDefectiveProducts.reduce((sum, item) => sum + Number(item.defective_qty || 0), 0));
  const repairContext = task.payload?.product_context || repairDefectiveProducts[0] || {};
  const repairComponentOptions = (task.payload?.component_options || []).length > 0 ? task.payload.component_options : bomComponentOptions;
  const deliveries = completionPayload.deliveries || [];
  const assemblyAssignments = completionPayload.assembly_assignments || [];
  const assemblyProductLines = task.payload?.product_lines || [];
  const receivedByLine = receiptHistory.reduce((result, entry) => {
    (entry.items || []).forEach((item) => {
      const key = item.line_uid || item.component_id;
      result[key] = (result[key] || 0) + Number(item.qty || 0);
    });
    return result;
  }, {});
  const shortageQtyTotal = shortages.reduce((sum, item) => sum + Number(item.shortage_qty || item.qty || 0), 0);
  const deliveryQtyTotal = deliveries.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const transferQtyTotal = transferMaterials.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const receiveQtyTotal = orderedItems.reduce((sum, item) => {
    const key = item.line_uid || item.component_id;
    return sum + Number(receivedByLine[key] || 0);
  }, 0);
  const receiveRemainingTotal = orderedItems.reduce((sum, item) => {
    const key = item.line_uid || item.component_id;
    const orderedQty = Number(item.shortage_qty || item.qty || 0);
    return sum + Math.max(orderedQty - Number(receivedByLine[key] || 0), 0);
  }, 0);
  const finishedGoodsQtyTotal = finishedGoods.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const showComponentChecklist = ["procurement_purchase", "warehouse_receive_components"].includes(task.type);
  const assemblyTargetQty = Number(task.payload?.planned_qty || task.payload?.product_context?.qty || 0);
  const assemblyIssuedQty = Number(task.payload?.issued_qty ?? (task.payload?.materials_complete ? assemblyTargetQty : task.payload?.started_qty || 0));
  const assemblyIssuedBlockers = task.payload?.issued_details?.blockers || [];
  const assemblyPlannedTotal = assemblyAssignments.reduce((sum, item) => sum + Number(item.planned_qty || 0), 0);
  const assemblyProducedTotal = assemblyAssignments.reduce((sum, item) => sum + Number(item.produced_qty || 0), 0);
  const assemblyTransferredQty = Number(task.payload?.transferred_to_test_qty || 0);
  const assemblyTransferRemaining = Math.max(assemblyProducedTotal - assemblyTransferredQty, 0);
  const assemblyIssuedRemaining = Math.max(assemblyIssuedQty - assemblyProducedTotal, 0);
  const assemblyOrderRemaining = Math.max(assemblyTargetQty - assemblyProducedTotal, 0);
  const assemblyAvailableRemaining = Math.min(assemblyIssuedRemaining, assemblyOrderRemaining);
  const assemblyFullyProduced = assemblyTargetQty > 0 && assemblyProducedTotal >= assemblyTargetQty;
  const assemblyDailyEntries = completionPayload.daily_entries || [];
  const assemblyEntryQty = (entry) => Number(entry?.qty || 0);
  const assemblyKey = (item) => String(item?.order_item_id || item?.product_id || "");
  const assemblyLineByKey = assemblyProductLines.reduce((result, line) => {
    result[assemblyKey(line)] = line;
    return result;
  }, {});
  const assemblyProducedByKey = assemblyAssignments.reduce((result, item) => {
    const key = assemblyKey(item);
    if (key) result[key] = (result[key] || 0) + Number(item.produced_qty || 0);
    return result;
  }, {});
  const assemblyPendingTodayTotal = assemblyDailyEntries.reduce((sum, entry) => sum + assemblyEntryQty(entry), 0);
  const assemblyPlanOverflow = assemblyTargetQty > 0 && assemblyPlannedTotal > assemblyTargetQty;
  const assignedAssemblyToMe = assemblyAssignments.some((item) => Number(item.user_id) === Number(user?.id));
  const isAssignedToMe = task.assigned_user_id === user?.id;
  const canTake = ["assigned", "open"].includes(task.status) && (isAssignedToMe || (!task.assigned_user_id && (userHasRole(user, [task.role]) || canManageTasks(user))));
  const canCompleteStatus = task.type === "assembler_build"
    ? ["assigned", "in_progress", "open"].includes(task.status)
    : ["in_progress", "open"].includes(task.status);
  const canComplete = canCompleteStatus && (canManageTasks(user) || task.assigned_user_id === user?.id || assignedAssemblyToMe);
  const hasOpenMaterialFlow = openMaterialFlow.length > 0;
  const hasAssemblyExtraComponents = task.type === "assembler_build" && (completionPayload.extra_components || []).some((item) => item.component_id && Number(item.qty || 0) > 0 && String(item.reason || "").trim());
  const blocksAssemblyTransfer = task.type === "assembler_build" && hasOpenMaterialFlow;
  const hasRepairExtraComponents = task.type === "repair_defects" && (completionPayload.extra_components || []).some((item) => item.component_id && Number(item.qty || 0) > 0 && String(item.reason || "").trim());
  const blocksRepairCompletion = task.type === "repair_defects" && hasOpenMaterialFlow;
  const actionLabel = loading
    ? "Сохранение..."
    : task.type === "procurement_purchase"
      ? "Передать на оплату"
      : task.type === "repair_defects" && hasRepairExtraComponents
        ? "Создать заявку на компоненты"
        : task.type === "assembler_build" && hasOpenMaterialFlow
            ? "Ожидает допкомпоненты"
          : task.type === "assembler_build"
            ? `Передать на тестирование${assemblyTransferRemaining > 0 ? ` ${assemblyTransferRemaining} шт.` : ""}`
          : "Отметить выполненной";

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
          {successMessage && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{successMessage}</div>}

          {(canTake || canManageTasks(user)) && !["done", "waiting_delivery", "ready_to_issue"].includes(task.status) && (
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
              <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Закупки по задаче</h3>
			                  <div className="space-y-2">
                {purchases.map((purchase) => {
                  return (
                  <div key={purchase.id} className="grid grid-cols-1 gap-3 border-b border-slate-100 pb-3 text-xs last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_90px_90px_120px]">
	                    <div className="min-w-0">
	                      <div className="font-bold text-slate-700 break-words">{componentTitle(purchase)}</div>
	                      <div className="text-[11px] font-semibold text-slate-400 mt-1">{lineProductLabel(purchase)}</div>
	                      <div className="text-slate-400 mt-1 break-words">{[purchase.supplier, purchase.invoice, purchase.expected_date].filter(Boolean).join(" · ") || "Без реквизитов"}</div>
                        {purchase.invoice_attachment && (
                          <a className="mt-2 inline-flex rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700" href={taskFileUrl(purchase.invoice_attachment)} target="_blank" rel="noreferrer">
                            Счет
                          </a>
                        )}
                    </div>
                    <div className="font-black text-slate-900">Заказано {purchase.qty}</div>
                    <div className="font-black text-emerald-700">Принято {purchase.received_qty || 0}</div>
                    <div className="text-slate-400 break-words">{purchase.payment_ref ? `Оплачено: ${purchase.payment_ref}` : purchase.comment || "—"}</div>
                  </div>
                );})}
              </div>
            </section>
          )}

          {["warehouse_issue_materials", "assembler_receive_materials", "repair_issue_materials"].includes(task.type) && transferMaterials.length > 0 && (
            <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {task.type === "assembler_receive_materials" ? "Список на получение" : "Список на выдачу"}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-blue-600">Заказ №{task.order_id} · {transferMaterials.length} поз. · {transferQtyTotal} шт.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-center text-xs">
                    <div className="font-black text-blue-700">{transferMaterials.length}</div>
                    <div className="font-semibold text-slate-400">позиций</div>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-center text-xs">
                    <div className="font-black text-blue-700">{transferQtyTotal}</div>
                    <div className="font-semibold text-slate-400">шт.</div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadMaterialForm}
                    className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Скачать Excel
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-blue-50 text-blue-700">
                    <tr>
                      <th className="px-3 py-2.5 font-black">№</th>
                      <th className="px-3 py-2.5 font-black">Изделие</th>
                      <th className="px-3 py-2.5 font-black">Комплектующее</th>
                      <th className="px-3 py-2.5 font-black">Артикул</th>
                      <th className="px-3 py-2.5 text-right font-black">Количество</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferMaterials.map((material, index) => (
                      <tr key={`${material.component_id}-${index}`} className="border-t border-blue-50 text-slate-700">
                        <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                        <td className="px-3 py-3 font-semibold text-slate-500">{lineProductLabel(material)}</td>
                        <td className="px-3 py-3 font-semibold">{material.component_name || `Компонент ID ${material.component_id}`}</td>
                        <td className="px-3 py-3 font-mono text-slate-500">{material.part_number || "—"}</td>
                        <td className="px-3 py-3 text-right font-black">{material.qty || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {task.type === "warehouse_receive_components" && orderedItems.length > 0 && (
            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Приемка поставки</h3>
                  <p className="mt-1 text-xs font-semibold text-emerald-600">Проверьте фактическое поступление и приложите закрывающие документы.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                    <div className="font-black text-slate-900">{shortageQtyTotal || 0}</div>
                    <div className="font-semibold text-slate-400">ожидается</div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                    <div className="font-black text-emerald-700">{receiveQtyTotal || 0}</div>
                    <div className="font-semibold text-slate-400">принято</div>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-white px-3 py-2">
                    <div className="font-black text-amber-700">{receiveRemainingTotal || 0}</div>
                    <div className="font-semibold text-slate-400">осталось</div>
                  </div>
                </div>
              </div>
              {(task.payload?.invoice_attachment || task.payload?.payment?.payment_order_attachment) && (
                <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold">
                  {task.payload?.invoice_attachment && (
                    <a className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-emerald-700 hover:bg-emerald-50" href={taskFileUrl(task.payload.invoice_attachment)} target="_blank" rel="noreferrer">
                      Счет: {task.payload.invoice_attachment.original_name}
                    </a>
                  )}
                  {task.payload?.payment?.payment_order_attachment && (
                    <a className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-emerald-700 hover:bg-emerald-50" href={taskFileUrl(task.payload.payment.payment_order_attachment)} target="_blank" rel="noreferrer">
                      Платежное поручение: {task.payload.payment.payment_order_attachment.original_name}
                    </a>
                  )}
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
                <table className="w-full min-w-[840px] text-left text-xs">
                  <thead className="bg-emerald-50 text-emerald-700">
                    <tr>
                      <th className="px-3 py-2.5 font-black">Изделие</th>
                      <th className="px-3 py-2.5 font-black">Комплектующее</th>
                      <th className="px-3 py-2.5 text-right font-black">Заказано</th>
                      <th className="px-3 py-2.5 text-right font-black">Принято</th>
                      <th className="px-3 py-2.5 text-right font-black">Осталось</th>
                      {task.status !== "done" && <th className="px-3 py-2.5 text-right font-black">Принять сейчас</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {orderedItems.map((item, itemIndex) => {
                      const lineKey = item.line_uid || item.component_id;
                      const orderedQty = Number(item.shortage_qty || item.qty || 0);
                      const receivedQty = Number(receivedByLine[lineKey] || 0);
                      const remainingLine = shortages.find((line) => item.line_uid ? line.line_uid === item.line_uid : line.component_id === item.component_id);
                      const remainingQty = Number(remainingLine?.shortage_qty || remainingLine?.qty || Math.max(orderedQty - receivedQty, 0));
                      const receivingLine = (completionPayload.items || []).find((line) => item.line_uid ? line.line_uid === item.line_uid : line.component_id === item.component_id);
                      return (
                        <tr key={item.line_uid || `${item.component_id}-${itemIndex}`} className="border-t border-emerald-50 text-slate-700">
                          <td className="px-3 py-3 font-semibold text-slate-500">{lineProductLabel(item)}</td>
                          <td className="px-3 py-3 font-semibold">{componentTitle(item)}</td>
                          <td className="px-3 py-3 text-right font-bold">{orderedQty}</td>
                          <td className="px-3 py-3 text-right font-bold text-emerald-700">{receivedQty}</td>
                          <td className="px-3 py-3 text-right font-bold text-amber-700">{remainingQty}</td>
                          {task.status !== "done" && (
                            <td className="px-3 py-2 text-right">
                              {remainingQty > 0 && receivingLine ? (
                                <input
                                  type="number"
                                  min="0"
                                  max={remainingQty}
                                  value={receivingLine.qty || ""}
                                  onChange={(e) => changeLineQty(item.component_id, e.target.value, item.line_uid)}
                                  className="ml-auto w-24 rounded-lg border border-emerald-100 p-2 text-right text-sm font-semibold outline-none focus:border-emerald-400"
                                />
                              ) : "—"}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {receiptHistory.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {receiptHistory.map((entry, index) => (
                    <p key={`${entry.received_at}-${index}`} className="text-xs font-semibold text-emerald-700">
                      Приёмка {index + 1}: {(entry.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0)} шт.
                      {entry.received_at ? ` · ${new Date(entry.received_at).toLocaleString("ru-RU")}` : ""}
                    </p>
                  ))}
                </div>
              )}
              {task.status !== "done" && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-emerald-700">Закрывающие документы</span>
                    <span className="flex min-h-11 cursor-pointer items-center rounded-xl border border-emerald-100 bg-white px-3 text-xs font-semibold text-slate-500 hover:border-emerald-300">
                      <span className="truncate">{completionPayload.closing_docs_file_name || "Выбрать файл"}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setCompletionPayload((current) => ({ ...current, closing_docs_file: file, closing_docs_file_name: file.name }));
                        }}
                      />
                    </span>
                  </label>
                  <PayloadField label="Комментарий кладовщика" name="comment" value={completionPayload.comment} onChange={changePayload} />
                </div>
              )}
            </section>
          )}

          {shortages.length > 0 && task.type !== "warehouse_receive_components" && (
            <section className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {task.type === "procurement_purchase" ? "Закупка комплектующих" : showComponentChecklist ? "Чеклист комплектующих" : "Дефицит комплектующих"}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-red-600">{shortages.length} поз. · требуется {shortageQtyTotal} шт.</p>
                </div>
                {task.type === "procurement_purchase" && (
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-red-100 bg-white px-3 py-2">
                      <div className="font-black text-red-700">{shortageQtyTotal || 0}</div>
                      <div className="font-semibold text-slate-400">дефицит</div>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-white px-3 py-2">
                      <div className="font-black text-blue-700">{deliveryQtyTotal || 0}</div>
                      <div className="font-semibold text-slate-400">в счет</div>
                    </div>
                  </div>
                )}
              </div>
              {task.type === "procurement_purchase" && (
                <div className="mb-4 rounded-2xl border border-red-100 bg-white p-4">
                  <p className="mb-3 text-xs font-black text-slate-700">Счет поставщика</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <PayloadField label="Номер счета / ссылка" name="invoice" value={completionPayload.invoice} onChange={changePayload} />
                    <PayloadField label="Поставщик" name="supplier" value={completionPayload.supplier} onChange={changePayload} />
                    <PayloadField label="Ожидаемая дата" name="expected_date" value={completionPayload.expected_date} onChange={changePayload} type="date" />
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Файл счета</span>
                      <span className="flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:border-blue-300">
                        <span className="truncate">{completionPayload.invoice_file_name || "Выбрать файл"}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setCompletionPayload((current) => ({ ...current, invoice_file: file, invoice_file_name: file.name }));
                          }}
                        />
                      </span>
                    </label>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <PayloadField label="Комментарий к счету" name="comment" value={completionPayload.comment} onChange={changePayload} />
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {shortages.map((item, itemIndex) => (
                  <div key={item.line_uid || `${item.component_id}-${itemIndex}`} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px] gap-3 text-xs text-red-800 border-b border-red-100 last:border-b-0 pb-2 last:pb-0">
                    <div className="min-w-0">
                      <div className="font-bold break-words">{componentTitle(item)}</div>
                      <div className="mt-1 text-[11px] font-semibold text-red-500">{lineProductLabel(item)}</div>
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
                      <div>
                        {deliveries.map((delivery, index) => (delivery.line_uid ? delivery.line_uid === item.line_uid : delivery.component_id === item.component_id) && (
                          <label key={index} className="block">
                            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-red-400">Купить по этому счету</span>
                            <input
                              type="number"
                              min="0"
                              max={item.shortage_qty || item.qty}
                              placeholder="0"
                              value={delivery.qty || ""}
                              onChange={(e) => changeDelivery(index, { qty: e.target.value })}
                              className="w-full rounded-xl border border-red-100 bg-white p-2 text-sm font-semibold outline-none focus:border-red-400"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {task.type === "assembler_build" && (
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-slate-900">План</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {task.payload?.materials_complete ? "Комплектация получена полностью" : "Можно собирать в пределах выданных комплектов"}
                      </p>
                    </div>
                    <span className={`w-fit rounded-xl border px-3 py-2 text-xs font-black ${task.payload?.materials_complete ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
                      {task.payload?.materials_complete ? "Полный комплект" : "Частичная выдача"}
                    </span>
                  </div>
                  <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="text-base font-black text-slate-900">{task.payload?.product_context?.product_name || assemblyProductLines[0]?.product_name || "Изделие"}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-400">{task.payload?.product_context?.drawing_number || assemblyProductLines[0]?.drawing_number || "Без децимального номера"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {[
                      ["Количество", assemblyTargetQty || "—"],
                      ["Выдано комплектов", assemblyIssuedQty || 0],
                      ["Собрано", assemblyProducedTotal || 0],
                      ["Остаток выданного", assemblyIssuedRemaining || 0],
                      ["Остаток заказа", assemblyOrderRemaining || 0],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
                        <div className="mt-1 text-xl font-black text-slate-900">{value}</div>
                      </div>
                    ))}
                  </div>
                {productDocuments.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Документация изделия</h4>
                    <div className="space-y-3">
                      {productDocuments.map((product) => (
                        <div key={product.product_id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                          <div className="text-sm font-black text-slate-800">
                            {product.product_name}
                            {product.is_subassembly ? <span className="ml-2 text-[10px] font-bold text-blue-600">Сборочная единица</span> : null}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-400">{[product.drawing_number, product.revision && `Рев. ${product.revision}`].filter(Boolean).join(" · ") || "Без децимального номера"}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(product.attachments || []).length > 0 ? product.attachments.map((file) => (
                              <a key={file.stored_name} href={productFileUrl(file)} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50">
                                {file.original_name}
                              </a>
                            )) : <span className="text-xs font-semibold text-slate-400">Файлов нет</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
			                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			                    <div>
			                      <h3 className="text-sm font-black text-slate-900">Исполнители</h3>
			                      <p className={`mt-1 text-xs font-semibold ${assemblyPlanOverflow ? "text-red-600" : "text-slate-400"}`}>
				                        Назначено {assemblyPlannedTotal || 0} из {assemblyTargetQty || "—"} шт. по заказу
			                      </p>
			                    </div>
				                    {canManageTasks(user) && (
		                      <div className="flex flex-wrap gap-2">
		                        <button type="button" onClick={autoDistributeAssembly} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">
		                          Распределить
		                        </button>
		                        <button type="button" onClick={addAssemblyAssignment} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">
		                          Добавить сборщика
		                        </button>
		                      </div>
		                    )}
	                  </div>
			                  <div className="space-y-3">
			                    {assemblyAssignments.map((assignment, index) => {
			                      const plannedQty = Number(assignment.planned_qty || 0);
			                      const producedQty = Number(assignment.produced_qty || 0);
			                      const assignmentKey = assignment.order_item_id || assignment.product_id;
			                      const assignmentLine = assemblyProductLines.find((line) => (line.order_item_id || line.product_id) === assignmentKey);
			                      const otherDevicePlan = assemblyAssignments.reduce((sum, item) => (
			                        item.id !== assignment.id && (item.order_item_id || item.product_id) === assignmentKey ? sum + Number(item.planned_qty || 0) : sum
			                      ), 0);
			                      const maxPlanForLine = Math.max(Math.min(
				                        assemblyTargetQty - (assemblyPlannedTotal - plannedQty),
			                        Number(assignmentLine?.qty || assemblyTargetQty || 0) - otherDevicePlan,
			                      ), 0);
		                      return (
		                        <div key={assignment.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
		                          <div className="mb-3 flex items-center justify-between gap-3">
		                            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Сборщик {index + 1}</div>
		                            {canManageTasks(user) && assemblyAssignments.length > 1 && (
		                              <button
		                                type="button"
		                                onClick={() => removeAssemblyAssignment(assignment.id)}
		                                disabled={producedQty > 0}
		                                className="rounded-lg border border-red-100 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-white"
		                              >
		                                Удалить
		                              </button>
		                            )}
		                          </div>
		                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_180px_110px_110px_110px] lg:items-end">
			                            <label className="block min-w-0">
			                              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Устройство</span>
		                              {canManageTasks(user) && assemblyProductLines.length > 1 ? (
		                                <select
		                                  value={assignmentKey || ""}
		                                  onChange={(e) => changeAssemblyProduct(assignment.id, e.target.value)}
		                                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-blue-500"
		                                >
		                                  {assemblyProductLines.map((line) => (
		                                    <option key={line.order_item_id || line.product_id} value={line.order_item_id || line.product_id}>
		                                      {line.product_name || `Изделие ID ${line.product_id}`} · {line.qty || 0} шт.
		                                    </option>
		                                  ))}
		                                </select>
		                              ) : (
		                                <div className="min-h-11 rounded-xl border border-slate-100 bg-white px-3 py-2">
		                                  <div className="truncate text-sm font-black text-slate-800">{assignment.product_name || task.payload?.product_context?.product_name || "Изделие"}</div>
		                                  <div className="truncate text-xs font-semibold text-slate-400">{assignment.drawing_number || task.payload?.product_context?.drawing_number || "Без децимального номера"}</div>
		                                </div>
		                              )}
		                            </label>
	                            <label className="block">
	                              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Сборщик</span>
	                              <select
	                                value={assignment.user_id || ""}
	                                disabled={!canManageTasks(user)}
	                                onChange={(e) => changeAssemblyAssignment(assignment.id, { user_id: e.target.value })}
	                                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-blue-500 disabled:bg-slate-100"
	                              >
	                                <option value="">Не назначен</option>
	                                {users.map((item) => (
	                                  <option key={item.id} value={item.id}>{item.full_name || item.username}</option>
	                                ))}
	                              </select>
	                            </label>
	                            <label className="block">
	                              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">План</span>
	                              <input
		                                type="number"
		                                value={assignment.planned_qty || ""}
		                                disabled={!canManageTasks(user)}
		                                min="0"
		                                max={maxPlanForLine}
		                                onChange={(e) => changeAssemblyPlannedQty(assignment.id, e.target.value)}
		                                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
		                              />
	                            </label>
		                            <div>
		                              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Собрано</span>
		                              <div className="flex min-h-11 items-center rounded-xl border border-slate-100 bg-white px-3 text-sm font-black text-slate-800">{producedQty}</div>
		                            </div>
                            <div>
                              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Остаток</span>
                              <div className="flex min-h-11 items-center rounded-xl border border-slate-100 bg-white px-3 text-sm font-black text-slate-800">{Math.max(plannedQty - producedQty, 0)}</div>
                            </div>
		                          </div>
		                        </div>
		                      );
		                    })}
		                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Выпуск за сегодня</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-400">Сохранение добавит строку в журнал сборки и оставит задачу открытой.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="font-black text-slate-900">{assemblyIssuedQty || 0}</div>
                        <div className="font-semibold text-slate-400">выдано</div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="font-black text-slate-900">{assemblyProducedTotal || 0}</div>
                        <div className="font-semibold text-slate-400">собрано</div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="font-black text-slate-900">{assemblyAvailableRemaining || 0}</div>
                        <div className="font-semibold text-slate-400">доступно</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {assemblyAssignments.map((assignment) => {
                      const entry = assemblyDailyEntries.find((item) => item.assignment_id === assignment.id) || {};
                      const plannedQty = Number(assignment.planned_qty || 0);
                      const producedQty = Number(assignment.produced_qty || 0);
                      const todayQty = Number(entry.qty || 0);
                      const overPlan = producedQty + todayQty > plannedQty && plannedQty > 0;
                      const canEditLine = canManageTasks(user) || Number(assignment.user_id) === Number(user?.id) || task.assigned_user_id === user?.id;
                      const currentKey = assemblyKey(assignment);
                      const deviceLine = assemblyLineByKey[currentKey];
                      const deviceTargetQty = Number(deviceLine?.qty || assemblyTargetQty || 0);
                      const deviceProducedQty = Number(assemblyProducedByKey[currentKey] || producedQty || 0);
                      const otherPendingTotal = Math.max(assemblyPendingTodayTotal - todayQty, 0);
                      const otherPendingForDevice = assemblyDailyEntries.reduce((sum, item) => {
                        if (item.assignment_id === assignment.id) return sum;
                        const linkedAssignment = assemblyAssignments.find((candidate) => candidate.id === item.assignment_id);
                        return assemblyKey(linkedAssignment) === currentKey ? sum + assemblyEntryQty(item) : sum;
                      }, 0);
                      const maxByIssued = Math.max(assemblyIssuedRemaining - otherPendingTotal, 0);
                      const maxByOrder = Math.max(assemblyOrderRemaining - otherPendingTotal, 0);
                      const maxByDevice = Math.max(deviceTargetQty - deviceProducedQty - otherPendingForDevice, 0);
                      const availableForEntry = Math.min(maxByIssued, maxByOrder, maxByDevice);
                      const displayedTodayQty = Math.min(todayQty, availableForEntry);
                      const setTodayQty = (value) => {
                        const rawValue = value === "" ? "" : Math.max(Number(value || 0), 0);
                        const nextValue = rawValue === "" ? "" : Math.min(rawValue, availableForEntry);
                        changeAssemblyDailyEntry(assignment.id, { qty: nextValue === "" ? "" : String(nextValue), user_id: assignment.user_id });
                      };
                      return (
                        <div key={`today-${assignment.id}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="truncate text-base font-black text-slate-900">{assignment.product_name || task.payload?.product_context?.product_name || "Изделие"}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-400">
                                {assignment.user?.full_name || users.find((item) => Number(item.id) === Number(assignment.user_id))?.full_name || "Сборщик не назначен"}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                                <div className="font-black text-slate-900">{producedQty}</div>
                                <div className="font-semibold text-slate-400">факт</div>
                              </div>
                              <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                                <div className="font-black text-slate-900">{Math.max(plannedQty - producedQty, 0)}</div>
                                <div className="font-semibold text-slate-400">остаток</div>
                              </div>
                            </div>
                          </div>
                          <div className={`grid grid-cols-1 gap-3 ${overPlan ? "lg:grid-cols-[220px_190px_minmax(0,1fr)]" : "lg:grid-cols-[220px_minmax(0,1fr)]"} lg:items-end`}>
                            <label className="block">
                              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Собрано сегодня</span>
                              <div className="grid grid-cols-[42px_1fr_42px] gap-2">
                                <button
                                  type="button"
                                  disabled={!canEditLine || todayQty <= 0}
                                  onClick={() => setTodayQty(todayQty - 1)}
                                  className="min-h-12 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={availableForEntry}
                                  value={entry.qty === "" || entry.qty === undefined ? "" : String(displayedTodayQty)}
                                  disabled={!canEditLine}
                                  onChange={(e) => setTodayQty(e.target.value)}
                                  className="min-h-12 w-full rounded-xl border border-blue-200 bg-white px-3 text-center text-2xl font-black text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-100"
                                />
                                <button
                                  type="button"
                                  disabled={!canEditLine || todayQty >= availableForEntry}
                                  onClick={() => setTodayQty(todayQty + 1)}
                                  className="min-h-12 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
                                >
                                  +
                                </button>
                              </div>
                              <div className={`mt-1 text-[11px] font-semibold ${availableForEntry > 0 ? "text-slate-400" : "text-amber-600"}`}>
                                {availableForEntry > 0 ? `Можно отметить до ${availableForEntry} шт.` : "Пока нет доступного остатка по заказу или выданным комплектам."}
                              </div>
                            </label>
                            {overPlan && (
                              <label className="block">
                                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Забрал пул у</span>
                                <select
                                  value={entry.transfer_from_user_id || ""}
                                  disabled={!canEditLine}
                                  onChange={(e) => changeAssemblyDailyEntry(assignment.id, { transfer_from_user_id: e.target.value })}
                                  className="w-full rounded-xl border border-amber-200 bg-white p-3 text-sm font-semibold outline-none focus:border-blue-500 disabled:bg-slate-100"
                                >
                                  <option value="">Не указывать</option>
                                  {users.filter((item) => Number(item.id) !== Number(assignment.user_id)).map((item) => (
                                    <option key={item.id} value={item.id}>{item.full_name || item.username}</option>
                                  ))}
                                </select>
                              </label>
                            )}
                            <PayloadField
                              label="Комментарий"
                              name={`comment_${assignment.id}`}
                              value={entry.comment || ""}
                              onChange={(_, value) => changeAssemblyDailyEntry(assignment.id, { comment: value })}
                            />
                          </div>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            {availableForEntry <= 0 ? (
                              assemblyFullyProduced ? (
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                                  Выпуск по этой задаче собран. Передайте изделия на тестирование нижней кнопкой.
                                </div>
                              ) : (
                                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                                  Нет доступного остатка по заказу или выданным комплектам.
                                </div>
                              )
                            ) : (
                              <div className="text-xs font-semibold text-slate-400">Запись сохранится в истории сборки.</div>
                            )}
                            <button
                              type="button"
                              onClick={() => complete(true)}
                              disabled={loading || !canEditLine || todayQty <= 0 || todayQty > availableForEntry}
                              className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:bg-slate-300"
                            >
                              Сохранить выпуск
                            </button>
                          </div>
                          {overPlan && (
                            <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                              Сегодня будет собрано больше назначенного плана. Укажите, у кого забран пул устройств.
                            </div>
                          )}
                          {!assemblyFullyProduced && availableForEntry <= 0 && assemblyIssuedBlockers.length > 0 && (
                            <div className="mt-3 rounded-xl border border-amber-100 bg-white px-3 py-2 text-xs">
                              <div className="font-black text-amber-700">Не хватает для отметки выпуска:</div>
                              <div className="mt-2 space-y-1">
                                {assemblyIssuedBlockers.slice(0, 5).map((line, blockerIndex) => (
                                  <div key={`${line.component_name}-${blockerIndex}`} className="text-slate-600">
                                    {line.designators ? `${line.designators} · ` : ""}{line.component_name}: выдано {line.issued_qty}, нужно {line.required_per_unit} на 1 шт.
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {dailyProgress.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">История сборки</h4>
                      <div className="space-y-2">
                        {dailyProgress.slice().reverse().map((entry, index) => (
                          <div key={`${entry.date}-${entry.assignment_id || index}`} className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs sm:grid-cols-[120px_1fr_90px]">
                            <span className="font-bold text-slate-600">{entry.date}</span>
                            <span className="min-w-0 font-semibold text-slate-500">
                              {[entry.product_name, entry.user_name, entry.transfer_from_user_name && `забрал у ${entry.transfer_from_user_name}`].filter(Boolean).join(" · ")}
                              {entry.comment ? ` · ${entry.comment}` : ""}
                            </span>
                            <span className="text-right font-black text-slate-900">{entry.qty} шт.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
		                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		                    <div>
		                      <h3 className="text-sm font-black text-slate-900">Проблемы</h3>
		                      <p className="mt-1 text-xs font-semibold text-slate-400">Запрос допкомпонентов при браке и история таких заявок.</p>
		                    </div>
                          <div className="flex flex-wrap gap-2">
			                      <button type="button" onClick={addExtraComponent} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">
			                        Добавить компонент
			                      </button>
                            <button
                              type="button"
                              onClick={() => complete(true)}
                              disabled={loading || !canComplete || !hasAssemblyExtraComponents}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
                            >
                              Отправить заявку
                            </button>
                          </div>
		                  </div>
		                  <div className="space-y-2">
	                    {(completionPayload.extra_components || []).length === 0 && <p className="text-xs font-semibold text-slate-400">Заявок на доп. компоненты нет.</p>}
	                    {(completionPayload.extra_components || []).map((item, index) => {
	                      const matches = repairComponentMatches(item.component_query);
	                      const selected = repairComponentOptions.find((component) => component.component_id === Number(item.component_id));
	                      return (
	                        <div key={index} className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
	                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
	                          <input
	                              value={item.component_query || ""}
	                              onChange={(e) => changeExtraComponent(index, { component_query: e.target.value, component_id: "" })}
	                              placeholder="Поиск по R1, названию, артикулу"
	                              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3F8CFF]"
	                          />
	                          <input type="number" min="0" value={item.qty || ""} onChange={(e) => changeExtraComponent(index, { qty: e.target.value })} placeholder="Кол-во" className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3F8CFF]" />
	                        </div>
                          <input
                            value={item.reason || ""}
                            onChange={(e) => changeExtraComponent(index, { reason: e.target.value })}
                            placeholder="Обоснование: зачем нужен доп. компонент"
                            className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3F8CFF]"
                          />
	                          {selected && (
	                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
	                              Выбрано: {componentTitle(selected)}{selected.designators ? ` · ${selected.designators}` : ""}
	                            </div>
	                          )}
		                          {item.component_query && !selected && matches.length === 0 && (
		                            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
		                              Компонент не найден в составе этого изделия.
		                            </div>
		                          )}
	                          {!item.component_query && !selected && repairComponentOptions.length > 0 && (
	                            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-400">
	                              Начните вводить позиционное обозначение, название или артикул компонента.
	                            </div>
	                          )}
	                          {matches.length > 0 && !selected && (
	                            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-white">
	                              {matches.map((component) => (
	                                <button
	                                  key={component.component_id}
	                                  type="button"
	                                  onClick={() => changeExtraComponent(index, {
	                                    component_id: component.component_id,
	                                    component_query: [component.designators, component.component_name, component.part_number].filter(Boolean).join(" · "),
	                                  })}
	                                  className="block w-full border-b border-slate-50 px-3 py-2 text-left text-xs last:border-b-0 hover:bg-blue-50"
	                                >
	                                  <span className="block font-black text-slate-800">{component.designators ? `${component.designators} · ` : ""}{component.component_name}</span>
		                                  <span className="mt-0.5 block font-semibold text-slate-400">
		                                    {[component.part_number, component.value, component.package, component.category, component.assembly].filter(Boolean).join(" · ")}
		                                  </span>
	                                </button>
	                              ))}
	                            </div>
	                          )}
	                        </div>
		                      );
			                    })}
			                  </div>
                  {hasOpenMaterialFlow && (
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-blue-700">Активные заявки</h4>
                      <div className="space-y-2">
                        {openMaterialFlow.map((flowTask) => (
                          <div key={flowTask.id} className="rounded-xl border border-blue-100 bg-white p-3 text-xs">
                            <div className="font-black text-slate-800">Задача #{flowTask.id} · {ROLE_LABELS[flowTask.role] || flowTask.role} · {TASK_STATUS_LABELS[flowTask.status] || flowTask.status}</div>
                            <div className="mt-1 font-semibold text-slate-500">{flowTask.title}</div>
                            {flowTask.request_reason && <div className="mt-1 font-semibold text-slate-600">Обоснование: {flowTask.request_reason}</div>}
                            <div className="mt-2 space-y-1">
                              {(flowTask.materials || []).map((item) => (
                                <div key={`${flowTask.id}-${item.component_id}`} className="text-slate-600">{componentTitle(item)} · {item.qty || item.shortage_qty}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700">
                        Передача на тестирование станет доступна после закрытия этих выдач или закупок.
                      </div>
                    </div>
                  )}
	                  {materialRequests.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700">История заявок</h4>
	                      <div className="space-y-3">
	                        {materialRequests.map((request, index) => (
	                          <div key={`${request.created_at}-${index}`} className="rounded-xl border border-amber-100 bg-white p-3 text-xs">
		                            <div className="font-black text-slate-800">Заявка {index + 1}{request.created_at ? ` · ${new Date(request.created_at).toLocaleString("ru-RU")}` : ""}</div>
                              {request.request_reason && (
                                <div className="mt-1 font-semibold text-slate-600">Обоснование: {request.request_reason}</div>
                              )}
                              {((request.issue_task_ids || []).length > 0 || (request.procurement_task_ids || []).length > 0) && (
                                <div className="mt-1 font-bold text-blue-600">
                                  Созданы задачи: {[
                                    ...(request.issue_task_ids || []).map((id) => `выдача #${id}`),
                                    ...(request.procurement_task_ids || []).map((id) => `закупка #${id}`),
                                  ].join(", ")}
                                </div>
                              )}
	                            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                              <div>
                                <div className="mb-1 font-bold text-emerald-700">На выдачу</div>
                                {(request.available || []).length > 0 ? request.available.map((item) => (
                                  <div key={item.component_id} className="text-slate-600">{componentTitle(item)} · {item.qty}</div>
                                )) : <div className="text-slate-400">Нет</div>}
                              </div>
                              <div>
                                <div className="mb-1 font-bold text-red-700">На закупку</div>
                                {(request.shortages || []).length > 0 ? request.shortages.map((item) => (
                                  <div key={item.component_id} className="text-slate-600">{componentTitle(item)} · {item.shortage_qty || item.qty}</div>
                                )) : <div className="text-slate-400">Нет</div>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
	              </div>
            )}
            {task.type === "tester_check" && (
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Партия на тестировании</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-400">Отметьте брак, годные изделия посчитаются автоматически.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="font-black text-slate-900">{testTotalQty || 0}</div>
                        <div className="font-semibold text-slate-400">всего</div>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                        <div className="font-black text-emerald-700">{testPassedTotal || 0}</div>
                        <div className="font-semibold text-emerald-600">годных</div>
                      </div>
                      <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                        <div className="font-black text-red-700">{testDefectiveTotal || 0}</div>
                        <div className="font-semibold text-red-600">брак</div>
                      </div>
                    </div>
                  </div>

                  {testProductLines.length > 0 ? (
                    <div className="space-y-2">
                      {testProductLines.map((item) => {
                        const line = (completionPayload.defective_products || []).find((entry) => entry.product_id === item.product_id);
                        const defectiveQty = Number(line?.defective_qty || 0);
                        const totalQty = Number(item.qty || 0);
                        return (
                          <div key={item.product_id} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 lg:grid-cols-[minmax(0,1fr)_120px_160px] lg:items-end">
                            <div className="min-w-0">
                              <div className="truncate text-base font-black text-slate-900">{item.product_name || `Изделие ID ${item.product_id}`}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-400">
                                {[item.drawing_number, `${totalQty} шт. на тестировании`].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs">
                              <div className="font-black text-emerald-700">{Math.max(totalQty - defectiveQty, 0)}</div>
                              <div className="font-semibold text-slate-400">годных</div>
                            </div>
                            <label className="block">
                              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Брак, шт.</span>
                              <input
                                type="number"
                                min="0"
                                max={totalQty}
                                value={line?.defective_qty || ""}
                                onChange={(e) => changeDefectiveProduct(item.product_id, e.target.value)}
                                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-500"
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <PayloadField label="Годных изделий" name="passed_qty" value={completionPayload.passed_qty} onChange={changePayload} type="number" />
                      <PayloadField label="Бракованных изделий" name="defective_qty" value={completionPayload.defective_qty} onChange={changePayload} type="number" />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-slate-900">Чеклист проверки</h3>
                    <span className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
                      {testCheckedCount}/{testChecklist.length || 0}
                    </span>
                  </div>
                  {testChecklist.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {testChecklist.map((item, index) => (
                      <label key={`${item.label}-${index}`} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-semibold ${item.checked ? "border-blue-100 bg-blue-50 text-blue-700" : "border-slate-100 bg-slate-50 text-slate-700"}`}>
                        <input type="checkbox" checked={Boolean(item.checked)} onChange={(e) => changeChecklist(index, e.target.checked)} className="h-4 w-4 accent-[#3F8CFF]" />
                        <span>{item.label}</span>
                      </label>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400">
                      В паспорте изделия чеклист тестирования не задан.
                    </div>
                  )}
                </div>

                <PayloadField label="Комментарий тестировщика" name="notes" value={completionPayload.notes} onChange={changePayload} />
              </div>
            )}
            {task.type === "repair_defects" && (
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-slate-900">Дефектная партия</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-400">Изделия, которые тестировщик передал на устранение брака.</p>
                    </div>
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-center text-xs">
                      <div className="text-xl font-black text-red-700">{repairDefectiveQty || 0}</div>
                      <div className="font-semibold text-red-600">в ремонте</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(repairDefectiveProducts.length > 0 ? repairDefectiveProducts : [repairContext]).map((item, index) => (
                      <div key={`${item.product_id || index}-${item.product_name}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-base font-black text-slate-900">{item.product_name || repairContext.product_name || "Изделие"}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-400">{item.drawing_number || repairContext.drawing_number || "Без децимального номера"}</div>
                          </div>
                          <div className="rounded-xl border border-white bg-white px-3 py-2 text-xs font-black text-slate-700">
                            {item.defective_qty || repairDefectiveQty || 0} шт.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {task.payload?.notes ? (
                    <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                      Комментарий тестировщика: {task.payload.notes}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <h3 className="mb-3 text-sm font-black text-slate-900">Журнал ремонта</h3>
                  <PayloadField label="Что сделано / результат ремонта" name="notes" value={completionPayload.notes} onChange={changePayload} />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Запрос допкомпонентов</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-400">Выберите компонент из состава бракованного изделия, укажите количество и причину.</p>
                    </div>
                    <button type="button" onClick={addExtraComponent} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">
                      Добавить компонент
                    </button>
                  </div>
                  <div className="space-y-3">
                    {repairComponentOptions.length === 0 && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        В составе изделия нет привязанных покупных компонентов для выбора.
                      </div>
                    )}
                    {(completionPayload.extra_components || []).length === 0 && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">
                        Если компоненты для ремонта не нужны, оставьте список пустым и завершите задачу после ремонта.
                      </div>
                    )}
                    {(completionPayload.extra_components || []).map((item, index) => {
                      const matches = repairComponentMatches(item.component_query);
                      const selected = repairComponentOptions.find((component) => component.component_id === Number(item.component_id));
                      return (
                        <div key={index} className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_120px]">
                            <input
                              value={item.component_query || ""}
                              onChange={(e) => changeExtraComponent(index, { component_query: e.target.value, component_id: "" })}
                              placeholder="Поиск по R1, названию или артикулу"
                              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3F8CFF]"
                            />
                            <input
                              type="number"
                              min="0"
                              value={item.qty || ""}
                              onChange={(e) => changeExtraComponent(index, { qty: e.target.value })}
                              placeholder="Кол-во"
                              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3F8CFF]"
                            />
                          </div>
                          <input
                            value={item.reason || ""}
                            onChange={(e) => changeExtraComponent(index, { reason: e.target.value })}
                            placeholder="Обоснование: зачем нужен компонент"
                            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3F8CFF]"
                          />
                          {selected && (
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                              Выбрано: {componentTitle(selected)}{selected.designators ? ` · ${selected.designators}` : ""}
                            </div>
                          )}
                          {item.component_query && !selected && matches.length === 0 && (
                            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                              Компонент не найден в составе бракованного изделия.
                            </div>
                          )}
                          {!item.component_query && !selected && repairComponentOptions.length > 0 && (
                            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-400">
                              Начните вводить позиционное обозначение, название или артикул компонента.
                            </div>
                          )}
                          {matches.length > 0 && !selected && (
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                              {matches.map((component) => (
                                <button
                                  key={component.component_id}
                                  type="button"
                                  onClick={() => changeExtraComponent(index, {
                                    component_id: component.component_id,
                                    component_query: [component.designators, component.component_name, component.part_number].filter(Boolean).join(" · "),
                                  })}
                                  className="block w-full border-b border-slate-50 px-3 py-2 text-left text-xs last:border-b-0 hover:bg-blue-50"
                                >
                                  <span className="block font-black text-slate-800">{component.designators ? `${component.designators} · ` : ""}{component.component_name}</span>
                                  <span className="mt-0.5 block font-semibold text-slate-400">
                                    {[component.part_number, component.value, component.package, component.category, component.assembly].filter(Boolean).join(" · ")}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {hasOpenMaterialFlow && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-blue-700">Активные заявки</h3>
                    <div className="space-y-2">
                      {openMaterialFlow.map((flowTask) => (
                        <div key={flowTask.id} className="rounded-xl border border-blue-100 bg-white p-3 text-xs">
                          <div className="font-black text-slate-800">Задача #{flowTask.id} · {ROLE_LABELS[flowTask.role] || flowTask.role} · {TASK_STATUS_LABELS[flowTask.status] || flowTask.status}</div>
                          <div className="mt-1 font-semibold text-slate-500">{flowTask.title}</div>
                          {flowTask.request_reason && <div className="mt-1 font-semibold text-slate-600">Обоснование: {flowTask.request_reason}</div>}
                          <div className="mt-2 space-y-1">
                            {(flowTask.materials || []).map((line) => (
                              <div key={`${flowTask.id}-${line.component_id}`} className="text-slate-600">{componentTitle(line)} · {line.qty || line.shortage_qty}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700">
                      Закрыть ремонт можно после завершения активных выдач или закупок.
                    </div>
                  </div>
                )}

                {materialRequests.length > 0 && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700">История заявок</h3>
                    <div className="space-y-3">
                      {materialRequests.map((request, index) => (
                        <div key={`${request.created_at}-${index}`} className="rounded-xl border border-amber-100 bg-white p-3 text-xs">
                          <div className="font-black text-slate-800">Заявка {index + 1}{request.created_at ? ` · ${new Date(request.created_at).toLocaleString("ru-RU")}` : ""}</div>
                          {request.request_reason && <div className="mt-1 font-semibold text-slate-600">Обоснование: {request.request_reason}</div>}
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div>
                              <div className="mb-1 font-bold text-emerald-700">На выдачу</div>
                              {(request.available || []).length > 0 ? request.available.map((line) => (
                                <div key={line.component_id} className="text-slate-600">{componentTitle(line)} · {line.qty}</div>
                              )) : <div className="text-slate-400">Нет</div>}
                            </div>
                            <div>
                              <div className="mb-1 font-bold text-red-700">На закупку</div>
                              {(request.shortages || []).length > 0 ? request.shortages.map((line) => (
                                <div key={line.component_id} className="text-slate-600">{componentTitle(line)} · {line.shortage_qty || line.qty}</div>
                              )) : <div className="text-slate-400">Нет</div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {task.type === "packer_pack" && (
              <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Упаковка партии</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Проверьте количество упакованных изделий и передайте на склад готовой продукции.</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-center text-xs">
                    <div className="text-xl font-black text-blue-700">{Number(task.payload?.packed_qty || task.payload?.planned_qty || task.payload?.product_context?.qty || 0) || "—"}</div>
                    <div className="font-semibold text-blue-600">план</div>
                  </div>
                </div>
                {((task.payload?.product_lines || []).length > 0 ? task.payload.product_lines : [task.payload?.product_context].filter(Boolean)).map((item, index) => (
                  <div key={`${item.product_id || index}-${item.product_name}`} className="mb-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="font-black text-slate-900">{item.product_name || "Изделие"}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-400">{[item.drawing_number, item.qty && `${item.qty} шт.`].filter(Boolean).join(" · ") || "Без децимального номера"}</div>
                  </div>
                ))}
                <PayloadField label="Упаковано изделий" name="packed_qty" value={completionPayload.packed_qty} onChange={changePayload} type="number" />
              </div>
            )}
            {task.type === "accounting_payment" && (
              <div className="md:col-span-2 space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Оплата закупки</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Проверьте счет и приложите оплаченное платежное поручение.</p>
                  </div>
                  {task.payload?.invoice_attachment ? (
                    <a className="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100" href={taskFileUrl(task.payload.invoice_attachment)} target="_blank" rel="noreferrer">
                      Счет: {task.payload.invoice_attachment.original_name}
                    </a>
                  ) : (
                    <span className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">Счет не приложен</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <PayloadField label="Номер платежного поручения" name="payment_ref" value={completionPayload.payment_ref} onChange={changePayload} />
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Оплаченное платежное поручение</span>
                    <span className="flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:border-blue-300">
                      <span className="truncate">{completionPayload.payment_order_file_name || "Выбрать файл"}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setCompletionPayload((current) => ({ ...current, payment_order_file: file, payment_order_file_name: file.name }));
                        }}
                      />
                    </span>
                  </label>
                  <div className="md:col-span-2">
                    <PayloadField label="Комментарий бухгалтерии" name="notes" value={completionPayload.notes} onChange={changePayload} />
                  </div>
                </div>
              </div>
            )}
            {task.type === "warehouse_finished_goods" && finishedGoods.length > 0 && (
              <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Приемка готовой продукции</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Количество попадет на баланс склада готовой продукции.</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center text-xs">
                    <div className="text-xl font-black text-emerald-700">{finishedGoodsQtyTotal}</div>
                    <div className="font-semibold text-emerald-600">к приемке</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {finishedGoods.map((item) => {
                    const accepted = (completionPayload.accepted_goods || []).find((line) => line.product_id === item.product_id);
                    return (
                      <div key={item.product_id} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm sm:grid-cols-[1fr_120px] sm:items-center">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800">{item.product_name}</div>
                          <div className="text-xs font-semibold text-slate-400">{item.drawing_number || "Без децимального номера"} · План {item.qty} шт.</div>
                        </div>
                        <input type="number" min="0" max={item.qty} value={accepted?.qty ?? item.qty ?? ""} onChange={(e) => changeAcceptedGood(item.product_id, e.target.value)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#3F8CFF]" />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <PayloadField label="Комментарий кладовщика" name="notes" value={completionPayload.notes} onChange={changePayload} />
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-4">
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Комментарии</h3>
            <div className="flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Добавить комментарий..." className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[#3F8CFF]" />
              <button onClick={addNote} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">OK</button>
            </div>
            <div className="mt-3 space-y-2">
              {notes.length === 0 && <p className="text-xs text-slate-400">Комментариев нет.</p>}
              {notes.map((item, index) => (
                <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-xs">
                  <div className="font-bold text-slate-700">{item.author} · {ROLE_LABELS[item.role] || item.role}</div>
                  <div className="mt-1 text-slate-500">{item.text}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-between items-center">
          <button onClick={() => onClose()} className="text-xs font-bold text-slate-500">Закрыть</button>
	          {task.status !== "done" && (
	            canComplete ? (
	              <div className="flex flex-col gap-2 sm:flex-row">
	                {task.type === "assembler_build" && (
	                  <button onClick={() => complete(true)} disabled={loading} className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:bg-slate-300">
	                    Сохранить отметку
	                  </button>
	                )}
		                <button
                      onClick={() => complete(false)}
                      disabled={loading || blocksAssemblyTransfer || blocksRepairCompletion || (task.type === "assembler_build" && assemblyTransferRemaining <= 0)}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest"
                    >
		                  {actionLabel}
		                </button>
	              </div>
            ) : task.status === "ready_to_issue" ? (
              <span className="text-xs font-bold text-slate-400">Ожидает получения сборщиком</span>
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

function QuickCompleteModal({ taskId, user, onClose, onChanged }) {
  const [task, setTask] = useState(null);
  const [payload, setPayload] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (!res.ok) {
      setError("Не удалось загрузить задачу");
      return;
    }
    const data = await res.json();
    const defaults = defaultCompletionPayload(data);
    if (data.type === "procurement_purchase") {
      defaults.deliveries = (data.payload?.shortages || []).map((item) => ({
        component_id: item.component_id,
        line_uid: item.line_uid,
        qty: item.shortage_qty || item.qty || "",
      }));
    }
    if (data.type === "warehouse_receive_components") {
      defaults.items = (data.payload?.shortages || []).map((item) => ({
        component_id: item.component_id,
        line_uid: item.line_uid,
        qty: item.shortage_qty || item.qty || "",
      }));
    }
    if (data.type === "warehouse_finished_goods") {
      defaults.accepted_goods = (data.payload?.finished_goods || []).map((item) => ({
        product_id: item.product_id,
        qty: item.qty || "",
      }));
    }
    setTask(data);
    setPayload({ ...defaults, ...(data.payload?.completion || {}) });
  };

  useEffect(() => { load(); }, [taskId]);

  const change = (name, value) => setPayload((current) => ({ ...current, [name]: value }));
  const changeLine = (collection, componentId, value, lineUid = "") => {
    setPayload((current) => ({
      ...current,
      [collection]: (current[collection] || []).map((item) => (
        (lineUid ? item.line_uid === lineUid : item.component_id === componentId) ? { ...item, qty: value } : item
      )),
    }));
  };
  const changeQuickChecklist = (index, checked) => {
    setPayload((current) => {
      const checklist = [...(current.test_checklist || [])];
      checklist[index] = { ...checklist[index], checked };
      return { ...current, test_checklist: checklist };
    });
  };
  const changeQuickDefectiveProduct = (productId, qty) => {
    setPayload((current) => {
      const next = (current.defective_products || []).map((item) => (
        item.product_id === productId ? { ...item, defective_qty: qty } : item
      ));
      const totalDefective = next.reduce((sum, item) => sum + Number(item.defective_qty || 0), 0);
      return { ...current, defective_products: next, defective_qty: String(totalDefective) };
    });
  };
  const changeQuickAcceptedGood = (productId, qty) => {
    setPayload((current) => ({
      ...current,
      accepted_goods: (current.accepted_goods || []).map((item) => item.product_id === productId ? { ...item, qty } : item),
    }));
  };

  const uploadInvoiceFile = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: formData });
    return res.ok ? res.json() : null;
  };

  const complete = async () => {
    setLoading(true);
    setError("");
    const numericPayload = { ...payload };
    const invoiceFile = numericPayload.invoice_file;
    const paymentOrderFile = numericPayload.payment_order_file;
    const closingDocsFile = numericPayload.closing_docs_file;
    delete numericPayload.invoice_file;
    delete numericPayload.invoice_file_name;
    delete numericPayload.payment_order_file;
    delete numericPayload.payment_order_file_name;
    delete numericPayload.closing_docs_file;
    delete numericPayload.closing_docs_file_name;

    ["assembled_qty", "daily_qty", "passed_qty", "defective_qty", "packed_qty"].forEach((key) => {
      if (numericPayload[key] !== undefined && numericPayload[key] !== "") numericPayload[key] = Number(numericPayload[key]);
    });
    if (Array.isArray(numericPayload.items)) {
      numericPayload.items = numericPayload.items
        .map((item) => ({ ...item, qty: Number(item.qty || 0) }))
        .filter((item) => item.qty > 0);
    }
    if (Array.isArray(numericPayload.deliveries)) {
      numericPayload.deliveries = numericPayload.deliveries
        .map((item) => ({
          ...item,
          qty: Number(item.qty || 0),
          invoice: numericPayload.invoice,
          expected_date: numericPayload.expected_date,
          supplier: numericPayload.supplier,
          comment: numericPayload.comment,
        }))
        .filter((item) => item.qty > 0);
    }
    if (Array.isArray(numericPayload.extra_components)) {
      numericPayload.extra_components = numericPayload.extra_components
        .map((item) => ({
          ...item,
          component_id: Number(item.component_id || 0),
          qty: Number(item.qty || 0),
          reason: String(item.reason || "").trim(),
        }))
        .filter((item) => item.component_id > 0 && item.qty > 0);
    }
    if (Array.isArray(numericPayload.accepted_goods)) {
      numericPayload.accepted_goods = numericPayload.accepted_goods
        .map((item) => ({ ...item, qty: Number(item.qty || 0) }))
        .filter((item) => item.qty > 0);
    }
    if (Array.isArray(numericPayload.defective_products)) {
      numericPayload.defective_products = numericPayload.defective_products
        .map((item) => ({ ...item, defective_qty: Number(item.defective_qty || 0) }))
        .filter((item) => item.defective_qty > 0);
    }
    if (invoiceFile) numericPayload.invoice_attachment = await uploadInvoiceFile(invoiceFile);
    if (paymentOrderFile) numericPayload.payment_order_attachment = await uploadInvoiceFile(paymentOrderFile);
    if (closingDocsFile) numericPayload.closing_docs_attachment = await uploadInvoiceFile(closingDocsFile);

    const res = await fetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: numericPayload }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось завершить задачу");
      return;
    }
    await onChanged();
    if (saveOnly) {
      await load();
      setLoading(false);
      return;
    }
    onClose();
  };

  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 text-sm font-semibold text-slate-400 shadow-xl">Загрузка...</div>
      </div>
    );
  }

  const shortages = task.payload?.shortages || [];
  const canComplete = ["in_progress", "open"].includes(task.status) && (canManageTasks(user) || task.assigned_user_id === user?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-xl">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold text-slate-400">Завершение задачи #{task.id}</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">{task.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{taskDisplayStatus(task)} · Заказ #{task.order_id || "—"}</p>
            </div>
            <button type="button" onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700">×</button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          {!canComplete && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
              Задачу нужно взять в работу перед завершением.
            </div>
          )}

          {task.type === "procurement_purchase" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PayloadField label="Номер счета / ссылка" name="invoice" value={payload.invoice} onChange={change} />
                <PayloadField label="Поставщик" name="supplier" value={payload.supplier} onChange={change} />
                <PayloadField label="Ожидаемая дата" name="expected_date" value={payload.expected_date} onChange={change} type="date" />
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Файл счета</span>
                  <span className="flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:border-blue-300">
                    <span className="truncate">{payload.invoice_file_name || "Выбрать файл"}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPayload((current) => ({ ...current, invoice_file: file, invoice_file_name: file.name }));
                      }}
                    />
                  </span>
                </label>
              </div>
              <PayloadField label="Комментарий" name="comment" value={payload.comment} onChange={change} />
            </div>
          )}

          {task.type === "accounting_payment" && task.payload?.invoice_attachment && (
            <a className="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100" href={taskFileUrl(task.payload.invoice_attachment)} target="_blank" rel="noreferrer">
              Счет закупщика: {task.payload.invoice_attachment.original_name}
            </a>
          )}

          {["procurement_purchase", "warehouse_receive_components"].includes(task.type) && shortages.length > 0 && (
            <div className="space-y-2">
              {shortages.map((item, itemIndex) => {
                const collection = task.type === "procurement_purchase" ? "deliveries" : "items";
                const line = (payload[collection] || []).find((entry) => item.line_uid ? entry.line_uid === item.line_uid : entry.component_id === item.component_id);
                return (
                  <div key={item.line_uid || `${item.component_id}-${itemIndex}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-[1fr_120px] sm:items-end">
	                    <div className="min-w-0">
	                      <p className="truncate text-sm font-bold text-slate-900">{componentTitle(item)}</p>
	                      <p className="mt-1 text-xs font-semibold text-slate-400">{lineProductLabel(item)}</p>
	                      <p className="mt-1 text-xs font-semibold text-slate-500">Осталось: {item.shortage_qty || item.qty || 0}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={line?.qty || ""}
                      onChange={(e) => changeLine(collection, item.component_id, e.target.value, item.line_uid)}
                      className="w-full min-h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                );
              })}
            </div>
          )}

	          {task.type === "assembler_build" && (
	            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
	              Для распределения сборки по людям и дневных отметок откройте полную карточку задачи.
	            </div>
	          )}
          {task.type === "tester_check" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PayloadField label="Годных изделий" name="passed_qty" value={payload.passed_qty} onChange={change} type="number" />
              {(task.payload?.product_lines || []).length === 0 && (
                <PayloadField label="Бракованных изделий" name="defective_qty" value={payload.defective_qty} onChange={change} type="number" />
              )}
              {(task.payload?.product_lines || []).length > 0 && (
                <div className="space-y-2 sm:col-span-2">
                  {(task.payload.product_lines || []).map((item) => {
                    const line = (payload.defective_products || []).find((entry) => entry.product_id === item.product_id);
                    return (
                      <div key={item.product_id} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_120px] sm:items-end">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{item.product_name || `Изделие ID ${item.product_id}`}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{[item.drawing_number, `План ${item.qty || 0} шт.`].filter(Boolean).join(" · ")}</p>
                        </div>
                        <PayloadField
                          label="Брак, шт."
                          name={`quick_defective_product_${item.product_id}`}
                          value={line?.defective_qty || ""}
                          onChange={(_, value) => changeQuickDefectiveProduct(item.product_id, value)}
                          type="number"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:col-span-2">
                {(payload.test_checklist || []).map((item, index) => (
                  <label key={`${item.label}-${index}`} className="flex min-h-10 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={Boolean(item.checked)} onChange={(e) => changeQuickChecklist(index, e.target.checked)} className="h-4 w-4 accent-[#3F8CFF]" />
                    {item.label}
                  </label>
                ))}
              </div>
              <div className="sm:col-span-2"><PayloadField label="Комментарий" name="notes" value={payload.notes} onChange={change} /></div>
            </div>
          )}
          {task.type === "repair_defects" && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
              Для заявки на дополнительные компоненты откройте полную карточку задачи. Там компоненты выбираются из состава изделия.
            </div>
          )}
          {task.type === "packer_pack" && <PayloadField label="Упаковано изделий" name="packed_qty" value={payload.packed_qty} onChange={change} type="number" />}
          {task.type === "accounting_payment" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PayloadField label="Номер платежного поручения" name="payment_ref" value={payload.payment_ref} onChange={change} />
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Оплаченное платежное поручение</span>
                <span className="flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:border-blue-300">
                  <span className="truncate">{payload.payment_order_file_name || "Выбрать файл"}</span>
                  <input type="file" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPayload((current) => ({ ...current, payment_order_file: file, payment_order_file_name: file.name }));
                  }} />
                </span>
              </label>
              <PayloadField label="Комментарий бухгалтерии" name="notes" value={payload.notes} onChange={change} />
            </div>
          )}
          {task.type === "warehouse_receive_components" && (
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Закрывающие документы</span>
              <span className="flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:border-blue-300">
                <span className="truncate">{payload.closing_docs_file_name || "Выбрать файл"}</span>
                <input type="file" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPayload((current) => ({ ...current, closing_docs_file: file, closing_docs_file_name: file.name }));
                }} />
              </span>
            </label>
          )}
          {task.type === "warehouse_finished_goods" && (task.payload?.finished_goods || []).length > 0 && (
            <div className="space-y-2">
              {(task.payload.finished_goods || []).map((item) => {
                const accepted = (payload.accepted_goods || []).find((line) => line.product_id === item.product_id);
                return (
                  <div key={item.product_id} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_120px] sm:items-center">
                    <div className="text-sm font-bold text-slate-800">{item.product_name}</div>
                    <input type="number" min="0" max={item.qty} value={accepted?.qty || ""} onChange={(e) => changeQuickAcceptedGood(item.product_id, e.target.value)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#3F8CFF]" />
                  </div>
                );
              })}
              <PayloadField label="Комментарий" name="notes" value={payload.notes} onChange={change} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-white/95 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Отмена
          </button>
	          <button type="button" onClick={complete} disabled={loading || !canComplete || ["repair_defects", "assembler_build"].includes(task.type)} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#3F8CFF] bg-[#3F8CFF] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#1f78ff] disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400">
            {loading ? "Сохранение..." : "Завершить задачу"}
          </button>
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
    <div className="w-full max-w-none space-y-6 p-4 sm:p-6 lg:p-10">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      {loading ? (
        <div className="text-sm text-slate-400">Загрузка задач...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400">Открытых задач нет.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
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

function TaskKanban({ endpoint, user, onOpenPage, title, subtitle }) {
  const { tasks, loading, reload } = useTasks(endpoint);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dropColumn, setDropColumn] = useState("");
  const [dropTarget, setDropTarget] = useState(null);
  const [kanbanError, setKanbanError] = useState("");
  const boardRef = useRef(null);
  const draggingTaskIdRef = useRef(null);
  const groupedTasks = TASK_KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.key] = [];
    return acc;
  }, {});

  tasks.forEach((task) => {
    const columnKey = taskKanbanColumn(task);
    if (!groupedTasks[columnKey]) groupedTasks[columnKey] = [];
    groupedTasks[columnKey].push(task);
  });

  const activeCount = tasks.filter((task) => task.status !== "done").length;
  const draggingTask = tasks.find((task) => task.id === draggingTaskId);

  const handleDragStart = (event, task) => {
    setKanbanError("");
    setDraggingTaskId(task.id);
    draggingTaskIdRef.current = task.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(task.id));
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    draggingTaskIdRef.current = null;
    setDropColumn("");
    setDropTarget(null);
  };

  const autoScrollBoard = (event) => {
    const board = boardRef.current;
    if (!board) return;

    const threshold = 96;
    const maxSpeed = 22;
    const rect = board.getBoundingClientRect();
    const leftDistance = event.clientX - rect.left;
    const rightDistance = rect.right - event.clientX;

    if (leftDistance < threshold) {
      board.scrollLeft -= Math.ceil(((threshold - leftDistance) / threshold) * maxSpeed);
    } else if (rightDistance < threshold) {
      board.scrollLeft += Math.ceil(((threshold - rightDistance) / threshold) * maxSpeed);
    }

    const main = board.closest(".app-main") || document.scrollingElement;
    if (!main) return;

    const viewportTop = 0;
    const viewportBottom = window.innerHeight;
    const topDistance = event.clientY - viewportTop;
    const bottomDistance = viewportBottom - event.clientY;

    if (topDistance < threshold) {
      main.scrollTop -= Math.ceil(((threshold - topDistance) / threshold) * maxSpeed);
    } else if (bottomDistance < threshold) {
      main.scrollTop += Math.ceil(((threshold - bottomDistance) / threshold) * maxSpeed);
    }
  };

  const moveTaskToColumn = async (task, columnKey) => {
    if (!task || taskKanbanColumn(task) === columnKey) return;
    setKanbanError("");

    if (columnKey === "hold") {
      if (task.status === "done") {
        setKanbanError("Закрытую задачу нельзя поставить на холд.");
        return;
      }
      const res = await fetch(`/api/tasks/${task.id}/hold`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setKanbanError(data.detail || "Не удалось поставить задачу на холд");
        return;
      }
      await reload();
      return;
    }

    if (columnKey === "in_progress") {
      if (["done", "waiting_delivery"].includes(task.status)) {
        setKanbanError("Эту задачу нельзя взять в работу из текущего статуса.");
        return;
      }
      if (task.status === "hold") {
        const resumeRes = await fetch(`/api/tasks/${task.id}/resume`, { method: "POST" });
        if (!resumeRes.ok) {
          const data = await resumeRes.json().catch(() => ({}));
          setKanbanError(data.detail || "Не удалось снять задачу с холда");
          return;
        }
        await reload();
        return;
      }
      const res = await fetch(`/api/tasks/${task.id}/take`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setKanbanError(data.detail || "Не удалось взять задачу в работу");
        return;
      }
      await reload();
      return;
    }

    if (columnKey === "assigned" && canManageTasks(user)) {
      if (task.status === "done") {
        setKanbanError("Закрытую задачу нельзя вернуть в назначенные.");
        return;
      }
      if (task.status === "hold") {
        const resumeRes = await fetch(`/api/tasks/${task.id}/resume`, { method: "POST" });
        if (!resumeRes.ok) {
          const data = await resumeRes.json().catch(() => ({}));
          setKanbanError(data.detail || "Не удалось снять задачу с холда");
          return;
        }
      }
      const res = await fetch(`/api/tasks/${task.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setKanbanError(data.detail || "Не удалось вернуть задачу в назначенные");
        return;
      }
      await reload();
      return;
    }

    if (columnKey === "done") {
      if (["assigned", "open"].includes(task.status)) {
        const takeRes = await fetch(`/api/tasks/${task.id}/take`, { method: "POST" });
        if (!takeRes.ok) {
          const data = await takeRes.json().catch(() => ({}));
          setKanbanError(data.detail || "Не удалось взять задачу в работу перед завершением");
          return;
        }
      }
      if (["hold", "waiting_delivery"].includes(task.status)) {
        setKanbanError("Задачу в этом статусе нельзя завершить перетаскиванием.");
        return;
      }
      setCompletingTaskId(task.id);
      return;
    }

    setKanbanError("В эту колонку задача переходит автоматически по производственной цепочке.");
  };

  const handleDrop = async (event, columnKey) => {
    event.preventDefault();
    const taskId = Number(event.dataTransfer.getData("text/plain") || draggingTaskIdRef.current || draggingTaskId);
    const task = tasks.find((item) => item.id === taskId);
    setDropColumn("");
    setDropTarget(null);
    setDraggingTaskId(null);
    draggingTaskIdRef.current = null;
    if (task && taskKanbanColumn(task) === columnKey) {
      await reorderColumnTasks(columnKey, taskId);
      return;
    }
    await moveTaskToColumn(task, columnKey);
  };

  const handleCardDragOver = (event, columnKey, targetTaskId) => {
    event.preventDefault();
    event.stopPropagation();
    autoScrollBoard(event);
    event.dataTransfer.dropEffect = "move";
    const taskId = Number(event.dataTransfer.getData("text/plain") || draggingTaskIdRef.current || draggingTaskId);
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.id === targetTaskId || taskKanbanColumn(task) !== columnKey) {
      setDropTarget(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY > rect.top + rect.height / 2 ? "after" : "before";
    setDropTarget({ taskId: targetTaskId, placement });
  };

  const reorderColumnTasks = async (columnKey, draggedTaskIdValue, targetTaskId = null, placement = "before") => {
    const columnTasks = (groupedTasks[columnKey] || []).filter((task) => task.id !== draggedTaskIdValue);
    const draggedTask = tasks.find((task) => task.id === draggedTaskIdValue);
    if (!draggedTask) return;

    const targetIndex = targetTaskId ? columnTasks.findIndex((task) => task.id === targetTaskId) : columnTasks.length;
    const insertIndex = targetIndex >= 0 ? targetIndex + (placement === "after" ? 1 : 0) : columnTasks.length;
    const orderedIds = [
      ...columnTasks.slice(0, insertIndex).map((task) => task.id),
      draggedTask.id,
      ...columnTasks.slice(insertIndex).map((task) => task.id),
    ];

    const res = await fetch("/api/tasks/kanban/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column: columnKey, ordered_ids: orderedIds }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setKanbanError(data.detail || "Не удалось изменить порядок задач");
      return;
    }
    await reload();
  };

  const handleCardDrop = async (event, columnKey, targetTaskId) => {
    event.preventDefault();
    event.stopPropagation();
    const taskId = Number(event.dataTransfer.getData("text/plain") || draggingTaskIdRef.current || draggingTaskId);
    const task = tasks.find((item) => item.id === taskId);
    setDropColumn("");
    setDropTarget(null);
    setDraggingTaskId(null);
    draggingTaskIdRef.current = null;
    if (!task) return;

    if (taskKanbanColumn(task) === columnKey) {
      const rect = event.currentTarget.getBoundingClientRect();
      const placement = event.clientY > rect.top + rect.height / 2 ? "after" : "before";
      await reorderColumnTasks(columnKey, taskId, targetTaskId, placement);
      return;
    }

    await moveTaskToColumn(task, columnKey);
  };

  return (
    <div className="flex h-full w-full max-w-none flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400">Рабочая доска</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm font-semibold text-slate-600">
              Всего: <span className="font-black text-slate-900">{tasks.length}</span>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              Активно: <span className="font-black">{activeCount}</span>
            </div>
            <button type="button" onClick={reload} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-slate-50">
              Обновить
            </button>
          </div>
        </div>
      </div>

      {kanbanError && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          {kanbanError}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400">
          Загрузка задач...
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400">
          Открытых задач нет.
        </div>
      ) : (
        <div
          ref={boardRef}
          onDragOver={autoScrollBoard}
          className="kanban-board min-h-0 flex-1 overflow-x-auto rounded-3xl pb-1"
        >
          <div className="flex min-w-max items-start gap-4 pb-4">
            {TASK_KANBAN_COLUMNS.map((column) => {
              const columnTasks = groupedTasks[column.key] || [];
              const isActiveDrop = dropColumn === column.key;
              const canDropHere = draggingTask && taskKanbanColumn(draggingTask) !== column.key;
              return (
                <section
                  key={column.key}
                  onDragOver={(event) => {
                    event.preventDefault();
                    autoScrollBoard(event);
                    event.dataTransfer.dropEffect = "move";
                    if (canDropHere) setDropColumn(column.key);
                  }}
                  onDragLeave={() => {
                    setDropColumn((current) => current === column.key ? "" : current);
                    setDropTarget(null);
                  }}
                  onDrop={(event) => handleDrop(event, column.key)}
                  className={`flex min-h-[520px] w-[340px] shrink-0 flex-col rounded-3xl border p-3 transition-all 2xl:w-[380px] ${
                    isActiveDrop
                      ? "border-blue-200 bg-blue-50/70 shadow-sm"
                      : "border-slate-100 bg-slate-50/60"
                  }`}
                >
                  <div className="sticky top-0 z-10 mb-3 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-black text-slate-900">{column.title}</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{column.description}</p>
                      </div>
                      <span className="shrink-0 rounded-2xl border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500">
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 pb-3">
                    {columnTasks.length > 0 ? (
                      columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                        task={task}
                        onOpen={onOpenPage}
                        onOpenTask={setActiveTaskId}
                        compact
                        draggable
                          isDragging={draggingTaskId === task.id}
                        dropPlacement={dropTarget?.taskId === task.id ? dropTarget.placement : ""}
                        onDragStart={(event) => handleDragStart(event, task)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(event) => handleCardDragOver(event, column.key, task.id)}
                        onDrop={(event) => handleCardDrop(event, column.key, task.id)}
                      />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5 text-center text-xs font-semibold text-slate-400">
                        Нет задач
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
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
      {completingTaskId && (
        <QuickCompleteModal
          taskId={completingTaskId}
          user={user}
          onClose={() => setCompletingTaskId(null)}
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
    <div className="w-full max-w-none space-y-8 p-4 sm:p-6 lg:p-10">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Панель</h1>
        <p className="text-sm text-slate-500 mt-2">
          {user.full_name || user.phone || "Пользователь"} · {roleListLabel(user)}
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
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
    endpoint={userHasRole(user, ["admin", "manager"]) ? "/api/tasks" : "/api/tasks/mine"}
    title="Все заявки"
    subtitle="Цепочка workflow-задач"
    user={user}
    onOpenPage={onOpenPage}
  />
);
const MyTasks = ({ user, onOpenPage }) => <TaskKanban endpoint="/api/tasks/mine" user={user} title="Мои задачи" subtitle={`${roleListLabel(user)}: персональная очередь работ`} onOpenPage={onOpenPage} />;

function LoginPage({ onLogin, theme, onToggleTheme }) {
  const [phone, setPhone] = useState("+7");
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
        body: JSON.stringify({ phone: normalizePhoneInput(phone), password }),
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
          <p className="text-xs text-slate-400 mt-1">Введите телефон и пароль сотрудника</p>
        </div>

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Телефон</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={(e) => setPhone(defaultPhoneInput(e.target.value))}
            placeholder="9001234567"
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
          />
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

        <p className="text-[11px] text-slate-400">Для старой dev-учетки можно временно ввести admin в поле телефона.</p>
      </form>
    </div>
  );
}

function Personnel({ currentUser }) {
  const [users, setUsers] = useState([]);
  const emptyForm = {
    password: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    phone: "+7",
    role: "manager",
    roles: ["manager"],
  };
  const [form, setForm] = useState({
    password: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    phone: "+7",
    role: "manager",
    roles: ["manager"],
  });
  const [drafts, setDrafts] = useState({});
  const [passwords, setPasswords] = useState({});
  const [panelMode, setPanelMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
      setDrafts(Object.fromEntries(data.map((user) => [user.id, {
        last_name: user.last_name || "",
        first_name: user.first_name || "",
        middle_name: user.middle_name || "",
        phone: user.phone || "",
        role: user.role,
        roles: userRoles(user),
        is_active: user.is_active,
      }])));
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const fullName = (user) => {
    const parts = [user.last_name, user.first_name, user.middle_name].filter(Boolean);
    return parts.length ? parts.join(" ") : user.full_name || "ФИО не указано";
  };

  const initials = (user) => {
    const first = (user.first_name || "").trim()[0];
    const last = (user.last_name || "").trim()[0];
    const fallback = (user.full_name || user.phone || user.username || "?").trim()[0];
    return `${first || fallback || "?"}${last || ""}`.toUpperCase();
  };

  const UserAvatar = ({ user, size = "md" }) => (
    <div className={`${size === "lg" ? "h-14 w-14 text-lg" : "h-12 w-12 text-base"} flex shrink-0 items-center justify-center rounded-full bg-[#3F8CFF] font-black text-white shadow-sm shadow-blue-500/20`}>
      {initials(user)}
    </div>
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredUsers = normalizedSearch
    ? users.filter((user) => {
      const text = [
        fullName(user),
        user.phone,
        user.username,
        user.id,
        user.is_active ? "активен доступ включен" : "отключен доступ выключен",
        roleListLabel(user),
      ].filter(Boolean).join(" ").toLowerCase();
      return text.includes(normalizedSearch);
    })
    : users;

  const updateDraft = (userId, patch) => {
    setDrafts((current) => ({
      ...current,
      [userId]: { ...(current[userId] || {}), ...patch },
    }));
  };

  const toggleRole = (currentRoles, role) => {
    const roles = currentRoles.includes(role)
      ? currentRoles.filter((item) => item !== role)
      : [...currentRoles, role];
    return roles.length ? roles : [role];
  };

  const openCreatePanel = () => {
    setError("");
    setForm({ ...emptyForm });
    setSelectedUser(null);
    setPanelMode("create");
  };

  const openUserPanel = (user) => {
    setError("");
    setSelectedUser(user);
    updateDraft(user.id, {
      last_name: user.last_name || "",
      first_name: user.first_name || "",
      middle_name: user.middle_name || "",
      phone: user.phone || "",
      role: user.role,
      roles: userRoles(user),
      is_active: user.is_active,
    });
    setPanelMode("edit");
  };

  const closePanel = () => {
    setPanelMode(null);
    setSelectedUser(null);
    setError("");
  };

  const createUser = async (e) => {
    e.preventDefault();
    setError("");
    const lastName = form.last_name.trim();
    const firstName = form.first_name.trim();
    const middleName = form.middle_name.trim();
    const phone = normalizePhoneInput(form.phone).trim();

    if (!phone) {
      setError("Телефон обязателен");
      return;
    }
    if (form.password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }
    if (!lastName || !firstName) {
      setError("Фамилия и имя обязательны");
      return;
    }

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: form.password,
        last_name: lastName,
        first_name: firstName,
        middle_name: middleName || null,
        phone: phone || null,
        role: form.roles[0] || form.role,
        roles: form.roles,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(apiErrorMessage(data, "Не удалось создать пользователя"));
      return;
    }
    setForm({ ...emptyForm });
    await fetchUsers();
    closePanel();
  };

  const updateUser = async (user, patch) => {
    setError("");
    setSavingId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        last_name: patch.last_name ?? user.last_name ?? null,
        first_name: patch.first_name ?? user.first_name ?? null,
        middle_name: patch.middle_name ?? user.middle_name ?? null,
        phone: normalizePhoneInput(patch.phone ?? user.phone ?? ""),
        role: (patch.roles || userRoles(user))[0] || patch.role || user.role,
        roles: patch.roles || userRoles(user),
        is_active: patch.is_active ?? user.is_active,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(apiErrorMessage(data, "Не удалось обновить пользователя"));
    } else {
      await fetchUsers();
      setSelectedUser((current) => current?.id === user.id ? { ...current, ...patch } : current);
    }
    setSavingId(null);
  };

  const changePassword = async (user) => {
    const password = (passwords[user.id] || "").trim();
    if (password.length < 6) {
      setError("Новый пароль должен быть не короче 6 символов");
      return;
    }
    setError("");
    setSavingId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        last_name: user.last_name || null,
        first_name: user.first_name || null,
        middle_name: user.middle_name || null,
        phone: user.phone || null,
        role: userRoles(user)[0] || user.role,
        roles: userRoles(user),
        is_active: user.is_active,
        password,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(apiErrorMessage(data, "Не удалось сменить пароль"));
    } else {
      setPasswords((current) => ({ ...current, [user.id]: "" }));
      await fetchUsers();
    }
    setSavingId(null);
  };

  const deleteUser = async (user) => {
    if (currentUser?.id === user.id) {
      setError("Нельзя удалить текущую учетную запись");
      return;
    }
    if (!window.confirm(`Удалить сотрудника "${fullName(user)}"? Назначение с его задач будет снято.`)) return;

    setError("");
    setSavingId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(apiErrorMessage(data, "Не удалось удалить сотрудника"));
    } else {
      await fetchUsers();
      closePanel();
    }
    setSavingId(null);
  };

  const selectedDraft = selectedUser ? drafts[selectedUser.id] || {} : {};
  const panel = panelMode && (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Закрыть карточку сотрудника"
        className="hidden flex-1 cursor-default md:block"
        onClick={closePanel}
      />
      <div className="h-full w-full max-w-2xl bg-white shadow-2xl">
        {panelMode === "create" ? (
          <form onSubmit={createUser} className="flex h-full flex-col bg-white">
            <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div>
                <p className="text-[11px] font-bold text-slate-400">Персонал</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">Новый сотрудник</h3>
                <p className="mt-2 text-sm text-slate-500">Телефон, пароль, роль и контактные данные.</p>
              </div>
              <button type="button" onClick={closePanel} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-slate-50">
                Закрыть
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2">Фамилия *</label>
                  <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2">Имя *</label>
                  <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2">Отчество</label>
                  <input value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2">Телефон</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    onBlur={(e) => setForm({ ...form, phone: defaultPhoneInput(e.target.value) })}
                    placeholder="9001234567"
                    className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2">Пароль *</label>
                  <input required minLength={6} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-2">Роли</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Object.entries(ROLE_LABELS).map(([role, label]) => (
                      <label key={role} className="flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={form.roles.includes(role)}
                          onChange={() => setForm((current) => {
                            const roles = toggleRole(current.roles, role);
                            return { ...current, roles, role: roles[0] };
                          })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
              <button className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#3F8CFF] bg-[#3F8CFF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#1f78ff] hover:shadow-md">
                Создать сотрудника
              </button>
            </div>
          </form>
        ) : selectedUser && (
          <form onSubmit={(e) => { e.preventDefault(); updateUser(selectedUser, selectedDraft); }} className="flex h-full flex-col bg-white">
            <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                <UserAvatar user={selectedUser} size="lg" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400">Карточка сотрудника</p>
                  <h3 className="mt-1 text-xl font-black text-slate-900 break-words">{fullName(selectedUser)}</h3>
                  <p className="mt-2 text-sm text-slate-500">{selectedUser.phone || "Телефон не указан"} · ID {selectedUser.id}</p>
                </div>
              </div>
              <button type="button" onClick={closePanel} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-slate-50">
                Закрыть
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="flex flex-col gap-5">
                <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-2">Фамилия</label>
                      <input value={selectedDraft.last_name || ""} onChange={(e) => updateDraft(selectedUser.id, { last_name: e.target.value })} className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-2">Имя</label>
                      <input value={selectedDraft.first_name || ""} onChange={(e) => updateDraft(selectedUser.id, { first_name: e.target.value })} className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-2">Отчество</label>
                      <input value={selectedDraft.middle_name || ""} onChange={(e) => updateDraft(selectedUser.id, { middle_name: e.target.value })} className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-2">Телефон</label>
                      <input
                        value={selectedDraft.phone || ""}
                        onChange={(e) => updateDraft(selectedUser.id, { phone: e.target.value })}
                        onBlur={(e) => updateDraft(selectedUser.id, { phone: defaultPhoneInput(e.target.value) })}
                        placeholder="9001234567"
                        className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-2">Роли</label>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(ROLE_LABELS).map(([role, label]) => (
                          <label key={role} className="flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={(selectedDraft.roles || userRoles(selectedUser)).includes(role)}
                              onChange={() => {
                                const roles = toggleRole(selectedDraft.roles || userRoles(selectedUser), role);
                                updateDraft(selectedUser.id, { roles, role: roles[0] });
                              }}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="flex min-h-11 items-center gap-3 self-end rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-600">
                      <input type="checkbox" checked={Boolean(selectedDraft.is_active)} onChange={(e) => updateDraft(selectedUser.id, { is_active: e.target.checked })} />
                      Доступ включен
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                  <p className="text-sm font-bold text-slate-900">Пароль</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input type="password" placeholder="Новый пароль" value={passwords[selectedUser.id] || ""} onChange={(e) => setPasswords((current) => ({ ...current, [selectedUser.id]: e.target.value }))} className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10" />
                    <button type="button" onClick={() => changePassword(selectedUser)} disabled={savingId === selectedUser.id || !(passwords[selectedUser.id] || "").trim()} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-50">
                      Сменить пароль
                    </button>
                  </div>
                </div>

                {currentUser?.id !== selectedUser.id && (
                  <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-4 sm:p-5">
                    <p className="text-sm font-bold text-rose-700">Удаление сотрудника</p>
                    <p className="mt-1 text-xs text-rose-500">Сотрудник будет удален, а его назначение с открытых задач будет снято.</p>
                    <button
                      type="button"
                      onClick={() => deleteUser(selectedUser)}
                      disabled={savingId === selectedUser.id}
                      className="mt-4 inline-flex min-h-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition-all hover:-translate-y-0.5 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {savingId === selectedUser.id ? "Удаление..." : "Удалить сотрудника"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
              <button type="submit" disabled={savingId === selectedUser.id} className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#3F8CFF] bg-[#3F8CFF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#1f78ff] hover:shadow-md disabled:opacity-50">
                {savingId === selectedUser.id ? "Сохранение..." : "Сохранить данные"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-none space-y-6 p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-400">Администрирование</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">Персонал</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
            {filteredUsers.length} из {users.length}
          </div>
          <button type="button" onClick={openCreatePanel} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#3F8CFF] bg-[#3F8CFF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#1f78ff] hover:shadow-md">
            Добавить сотрудника
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl p-4">{error}</div>}

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="block text-[11px] font-bold text-slate-500 mb-2">Поиск по сотрудникам</label>
        <div className="relative">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ФИО, телефон, роль, статус или ID"
            className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 pr-11 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
              aria-label="Очистить поиск"
            >
              ×
            </button>
          ) : (
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {filteredUsers.map((user) => (
            <button key={user.id} type="button" onClick={() => openUserPanel(user)} className="rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <UserAvatar user={user} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-black text-slate-900">{fullName(user)}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${user.is_active ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                        {user.is_active ? "Активен" : "Отключен"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-mono text-slate-400">{user.phone || "Телефон не указан"} · ID {user.id}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                  {roleListLabel(user)}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-500 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="block text-[10px] font-bold text-slate-400">Телефон</span>
                  <span className="font-semibold text-slate-700">{user.phone || "Не указан"}</span>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="block text-[10px] font-bold text-slate-400">Доступ</span>
                  <span className="font-semibold text-slate-700">{user.is_active ? "Включен" : "Отключен"}</span>
                </div>
              </div>
            </button>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400">
          Сотрудники не найдены
        </div>
      )}

      {panel}
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("Панель");
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskChangeVersion, setTaskChangeVersion] = useState(0);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("smart_factory_theme");
    if (savedTheme) return savedTheme;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const logout = () => {
    clearToken();
    setActiveTaskId(null);
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
    if (userHasRole(user, ["admin"])) return true;
    if (page === "Персонал") return false;
    if (["Панель", "Все заявки", "Мои задачи"].includes(page)) return true;
    if (page === "База изделий") return userHasRole(user, ["engineer", "manager", "production", "assembler", "tester", "repair_engineer"]);
    if (page === "Склад ТМЦ") return userHasRole(user, ["warehouse", "manager", "engineer", "procurement", "packer"]);
    if (page === "Склад готовой продукции") return userHasRole(user, ["warehouse", "manager", "production", "packer"]);
    if (page === "Производство") return userHasRole(user, ["warehouse", "manager", "production", "assembler", "tester", "repair_engineer", "packer", "procurement"]);
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
      case "Персонал": return <Personnel currentUser={user} />;
      case "База изделий": return <GadgetsBase />;
      case "Склад ТМЦ": return <InventoryBase user={user} />;
      case "Склад готовой продукции": return <FinishedGoodsBase user={user} />;
      case "Производство": return <ManufacturingPage onOpenTask={setActiveTaskId} taskChangeVersion={taskChangeVersion} />;
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
      {activeTaskId && (
        <TaskDetailModal
          taskId={activeTaskId}
          user={user}
          onClose={() => setActiveTaskId(null)}
          onChanged={() => setTaskChangeVersion((version) => version + 1)}
        />
      )}
    </div>
  );
}
