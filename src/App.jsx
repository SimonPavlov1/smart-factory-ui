import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ChevronLeft, ChevronRight, CircleAlert, Clock3, Eye, EyeOff, ListChecks, LockKeyhole, Moon, Phone, Play, Plus, Sun } from "lucide-react";
import { CrmSidebar, CrmTopbar } from "./components/CrmNavigation.jsx";
import GadgetsBase from "./components/GadgetsBase.jsx";
import InventoryBase from "./components/InventoryBase.jsx";
import FinishedGoodsBase from "./components/FinishedGoodsBase.jsx";
import ManufacturingPage, { CalendarField } from "./components/ManufacturingPage";
import { clearToken, getToken, installAuthFetch, setToken } from "./api";
import { formatYekaterinburgDateTime } from "./dateTime";
import projectLogo from "./assets/logo.svg";
import "./index.css";
import "./app2.css";

installAuthFetch();
gsap.registerPlugin(useGSAP, ScrollTrigger);

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
  production_manager: "Руководитель производства",
};

const TASK_ROLE_LABELS = Object.fromEntries(
  Object.entries(ROLE_LABELS).filter(([role]) => role !== "admin"),
);

const ENABLE_ASSEMBLY_PLANNING = false;

const TASK_PAGE = {
  procurement_purchase: "Все задачи",
  accounting_payment: "Все задачи",
  warehouse_receive_components: "Склад ТМЦ",
  order_adjustment_return: "Склад ТМЦ",
  warehouse_issue_materials: "Производство",
  repair_issue_materials: "Производство",
  repair_receive_materials: "Производство",
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
  cancelled: "Отменена",
};

const TASK_UX_CONFIG = {
  procurement_purchase: {
    area: "Закупка",
    purpose: "Обеспечить заказ недостающими комплектующими",
    steps: ["Проверить дефицит и количество", "Указать поставщика, срок и документ", "Передать согласованную закупку на оплату"],
    action: "Передать на оплату",
    accent: "blue",
  },
  accounting_payment: {
    area: "Оплата",
    purpose: "Проверить основание и зафиксировать оплату поставщику",
    steps: ["Сверить счёт и сумму", "Провести оплату", "Приложить платёжное поручение"],
    action: "Подтвердить оплату",
    accent: "violet",
  },
  warehouse_receive_components: {
    area: "Приёмка",
    purpose: "Принять фактически поступившие комплектующие",
    steps: ["Сверить поставку с заказом", "Указать принятое количество", "Зафиксировать расхождения и завершить приёмку"],
    action: "Оприходовать поставку",
    accent: "cyan",
  },
  order_adjustment_return: {
    area: "Возврат материалов",
    purpose: "Вернуть на склад комплектующие, ставшие лишними после изменения заказа",
    steps: ["Сверить ведомость возврата", "Принять фактическое количество", "Оприходовать возвращённые позиции"],
    action: "Принять возврат",
    accent: "amber",
  },
  warehouse_issue_materials: {
    area: "Выдача материалов",
    purpose: "Подготовить комплектующие к передаче ответственному исполнителю",
    steps: ["Собрать позиции по ведомости", "Проверить количество и маркировку", "Отметить комплект готовым к выдаче"],
    action: "Готово к выдаче",
    accent: "amber",
  },
  assembler_receive_materials: {
    area: "Получение материалов",
    purpose: "Принять комплектующие для сборки",
    steps: ["Сверить позиции с ведомостью", "Проверить фактическое количество", "Подтвердить получение или указать расхождение"],
    action: "Подтвердить получение",
    accent: "amber",
  },
  repair_issue_materials: {
    area: "Выдача в ремонт",
    purpose: "Подготовить дополнительные компоненты инженеру",
    steps: ["Проверить заявку ремонта", "Собрать запрошенные позиции", "Отметить комплект готовым к выдаче"],
    action: "Готово к выдаче",
    accent: "amber",
  },
  repair_receive_materials: {
    area: "Получение для ремонта",
    purpose: "Принять дополнительные компоненты для устранения дефекта",
    steps: ["Сверить выданные позиции", "Проверить количество", "Подтвердить получение"],
    action: "Подтвердить получение",
    accent: "amber",
  },
  assembler_build: {
    area: "Сборка",
    purpose: "Зафиксировать выпуск и передать готовые единицы на тестирование",
    steps: ["Выбрать устройства из общего пула", "Отметить собранные заводские номера", "Передать собранные изделия на тестирование"],
    action: "Передать на тестирование",
    accent: "blue",
  },
  assembly_planning: {
    area: "Планирование производства",
    purpose: "Показать, как план выпуска распределён между сборщиками",
    steps: ["Сверить общий план изделия", "Проверить назначенные партии и сроки", "Контролировать выполнение дочерних задач"],
    action: "Распределение завершено",
    accent: "blue",
  },
  tester_check: {
    area: "Контроль качества",
    purpose: "Проверить изделия и отделить годные от дефектных",
    steps: ["Пройти контрольный чек-лист", "Указать количество годных и дефектных", "Передать годные на упаковку, дефектные — в ремонт"],
    action: "Завершить проверку",
    accent: "emerald",
  },
  repair_defects: {
    area: "Ремонт",
    purpose: "Устранить выявленные дефекты и вернуть изделие на повторный тест",
    steps: ["Изучить описание дефекта", "Зафиксировать выполненные работы и компоненты", "Передать изделие на повторную проверку"],
    action: "Передать на повторный тест",
    accent: "rose",
  },
  packer_pack: {
    area: "Упаковка",
    purpose: "Упаковать проверенные изделия и подготовить их к сдаче",
    steps: ["Сверить количество годных изделий", "Проверить комплектность упаковки", "Указать фактически упакованное количество"],
    action: "Передать на склад готовой продукции",
    accent: "violet",
  },
  warehouse_finished_goods: {
    area: "Склад готовой продукции",
    purpose: "Принять готовые изделия и увеличить складской остаток",
    steps: ["Сверить изделия и количество", "Проверить упаковку и маркировку", "Оприходовать фактически принятые изделия"],
    action: "Оприходовать изделия",
    accent: "emerald",
  },
  manual: {
    area: "Ручная задача",
    purpose: "Выполнить описанную работу и зафиксировать результат",
    steps: ["Изучить описание и зависимости", "Выполнить работу", "Добавить результат в комментарий и завершить задачу"],
    action: "Завершить задачу",
    accent: "slate",
  },
};

const TASK_KANBAN_COLUMNS = [
  { key: "assigned", title: "Назначены", description: "Нужно взять или назначить исполнителя" },
  { key: "in_progress", title: "В работе", description: "Задачи, которые уже выполняются" },
  { key: "hold", title: "Холд", description: "Пауза по решению исполнителя или менеджера" },
  { key: "waiting_delivery", title: "Ожидание", description: "Поставка или комплектующие еще не готовы" },
  { key: "delayed", title: "Задержка", description: "Плановая дата уже прошла" },
  { key: "done", title: "Готово", description: "Закрытые за последние 24 часа" },
];

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
  if (task.is_overdue) return "Просрочена";
  if (task.status !== "done" && task.type === "warehouse_receive_components" && expectedDates.length > 0) return "Ожидание комплектующих";
  return TASK_STATUS_LABELS[task.status] || task.status;
}

function taskStatusClass(task) {
  if (task.status === "cancelled") return "bg-rose-50 text-rose-700 border-rose-100";
  if (task.status === "hold") return "bg-amber-50 text-amber-700 border-amber-100";
  return task.is_overdue
    ? "bg-red-50 text-red-700 border-red-100"
    : "bg-blue-50 text-blue-600 border-blue-100";
}

function taskKanbanColumn(task) {
  const displayStatus = taskDisplayStatus(task);
  if (task.is_overdue) return "delayed";
  if (displayStatus === "Ожидание комплектующих") return "waiting_delivery";
  if (task.status === "open" || task.status === "assigned") return "assigned";
  if (task.status === "hold") return "hold";
  if (task.status === "waiting_delivery") return "waiting_delivery";
  if (task.status === "ready_to_issue") return "in_progress";
  if (task.status === "done") return "done";
  return "in_progress";
}

function canManageTasks(user) {
  return userHasRole(user, ["admin", "manager", "production_manager"]);
}

function userRoles(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.length ? roles : user?.role ? [user.role] : [];
}

function userTaskRoles(user) {
  return Array.isArray(user?.task_roles) ? user.task_roles : userRoles(user);
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
    const draft = task.payload?.procurement_draft || {};
    const draftDeliveries = draft.deliveries || [];
    return {
      invoice: draft.invoice || "",
      expected_date: draft.expected_date || "",
      supplier: draft.supplier || "",
      comment: draft.comment || "",
      invoice_file: null,
      invoice_file_name: "",
      deliveries: (task.payload?.shortages || []).map((item) => {
        const saved = draftDeliveries.find((entry) => (
          entry.line_uid ? entry.line_uid === item.line_uid : entry.component_id === item.component_id
        ));
        return {
          component_id: item.component_id,
          line_uid: item.line_uid,
          qty: saved?.qty || "",
        };
      }),
    };
  }
  if (["warehouse_receive_components", "order_adjustment_return"].includes(task.type)) {
    const sourceItems = task.type === "order_adjustment_return"
      ? (task.payload?.materials || [])
      : (task.payload?.shortages || []);
    return {
      closing_docs_file: null,
      closing_docs_file_name: "",
      comment: "",
      items: sourceItems.map((item) => ({ component_id: item.component_id, line_uid: item.line_uid, qty: "" })),
    };
  }
  if (task.type === "assembler_build") {
    const context = task.payload?.product_context || {};
    const serialStatuses = task.payload?.serial_number_statuses || {};
    const transferredSerials = new Set(task.payload?.transferred_serial_numbers || []);
    const assembledSerialNumbers = (task.payload?.serial_numbers || []).filter((serialNumber) => (
      transferredSerials.has(serialNumber)
      || ["assembled", "testing", "passed", "repair", "packed", "stocked"].includes(serialStatuses[serialNumber])
    ));
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
      assembled_serial_numbers: assembledSerialNumbers,
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
    const productLines = task.payload?.pending_product_lines?.length
      ? task.payload.pending_product_lines
      : (task.payload?.product_lines || []);
    const totalQty = productLines.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const checklist = (task.payload?.test_checklist || productLines[0]?.test_checklist || []).map((item, index) => ({
      id: item.id || `check-${index + 1}`,
      label: item.label || String(item),
      checked: null,
    }));
    return {
      passed_qty: totalQty ? String(totalQty) : "",
      defective_qty: "0",
      notes: "",
      defective_serial_numbers: [],
      defective_products: productLines.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        drawing_number: item.drawing_number,
        defective_qty: "",
      })),
      test_checklist: checklist,
      serial_test_results: (task.payload?.pending_serial_numbers || task.payload?.serial_numbers || []).map((serialNumber) => ({
        serial_number: serialNumber,
        reviewed: false,
        checklist: checklist.map((item) => ({ ...item })),
      })),
    };
  }
  if (task.type === "repair_defects") {
    const serialNumbers = task.payload?.serial_defects?.map((item) => item.serial_number)
      || task.payload?.serial_numbers
      || [];
    return {
      notes: "",
      extra_components: [],
      serial_repair_results: serialNumbers.map((serialNumber) => ({
        serial_number: serialNumber,
        work_done: "",
      })),
    };
  }
  if (task.type === "packer_pack") {
    return { packed_qty: "0", packed_serial_numbers: [] };
  }
  if (task.type === "accounting_payment") return { payment_ref: "", payment_order_file: null, payment_order_file_name: "", notes: "" };
  if (task.type === "warehouse_finished_goods") {
    const finishedGoods = task.payload?.pending_product_lines?.length
      ? task.payload.pending_product_lines
      : (task.payload?.finished_goods || []);
    return {
      accepted_goods: finishedGoods.map((item) => ({
        product_id: item.product_id,
        qty: item.qty || "",
      })),
      notes: "",
    };
  }
  return {};
}

function PayloadField({ label, name, value, onChange, type = "text" }) {
  const isComment = ["comment", "notes", "daily_comment"].includes(name);
  const controlClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400";
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      {isComment ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(name, e.target.value)}
          className={`${controlClass} min-h-24 resize-y py-3`}
        />
      ) : type === "number" ? (
        <span className="relative block">
          <input
            type="number"
            value={value ?? ""}
            onChange={(e) => onChange(name, e.target.value)}
            className={`${controlClass} pr-11 text-right text-base font-black`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">шт.</span>
        </span>
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(name, e.target.value)}
          className={controlClass}
        />
      )}
    </label>
  );
}

function componentTitle(item) {
  const details = [item.part_number, item.value, item.package].filter(Boolean).join(" · ");
  return details ? `${item.component_name || `Компонент ID ${item.component_id}`} (${details})` : item.component_name || `Компонент ID ${item.component_id}`;
}

function uniqueDesignators(value) {
  const seen = new Set();
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

function groupComponentsByDevice(components) {
  const devices = [];
  const deviceIndexes = new Map();

  components.forEach((component) => {
    const deviceName = String(component.device || "Устройство не указано").trim();
    const assemblyName = String(component.assembly || "Основной состав").trim();
    let deviceGroup = devices[deviceIndexes.get(deviceName)];

    if (!deviceGroup) {
      deviceGroup = { name: deviceName, assemblies: [], assemblyIndexes: new Map() };
      deviceIndexes.set(deviceName, devices.length);
      devices.push(deviceGroup);
    }

    let assemblyGroup = deviceGroup.assemblies[deviceGroup.assemblyIndexes.get(assemblyName)];
    if (!assemblyGroup) {
      assemblyGroup = { name: assemblyName, components: [] };
      deviceGroup.assemblyIndexes.set(assemblyName, deviceGroup.assemblies.length);
      deviceGroup.assemblies.push(assemblyGroup);
    }

    assemblyGroup.components.push(component);
  });

  return devices;
}

function ComponentSearchResults({ matches, onSelect }) {
  const deviceGroups = groupComponentsByDevice(matches);

  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-blue-100 bg-white shadow-xl shadow-blue-900/10">
      {deviceGroups.map((deviceGroup) => (
        <section key={deviceGroup.name} className="border-b border-blue-100 last:border-b-0">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/95 px-3 py-2 backdrop-blur">
            <span className="min-w-0 truncate text-xs font-black text-blue-700">{deviceGroup.name}</span>
            <span className="shrink-0 text-[10px] font-bold text-blue-500">
              {deviceGroup.assemblies.reduce((total, group) => total + group.components.length, 0)} поз.
            </span>
          </div>
          {deviceGroup.assemblies.map((assemblyGroup) => (
            <div key={`${deviceGroup.name}-${assemblyGroup.name}`}>
              <div className="border-b border-slate-100 bg-slate-50/90 px-3 py-1.5 text-[10px] font-black text-slate-500">
                {assemblyGroup.name}
              </div>
              {assemblyGroup.components.map((component) => (
                <button
                  key={`${deviceGroup.name}-${assemblyGroup.name}-${component.component_id}`}
                  type="button"
                  onClick={() => onSelect(component)}
                  className="group block w-full border-b border-slate-100 px-3 py-2.5 text-left text-xs transition last:border-b-0 hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  <span className="block font-black text-slate-800 transition-colors group-hover:text-blue-700">
                    {component.designators ? `${uniqueDesignators(component.designators)} · ` : ""}{component.component_name}
                  </span>
                  <span className="mt-0.5 block font-semibold text-slate-400">
                    {[component.part_number, component.value, component.package, component.category].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function ComponentSearchField({ value, onChange, matches, onSelect, placeholder, className }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 320 });

  const updatePopoverPosition = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportGap = 12;
    const width = Math.min(Math.max(rect.width, 480), window.innerWidth - viewportGap * 2);
    const left = Math.min(Math.max(viewportGap, rect.left), window.innerWidth - width - viewportGap);
    const estimatedHeight = 300;
    const top = rect.bottom + estimatedHeight <= window.innerHeight - viewportGap
      ? rect.bottom + 8
      : Math.max(viewportGap, rect.top - estimatedHeight - 8);
    setPopoverPosition({ top, left, width });
  }, []);

  useEffect(() => {
    if (!focused) return undefined;
    const reposition = () => updatePopoverPosition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [focused, updatePopoverPosition]);

  const showResults = focused && matches.length > 0;

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          updatePopoverPosition();
        }}
        onFocus={() => {
          updatePopoverPosition();
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showResults && createPortal(
        <div
          className="fixed z-[100]"
          style={{ top: popoverPosition.top, left: popoverPosition.left, width: popoverPosition.width }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <ComponentSearchResults
            matches={matches}
            onSelect={(component) => {
              setFocused(false);
              onSelect(component);
            }}
          />
        </div>,
        document.body,
      )}
    </>
  );
}

function lineProductLabel(item) {
  return item.product_name || item.product_context?.product_name || item.device || "Изделие не указано";
}

function taskFileUrl(file) {
  return `/api${file.url}`;
}

function AuthenticatedFileLink({ file, className = "", children }) {
  const openFile = async (event) => {
    event.preventDefault();
    const preview = window.open("about:blank", "_blank");
    if (preview) preview.opener = null;
    try {
      const response = await fetch(taskFileUrl(file));
      if (!response.ok) throw new Error("Не удалось открыть файл");
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      if (preview) {
        preview.location.href = objectUrl;
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      if (preview) preview.close();
      window.alert(error.message || "Не удалось открыть файл");
    }
  };

  return (
    <a href={taskFileUrl(file)} onClick={openFile} className={className}>
      {children}
    </a>
  );
}

function productFileUrl(file) {
  return `/api/production${file.url}`;
}

function assigneeName(task) {
  if (!task.assigned_user) return "Группа";
  return task.assigned_user.full_name || task.assigned_user.username;
}

function personInitials(person) {
  const name = person?.full_name || person?.username || "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function PersonnelAvatar({ user, size = "md" }) {
  return (
    <div className={`${size === "lg" ? "h-14 w-14 text-lg" : "h-12 w-12 text-base"} flex shrink-0 items-center justify-center rounded-full bg-[#6558e8] font-black text-white shadow-sm shadow-violet-500/20`}>
      {personInitials(user)}
    </div>
  );
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
  const dueValue = task.effective_deadline || task.due_date || task.sla_due_at;
  const dueDate = dueValue ? new Date(dueValue) : null;
  const hasDueDate = dueDate && !Number.isNaN(dueDate.getTime());
  const overdue = task.status !== "done" && hasDueDate && dueDate < new Date();
  const priorityLabel = {
    critical: "Критический",
    high: "Высокий",
    normal: "Обычный",
    low: "Низкий",
  }[task.priority];

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`task-work-card relative flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm transition-all ${
        compact ? "gap-3 p-4" : "gap-4 p-5"
      } ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "scale-[0.98] opacity-50" : ""} ${overdue ? "is-overdue" : ""}`}
    >
      {dropPlacement === "before" && (
        <div className="absolute -top-2 left-4 right-4 z-20 h-1 rounded-full bg-[#3F8CFF] shadow-[0_0_0_4px_rgba(63,140,255,0.14)]" />
      )}
      {dropPlacement === "after" && (
        <div className="absolute -bottom-2 left-4 right-4 z-20 h-1 rounded-full bg-[#3F8CFF] shadow-[0_0_0_4px_rgba(63,140,255,0.14)]" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="task-work-context">
            <span>{task.order_id ? `Заказ #${task.order_id}` : "Без заказа"}</span>
            <span>{ROLE_LABELS[task.role] || task.role}</span>
          </div>
          <h3 className={`${compact ? "line-clamp-3" : ""} task-work-title`}>{task.title}</h3>
        </div>
        <span className={`task-work-status shrink-0 border ${taskStatusClass(task)}`}>
          {taskDisplayStatus(task)}
        </span>
      </div>
      {!compact && task.description && <p className="task-work-description">{task.description}</p>}
      {task.payload?.shortages?.length > 0 && (
        <div className="task-work-alert">
          <CircleAlert size={14} /> Дефицит: {task.payload.shortages.length} поз.
        </div>
      )}
      <div className="task-work-meta">
        <span className={overdue ? "danger" : ""}>
          <Clock3 size={14} />
          {hasDueDate ? dueDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) : "Без срока"}
        </span>
        <span>{assigneeName(task)}</span>
        {priorityLabel && task.priority !== "normal" && <span className={`priority-${task.priority}`}>{priorityLabel}</span>}
      </div>
      <div className="task-work-actions">
        {!compact && <button onClick={() => onOpen(TASK_PAGE[task.type] || "Мои задачи")}>Открыть раздел</button>}
        <button onClick={() => onOpenTask(task.id)} className="task-work-primary">
          Открыть <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

const CANCELLATION_TASK_CONFIG = {
  cancellation_release_reservations: {
    title: "Снять резерв материалов",
    steps: ["Проверьте остатки резерва по заказу.", "Убедитесь, что материалы физически не переданы в производство.", "Снимите резерв и верните доступное количество на склад."],
    decisions: [["released", "Резерв снят", "Материалы снова доступны для других заказов."]],
  },
  cancellation_procurement_commitments: {
    title: "Урегулировать закупку",
    steps: ["Свяжитесь с поставщиком и проверьте возможность отмены.", "Если отмена невозможна — подтвердите приёмку поставки.", "Зафиксируйте финансовые последствия и договорённости."],
    decisions: [["cancelled", "Закупка отменена", "Поставщик подтвердил отмену."], ["accepted_delivery", "Поставку принимаем", "Товар поступит на склад для дальнейшего использования."]],
  },
  cancellation_financial_commitments: {
    title: "Закрыть финансовые обязательства",
    steps: ["Проверьте выставленные счета и проведённые оплаты.", "Зафиксируйте возврат, удержание или неизбежные расходы.", "Укажите финансовое влияние отмены."],
    decisions: [["cancelled", "Обязательства закрыты", "Оплата отменена или возвращена."], ["accepted_delivery", "Расход остаётся", "Оплату или удержание невозможно отменить."]],
  },
  cancellation_issued_materials: {
    title: "Сверить выданные материалы",
    steps: ["Получите у исполнителя фактический остаток.", "Отделите использованные, пригодные и повреждённые материалы.", "Верните пригодное на склад и зафиксируйте расхождения."],
    decisions: [["returned", "Материалы возвращены", "Пригодные остатки возвращены на склад."], ["scrap", "Материалы списаны", "Возврат невозможен, требуется списание."]],
  },
  cancellation_wip_disposition: {
    title: "Принять решение по незавершённому изделию",
    steps: ["Оцените степень готовности и стоимость продолжения.", "Проверьте возможность повторного использования комплектующих.", "Выберите экономически обоснованный вариант."],
    decisions: [["complete", "Завершить сборку", "Изделие будет закончено и оприходовано."], ["disassemble", "Разобрать изделие", "Пригодные компоненты вернутся на склад."], ["scrap", "Списать", "Изделие или материалы будут списаны."]],
  },
  cancellation_stop_confirmation: {
    title: "Подтвердить остановку заказа",
    steps: ["Убедитесь, что активных закупок и выдач нет.", "Проверьте, что производство фактически не начато.", "Подтвердите безопасную остановку заказа."],
    decisions: [["stopped", "Работы остановлены", "Заказ можно окончательно закрыть."]],
  },
};

function CancellationTaskModal({ task, onClose, onChanged, reload }) {
  const config = CANCELLATION_TASK_CONFIG[task.type] || CANCELLATION_TASK_CONFIG.cancellation_stop_confirmation;
  const [decision, setDecision] = useState("");
  const [note, setNote] = useState("");
  const [quantityReturned, setQuantityReturned] = useState("");
  const [quantityUsed, setQuantityUsed] = useState("");
  const [quantityDamaged, setQuantityDamaged] = useState("");
  const [financialImpact, setFinancialImpact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const obligationId = task.payload?.cancellation_obligation_id;
  const resolution = task.payload?.resolution;
  const completed = task.status === "done";

  const submit = async () => {
    if (!decision || !obligationId || !task.order_id) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/manufacturing/orders/${task.order_id}/cancellation/obligations/${obligationId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        note: note.trim() || null,
        quantity_returned: quantityReturned === "" ? null : Number(quantityReturned),
        quantity_used: quantityUsed === "" ? null : Number(quantityUsed),
        quantity_damaged: quantityDamaged === "" ? null : Number(quantityDamaged),
        financial_impact: financialImpact === "" ? null : Number(financialImpact),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось зафиксировать решение");
      return;
    }
    await onChanged();
    await reload();
  };

  const inputClass = "min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10";

  return (
    <div className="task-fullscreen-shell fixed inset-0 z-50 h-[100dvh] bg-white">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-start justify-between gap-5 border-b border-slate-100 p-5 sm:px-8 sm:py-6">
          <div>
            <div className="text-xs font-black text-blue-600">Отмена заказа #{task.order_id} · Задача #{task.id}</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{config.title}</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">Ответственный отдел: {ROLE_LABELS[task.role] || task.role} · Исполнитель: {assigneeName(task)}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl font-bold text-slate-500">×</button>
        </div>

        <div className="w-full max-w-none flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="text-base font-black text-slate-900">Что нужно сделать</h3>
              <ol className="mt-4 space-y-4">
                {config.steps.map((step, index) => (
                  <li className="flex gap-3 text-sm font-medium leading-6 text-slate-600" key={step}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">
                Задача завершится только после фиксации решения. Событие сохранится в журнале заказа.
              </div>
            </section>

            <section>
              <h3 className="text-base font-black text-slate-900">{completed ? "Зафиксированное решение" : "Результат проверки"}</h3>
              {completed ? (
                <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                  <div className="text-lg font-black text-emerald-900">{config.decisions.find(([value]) => value === resolution?.decision)?.[1] || "Решение принято"}</div>
                  {resolution?.note && <p className="mt-2 text-sm font-medium text-emerald-800">{resolution.note}</p>}
                  <div className="mt-4 text-xs font-bold text-emerald-700">Задача выполнена</div>
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-flow-dense grid-cols-1 gap-3 sm:grid-cols-2">
                    {config.decisions.map(([value, title, description]) => (
                      <button type="button" key={value} onClick={() => setDecision(value)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${decision === value ? "border-blue-400 bg-blue-50 ring-4 ring-blue-500/10" : "border-slate-200"}`}>
                        <strong className="text-sm font-black text-slate-900">{title}</strong>
                        <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">{description}</span>
                      </button>
                    ))}
                  </div>
                  {["cancellation_issued_materials", "cancellation_wip_disposition"].includes(task.type) && (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label><span className="mb-1 block text-xs font-bold text-slate-500">Возвращено</span><input type="number" min="0" value={quantityReturned} onChange={(e) => setQuantityReturned(e.target.value)} className={inputClass} /></label>
                      <label><span className="mb-1 block text-xs font-bold text-slate-500">Использовано</span><input type="number" min="0" value={quantityUsed} onChange={(e) => setQuantityUsed(e.target.value)} className={inputClass} /></label>
                      <label><span className="mb-1 block text-xs font-bold text-slate-500">Повреждено</span><input type="number" min="0" value={quantityDamaged} onChange={(e) => setQuantityDamaged(e.target.value)} className={inputClass} /></label>
                    </div>
                  )}
                  {["cancellation_procurement_commitments", "cancellation_financial_commitments"].includes(task.type) && (
                    <label className="mt-4 block"><span className="mb-1 block text-xs font-bold text-slate-500">Финансовые последствия, ₽</span><input type="number" min="0" step="0.01" value={financialImpact} onChange={(e) => setFinancialImpact(e.target.value)} className={inputClass} /></label>
                  )}
                  <label className="mt-4 block"><span className="mb-1 block text-xs font-bold text-slate-500">Комментарий и подтверждающие детали</span><textarea value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} min-h-24 py-3`} placeholder="Что проверили и почему выбрали это решение" /></label>
                  {error && <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
                </>
              )}
            </section>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white p-4 sm:px-8 sm:py-5">
          <button type="button" onClick={onClose} className="min-h-11 rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-600">Закрыть</button>
          {!completed && <button type="button" disabled={!decision || saving} onClick={submit} className="min-h-11 rounded-2xl bg-blue-600 px-6 text-sm font-black text-white disabled:bg-slate-300">{saving ? "Сохраняем..." : "Завершить задачу"}</button>}
        </div>
      </div>
    </div>
  );
}

function buildAutomaticAssemblyAllocations(productLines, assemblers, dueDate) {
  const deadline = dueDate ? String(dueDate).slice(0, 10) : "";

  if (!assemblers.length) {
    return productLines.map((line, lineIndex) => ({
      id: `unassigned-${line.order_item_id || line.product_id || lineIndex}`,
      order_item_id: line.order_item_id || null,
      product_id: line.product_id || null,
      product_name: line.product_name || "Изделие",
      user_id: "",
      quantity: Number(line.qty || 0) || "",
      due_date: deadline,
    }));
  }

  return productLines.flatMap((line, lineIndex) => {
    const quantity = Math.max(0, Math.floor(Number(line.qty || 0)));
    const baseQuantity = Math.floor(quantity / assemblers.length);
    const remainder = quantity % assemblers.length;

    return assemblers.flatMap((assembler, assemblerIndex) => {
      const assignedQuantity = baseQuantity + (assemblerIndex < remainder ? 1 : 0);
      if (!assignedQuantity) return [];
      return [{
        id: `auto-${line.order_item_id || line.product_id || lineIndex}-${assembler.id}`,
        order_item_id: line.order_item_id || null,
        product_id: line.product_id || null,
        product_name: line.product_name || "Изделие",
        user_id: assembler.id,
        quantity: assignedQuantity,
        due_date: deadline,
      }];
    });
  });
}

function russianCountLabel(count, one, few, many) {
  const value = Math.abs(Number(count)) % 100;
  const lastDigit = value % 10;
  if (value > 10 && value < 20) return many;
  if (lastDigit === 1) return one;
  if (lastDigit >= 2 && lastDigit <= 4) return few;
  return many;
}

function AssemblyPlanningModal({ task, users, onClose, onChanged }) {
  const productLines = task.payload?.product_lines || [task.payload?.product_context].filter(Boolean);
  const assemblers = users.filter((item) => userHasRole(item, ["assembler"]));
  const automaticAllocations = buildAutomaticAssemblyAllocations(productLines, assemblers, task.due_date);
  const [manualAllocations, setManualAllocations] = useState(null);
  const allocations = manualAllocations ?? automaticAllocations;
  const [openRowId, setOpenRowId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateAllocations = (updater) => setManualAllocations((current) => updater(current ?? automaticAllocations));
  const change = (id, patch) => updateAllocations((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addRow = (line = productLines[0]) => updateAllocations((current) => [...current, {
    id: crypto.randomUUID(),
    order_item_id: line?.order_item_id || null,
    product_id: line?.product_id || null,
    product_name: line?.product_name || "Изделие",
    user_id: "",
    quantity: "",
    due_date: task.due_date ? String(task.due_date).slice(0, 10) : "",
  }]);

  const totals = allocations.reduce((result, item) => {
    const key = item.order_item_id || item.product_id;
    result[key] = (result[key] || 0) + Number(item.quantity || 0);
    return result;
  }, {});

  const submit = async () => {
    if (allocations.some((item) => !item.user_id || Number(item.quantity || 0) <= 0)) {
      setError("Для каждой партии выберите сборщика и количество");
      return;
    }
    const incompleteLine = productLines.find((line) => {
      const key = line.order_item_id || line.product_id;
      return Number(totals[key] || 0) !== Number(line.qty || 0);
    });
    if (incompleteLine) {
      setError(`Распределите все изделия «${incompleteLine.product_name || "Изделие"}»: сейчас ${totals[incompleteLine.order_item_id || incompleteLine.product_id] || 0} из ${incompleteLine.qty || 0} шт.`);
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/tasks/${task.id}/assembly-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allocations: allocations.map(({ user_id, quantity, order_item_id, product_id, due_date }) => ({
          user_id: Number(user_id),
          quantity: Number(quantity),
          order_item_id,
          product_id,
          due_date: due_date || null,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось распределить сборку");
      return;
    }
    await onChanged();
    onClose();
  };

  return (
    <div className="task-fullscreen-shell fixed inset-0 z-50 h-[100dvh] bg-white">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-start justify-between gap-5 border-b border-slate-100 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.11),transparent_45%)] p-5 sm:px-8 sm:py-6">
          <div>
            <div className="text-xs font-bold text-blue-600">Заказ #{task.order_id} · план сборки</div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Распределить изделия между сборщиками</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">После подтверждения появится общая очередь, а заводские номера будут первоначально закреплены за выбранными сборщиками.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-500">×</button>
        </div>
        <div className="w-full max-w-none flex-1 overflow-y-auto p-5 sm:p-8">
          <div className={`mb-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${assemblers.length ? "border-blue-100 bg-blue-50/70" : "border-amber-200 bg-amber-50"}`}>
            <div>
              <div className={`text-sm font-black ${assemblers.length ? "text-blue-950" : "text-amber-950"}`}>
                {assemblers.length ? "План уже сформирован автоматически" : "Нет доступных сборщиков"}
              </div>
              <div className={`mt-1 text-xs font-semibold ${assemblers.length ? "text-blue-700" : "text-amber-800"}`}>
                {assemblers.length
                  ? `${assemblers.length} ${russianCountLabel(assemblers.length, "сборщик", "сборщика", "сборщиков")} · ${allocations.length} ${russianCountLabel(allocations.length, "назначение", "назначения", "назначений")} · остаток распределён по одному изделию`
                  : "Добавьте активному сотруднику роль сборщика и снова откройте задачу."}
              </div>
            </div>
            {assemblers.length > 0 && (
              <button type="button" onClick={() => { setManualAllocations(null); setError(""); }} className="min-h-10 shrink-0 rounded-xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition hover:border-blue-300 hover:shadow-sm">
                Распределить заново
              </button>
            )}
          </div>
          <div className="mb-5 grid grid-flow-dense grid-cols-1 gap-3 md:grid-cols-3">
            {productLines.map((line) => {
              const key = line.order_item_id || line.product_id;
              const planned = Number(line.qty || 0);
              const distributed = Number(totals[key] || 0);
              return (
                <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="truncate text-sm font-black text-slate-900">{line.product_name || "Изделие"}</div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">Распределено {distributed} из {planned} шт.</div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full ${distributed > planned ? "bg-rose-500" : "bg-blue-500"}`} style={{ width: `${Math.min(planned ? distributed / planned * 100 : 0, 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
          <div className="space-y-3">
            {allocations.map((allocation) => (
              <div key={allocation.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_240px_130px_170px_40px] md:items-end">
                <label>
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Изделие</span>
                  <select
                    value={allocation.order_item_id || allocation.product_id || ""}
                    onChange={(e) => {
                      const line = productLines.find((item) => String(item.order_item_id || item.product_id) === e.target.value);
                      if (line) change(allocation.id, { order_item_id: line.order_item_id || null, product_id: line.product_id || null, product_name: line.product_name });
                    }}
                    className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"
                  >
                    {productLines.map((line) => <option key={line.order_item_id || line.product_id} value={line.order_item_id || line.product_id}>{line.product_name}</option>)}
                  </select>
                </label>
                <div className="relative">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Сборщик</span>
                  <button type="button" onClick={() => setOpenRowId(openRowId === allocation.id ? null : allocation.id)} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
                    <span className="truncate">{assemblers.find((item) => Number(item.id) === Number(allocation.user_id))?.full_name || "Выбрать сборщика"}</span>
                    <span>⌄</span>
                  </button>
                  {openRowId === allocation.id && <div className="absolute z-30 mt-2 max-h-52 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    {assemblers.map((item) => <button type="button" key={item.id} onClick={() => { change(allocation.id, { user_id: item.id }); setOpenRowId(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-blue-50"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">{personInitials(item)}</span>{item.full_name || item.username}</button>)}
                  </div>}
                </div>
                <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Количество</span><input type="number" min="1" value={allocation.quantity} onChange={(e) => change(allocation.id, { quantity: e.target.value })} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-right text-base font-black" /></label>
                <label className="min-w-0">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Срок</span>
                  <CalendarField
                    value={allocation.due_date}
                    onChange={(value) => change(allocation.id, { due_date: value })}
                    className="min-w-0"
                  />
                </label>
                <button type="button" disabled={allocations.length === 1} onClick={() => updateAllocations((current) => current.filter((item) => item.id !== allocation.id))} className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 text-rose-500 disabled:opacity-30">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addRow()} className="mt-4 min-h-10 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">Добавить партию</button>
          {error && <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">Отмена</button>
          <button type="button" onClick={submit} disabled={saving} className="min-h-11 rounded-xl bg-blue-600 px-6 text-sm font-black text-white disabled:bg-slate-300">{saving ? "Создаём очередь..." : "Сформировать общую очередь"}</button>
        </div>
      </div>
    </div>
  );
}

function TaskDetailModal({ taskId, user, onClose, onChanged }) {
  const completionKeyRef = useRef(null);
  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [note, setNote] = useState("");
  const [completionPayload, setCompletionPayload] = useState({});
  const [bomComponentOptions, setBomComponentOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState("");
  const [deadlineReason, setDeadlineReason] = useState("");
  const [deadlineSaving, setDeadlineSaving] = useState(false);
  const [assemblyTab, setAssemblyTab] = useState("work");
  const [assemblySerialSearch, setAssemblySerialSearch] = useState("");
  const [assemblySerialsExpanded, setAssemblySerialsExpanded] = useState(false);
  const [assemblySerialFilter, setAssemblySerialFilter] = useState("my");
  const [testingStep, setTestingStep] = useState("checklist");
  const [serialSearch, setSerialSearch] = useState("");
  const [activeTestSerial, setActiveTestSerial] = useState("");
  const [repairTab, setRepairTab] = useState("devices");
  const [activeRepairSerial, setActiveRepairSerial] = useState("");
  const [packingSerialSearch, setPackingSerialSearch] = useState("");

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const data = await res.json();
      setTask(data);
      setDeadlineValue(data.due_date ? String(data.due_date).slice(0, 16) : "");
      setDeadlineReason("");
      if (data.type === "assembler_build") {
        setAssemblySerialSearch("");
        setAssemblySerialsExpanded(false);
      }
      if (data.type === "tester_check") {
        setTestingStep("checklist");
        setSerialSearch("");
        const myClaimedSerials = (data.payload?.pending_serial_numbers || []).filter((serialNumber) => (
          Number(data.payload?.testing_claims?.[serialNumber]) === Number(user?.id)
        ));
        setActiveTestSerial(myClaimedSerials[0] || "");
      }
      if (data.type === "repair_defects") {
        setRepairTab("devices");
        setActiveRepairSerial(data.payload?.serial_defects?.[0]?.serial_number || data.payload?.serial_numbers?.[0] || "");
      }
      if (data.type === "packer_pack") setPackingSerialSearch("");
      setCompletionPayload(
        data.type === "assembler_build"
          ? defaultCompletionPayload(data)
          : { ...defaultCompletionPayload(data), ...(data.payload?.completion || {}) }
      );
    }
  }, [taskId, user?.id]);

  useEffect(() => {
    completionKeyRef.current = null;
    queueMicrotask(load);
  }, [load]);

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
  }, [
    task?.id,
    task?.type,
    task?.order_id,
    task?.payload?.component_options?.length,
    task?.payload?.product_context?.product_id,
  ]);

  const userRolesKey = JSON.stringify(user?.roles || []);
  useEffect(() => {
    const loadUsers = async () => {
      if (!task || (!canManageTasks(user) && task.type !== "assembler_build")) return;
      const endpoint = canManageTasks(user) ? "/api/users" : "/api/tasks/assignees";
      const res = await fetch(`${endpoint}?role=${encodeURIComponent(task.role)}`);
      if (res.ok) setUsers(await res.json());
    };
    loadUsers();
  }, [task, user, userRolesKey]);

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

  const changeSerialChecklist = (serialNumber, index, checked) => {
    setCompletionPayload((current) => ({
      ...current,
      serial_test_results: (current.serial_test_results || []).map((result) => (
        result.serial_number === serialNumber
          ? {
              ...result,
              reviewed: false,
              checklist: (result.checklist || []).map((item, itemIndex) => (
                itemIndex === index ? { ...item, checked } : item
              )),
            }
          : result
      )),
    }));
  };

  const passAllSerialChecks = (serialNumber) => {
    setCompletionPayload((current) => ({
      ...current,
      serial_test_results: (current.serial_test_results || []).map((result) => (
        result.serial_number === serialNumber
          ? {
              ...result,
              reviewed: false,
              checklist: (result.checklist || []).map((item) => ({ ...item, checked: true })),
            }
          : result
      )),
    }));
  };

  const confirmSerialTestResult = (serialNumber) => {
    const currentResult = (completionPayload.serial_test_results || []).find((result) => result.serial_number === serialNumber);
    const incompleteChecks = (currentResult?.checklist || []).filter((item) => typeof item.checked !== "boolean");
    if (incompleteChecks.length > 0) {
      setError(`Проверьте все пункты: осталось ${incompleteChecks.length}`);
      return;
    }
    setError("");
    setCompletionPayload((current) => {
      const serialResults = (current.serial_test_results || []).map((result) => (
        result.serial_number === serialNumber ? { ...result, reviewed: true } : result
      ));
      const defectiveSerialNumbers = serialResults
        .filter((result) => result.reviewed && (result.checklist || []).some((item) => !item.checked))
        .map((result) => result.serial_number);
      const reviewedCount = serialResults.filter((result) => result.reviewed).length;
      return {
        ...current,
        serial_test_results: serialResults,
        defective_serial_numbers: defectiveSerialNumbers,
        defective_qty: String(defectiveSerialNumbers.length),
        passed_qty: String(Math.max(reviewedCount - defectiveSerialNumbers.length, 0)),
      };
    });
    const nextSerial = (completionPayload.serial_test_results || []).find((result) => (
      result.serial_number !== serialNumber
      && !result.reviewed
      && Number(task?.payload?.testing_claims?.[result.serial_number]) === Number(user?.id)
    ))?.serial_number;
    if (nextSerial) setActiveTestSerial(nextSerial);
  };

  const changeSerialRepairResult = (serialNumber, workDone) => {
    setCompletionPayload((current) => ({
      ...current,
      serial_repair_results: (current.serial_repair_results || []).map((result) => (
        result.serial_number === serialNumber ? { ...result, work_done: workDone } : result
      )),
    }));
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

  const removeExtraComponent = (index) => {
    setCompletionPayload((current) => ({
      ...current,
      extra_components: (current.extra_components || []).filter((_, itemIndex) => itemIndex !== index),
    }));
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
      const productLines = task?.payload?.pending_product_lines?.length
        ? task.payload.pending_product_lines
        : (task?.payload?.product_lines || []);
      const productLine = productLines.find((item) => item.product_id === productId);
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
      const totalQty = productLines.reduce((sum, item) => sum + Number(item.qty || 0), 0);
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

  const saveDeadline = async () => {
    const reason = deadlineReason.trim();
    if (!reason) {
      setError("Укажите причину установки или изменения срока");
      return;
    }
    setError("");
    setDeadlineSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/deadline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_date: deadlineValue || null, reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Не удалось изменить дедлайн");
        return;
      }
      setSuccessMessage(deadlineValue ? "Дедлайн сохранён" : "Дедлайн снят");
      await load();
      onChanged();
    } finally {
      setDeadlineSaving(false);
    }
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
    const action = ["assembler_receive_materials", "repair_receive_materials"].includes(task.type) ? "Получение" : "Выдача";
    link.href = url;
    link.download = `${action} комплектующих заказ ${task.order_id}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const complete = async (saveOnly = false) => {
    completionKeyRef.current ||= crypto.randomUUID();
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
      body: JSON.stringify({ payload: numericPayload, idempotency_key: completionKeyRef.current }),
    });
    setLoading(false);
    if (res.ok) {
      completionKeyRef.current = null;
      const data = await res.json();
      onChanged();
      if (["partial", "waiting_delivery"].includes(data.result?.status)) {
        if (saveOnly) setSuccessMessage(data.result?.message || "Черновик сохранён");
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
      <div className="task-fullscreen-shell flex min-h-[calc(100dvh-72px)] items-center justify-center bg-white">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-sm font-semibold text-slate-400">Загрузка задачи...</div>
      </div>
    );
  }

  if (task.type?.startsWith("cancellation_")) {
    return (
      <CancellationTaskModal
        task={task}
        onClose={onClose}
        onChanged={onChanged}
        reload={load}
      />
    );
  }

  if (ENABLE_ASSEMBLY_PLANNING && task.type === "assembler_build" && !task.payload?.parent_planning_task_id && canManageTasks(user)) {
    return (
      <AssemblyPlanningModal
        task={task}
        users={users}
        onClose={onClose}
        onChanged={onChanged}
      />
    );
  }

  const notes = task.payload?.notes || [];
  const shortages = task.type === "order_adjustment_return"
    ? (task.payload?.materials || [])
    : (task.payload?.shortages || []);
  const purchases = task.payload?.purchases || [];
  const invoiceAttachments = [
    task.payload?.invoice_attachment,
    ...purchases.map((purchase) => purchase.invoice_attachment),
  ].filter(Boolean).filter((file, index, files) => {
    const fileKey = file.id || file.storage_path || file.path || file.url || file.original_name;
    return files.findIndex((candidate) => (
      candidate.id || candidate.storage_path || candidate.path || candidate.url || candidate.original_name
    ) === fileKey) === index;
  });
  const orderedItems = task.payload?.ordered_items || (["warehouse_receive_components", "order_adjustment_return"].includes(task.type) ? shortages : []);
  const receiptHistory = task.payload?.receipt_history || [];
  const transferMaterials = task.payload?.materials || [];
  const materialTransfer = task.payload?.material_transfer || null;
  const transferLineFor = (material) => (materialTransfer?.lines || []).find((line) => (
    material.line_uid ? line.line_uid === material.line_uid : line.component_id === material.component_id
  ));
  const productDocuments = task.payload?.product_documents || [];
  const pendingProductLines = task.payload?.pending_product_lines || [];
  const finishedGoods = pendingProductLines.length > 0 ? pendingProductLines : (task.payload?.finished_goods || []);
  const packingProductLines = pendingProductLines.length > 0
    ? pendingProductLines
    : (task.payload?.product_lines || [task.payload?.product_context].filter(Boolean));
  const selectedPackingSerialNumbers = completionPayload.packed_serial_numbers || [];
  const pendingPackingSerialNumbers = task.payload?.pending_serial_numbers || task.payload?.serial_numbers || [];
  const packingSerialUnits = (task.payload?.serial_units?.length
    ? task.payload.serial_units.filter((item) => pendingPackingSerialNumbers.includes(item.serial_number))
    : pendingPackingSerialNumbers.map((serialNumber) => {
        const line = packingProductLines[0] || task.payload?.product_context || {};
        return {
          serial_number: serialNumber,
          product_id: line.product_id,
          product_name: line.product_name,
          drawing_number: line.drawing_number,
          status: "passed",
        };
      }));
  const visiblePackingSerialUnits = packingSerialUnits.filter((item) => {
    const query = packingSerialSearch.trim().toLowerCase();
    return !query || [item.serial_number, item.product_name, item.drawing_number].some((value) => (
      String(value || "").toLowerCase().includes(query)
    ));
  });
  const packingSelectedCount = selectedPackingSerialNumbers.length;
  const testProductLines = pendingProductLines.length > 0 ? pendingProductLines : (task.payload?.product_lines || []);
  const testTotalQty = testProductLines.reduce((sum, item) => sum + Number(item.qty || 0), testProductLines.length ? 0 : Number(task.payload?.assembled_qty || 0));
  const serialTestResults = completionPayload.serial_test_results || [];
  const testingClaims = task.payload?.testing_claims || {};
  const testingClaimDetails = task.payload?.testing_claim_details || [];
  const myTestingSerialNumbers = serialTestResults
    .filter((result) => Number(testingClaims[result.serial_number]) === Number(user?.id))
    .map((result) => result.serial_number);
  const mySerialTestResults = serialTestResults.filter((result) => myTestingSerialNumbers.includes(result.serial_number));
  const freeSerialTestResults = serialTestResults.filter((result) => !testingClaims[result.serial_number]);
  const otherClaimedSerialTestResults = serialTestResults.filter((result) => (
    testingClaims[result.serial_number]
    && Number(testingClaims[result.serial_number]) !== Number(user?.id)
  ));
  const testingColleagueSummary = Object.entries(
    testingClaimDetails
      .filter((claim) => Number(claim.user_id) !== Number(user?.id))
      .reduce((result, claim) => {
        result[claim.user_name] = (result[claim.user_name] || 0) + 1;
        return result;
      }, {}),
  ).map(([name, count]) => `${name} — ${count}`).join(", ");
  const reviewedSerialTestResults = serialTestResults.filter((result) => result.reviewed);
  const defectiveSerialTestResults = reviewedSerialTestResults.filter((result) => (
    (result.checklist || []).some((item) => !item.checked)
  ));
  const passedSerialTestResults = reviewedSerialTestResults.filter((result) => (
    (result.checklist || []).every((item) => item.checked)
  ));
  const testDefectiveTotal = serialTestResults.length
    ? defectiveSerialTestResults.length
    : (completionPayload.defective_products || []).reduce((sum, item) => sum + Number(item.defective_qty || 0), Number(testProductLines.length ? 0 : completionPayload.defective_qty || 0));
  const testPassedTotal = serialTestResults.length
    ? passedSerialTestResults.length
    : Math.max(testTotalQty - testDefectiveTotal, 0);
  const taskSerialNumbers = task.payload?.serial_numbers || [];
  const taskSerialNumberStatuses = task.payload?.serial_number_statuses || {};
  const assemblyClaims = task.payload?.assembly_claims || {};
  const assemblyClaimDetails = task.payload?.assembly_claim_details || [];
  const selectedAssemblySerialNumbers = completionPayload.assembled_serial_numbers || [];
  const transferredAssemblySerialNumbers = task.payload?.transferred_serial_numbers || [];
  const transferredAssemblySerialSet = new Set(transferredAssemblySerialNumbers);
  const visibleTaskSerialNumbers = taskSerialNumbers.filter((serialNumber) => (
    String(serialNumber).toLowerCase().includes(serialSearch.trim().toLowerCase())
  ));
  const filteredAssemblySerialNumbers = taskSerialNumbers.filter((serialNumber) => (
    String(serialNumber).toLowerCase().includes(assemblySerialSearch.trim().toLowerCase())
    && (
      assemblySerialFilter === "all"
      || (assemblySerialFilter === "transferred" && transferredAssemblySerialSet.has(serialNumber))
      || (assemblySerialFilter === "assembled" && selectedAssemblySerialNumbers.includes(serialNumber) && !transferredAssemblySerialSet.has(serialNumber))
      || (
        !selectedAssemblySerialNumbers.includes(serialNumber)
        && (
          (assemblySerialFilter === "free" && !assemblyClaims[serialNumber])
          || (assemblySerialFilter === "my" && Number(assemblyClaims[serialNumber]) === Number(user?.id))
          || (assemblySerialFilter === "other" && assemblyClaims[serialNumber] && Number(assemblyClaims[serialNumber]) !== Number(user?.id))
        )
      )
    )
  ));
  const assemblySerialPageSize = 10;
  const visibleAssemblySerialNumbers = assemblySerialSearch.trim() || assemblySerialsExpanded
    ? filteredAssemblySerialNumbers
    : filteredAssemblySerialNumbers.slice(0, assemblySerialPageSize);
  const processedTaskSerialCount = taskSerialNumbers.filter((serialNumber) => (
    ["passed", "repair", "packed", "stocked"].includes(taskSerialNumberStatuses[serialNumber])
  )).length;
  const planningAllocations = task.payload?.assembly_allocations || [];
  const planningTotal = Number(task.payload?.planned_qty || task.payload?.product_context?.qty || 0);
  const planningAllocatedTotal = planningAllocations.reduce((sum, item) => sum + Number(item.planned_qty || 0), 0);
  const planningProducedTotal = planningAllocations.reduce((sum, item) => sum + Number(item.produced_qty || 0), 0);
  const activeSerialTestResult = serialTestResults.find((result) => result.serial_number === activeTestSerial);
  const activeTestChecklistTotal = activeSerialTestResult?.checklist?.length || 0;
  const activeTestChecklistCompleted = (activeSerialTestResult?.checklist || []).filter((item) => typeof item.checked === "boolean").length;
  const activeTestChecklistReady = Boolean(activeSerialTestResult) && activeTestChecklistCompleted === activeTestChecklistTotal;
  const dailyProgress = task.payload?.daily_progress || [];
  const materialRequests = task.payload?.material_requests || [];
  const openMaterialFlow = task.payload?.open_material_flow || [];
  const repairDefectiveProducts = pendingProductLines.length > 0 ? pendingProductLines : (task.payload?.defective_products || []);
  const repairDefectiveQty = repairDefectiveProducts.reduce((sum, item) => sum + Number(item.qty || item.defective_qty || 0), 0);
  const repairContext = task.payload?.product_context || repairDefectiveProducts[0] || {};
  const repairSerialDefects = task.payload?.serial_defects?.length
    ? task.payload.serial_defects
    : (task.payload?.serial_numbers || []).map((serialNumber) => ({
        serial_number: serialNumber,
        failed_checks: [],
        tester_note: task.payload?.notes || "",
      }));
  const activeRepairDefect = repairSerialDefects.find((defect) => defect.serial_number === activeRepairSerial) || repairSerialDefects[0];
  const serialRepairResults = completionPayload.serial_repair_results || [];
  const activeSerialRepairResult = serialRepairResults.find((result) => result.serial_number === activeRepairDefect?.serial_number);
  const completedSerialRepairResults = serialRepairResults.filter((result) => String(result.work_done || "").trim());
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
  const procurementDraftLines = shortages.map((item) => {
    const delivery = deliveries.find((entry) => (
      entry.line_uid ? entry.line_uid === item.line_uid : entry.component_id === item.component_id
    ));
    const requiredQty = Number(item.shortage_qty || item.qty || 0);
    const draftQty = Number(delivery?.qty || 0);
    return {
      item,
      delivery,
      requiredQty,
      draftQty,
      remainingQty: Math.max(requiredQty - draftQty, 0),
      excessQty: Math.max(draftQty - requiredQty, 0),
      status: draftQty <= 0 ? "empty" : draftQty < requiredQty ? "partial" : draftQty > requiredQty ? "excess" : "complete",
    };
  });
  const procurementSelectedLines = procurementDraftLines.filter((line) => line.draftQty > 0).length;
  const procurementPartialLines = procurementDraftLines.filter((line) => line.status === "partial").length;
  const procurementCompleteLines = procurementDraftLines.filter((line) => ["complete", "excess"].includes(line.status)).length;
  const procurementRemainingTotal = procurementDraftLines.reduce((sum, line) => sum + line.remainingQty, 0);
  const procurementExcessTotal = procurementDraftLines.reduce((sum, line) => sum + line.excessQty, 0);
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
  const showComponentChecklist = ["procurement_purchase", "warehouse_receive_components", "order_adjustment_return"].includes(task.type);
  const assemblyTargetQty = Number(task.payload?.planned_qty || task.payload?.product_context?.qty || 0);
  const assemblyIssuedQty = Number(task.payload?.issued_qty ?? (task.payload?.materials_complete ? assemblyTargetQty : task.payload?.started_qty || 0));
  const assemblyIssuedBlockers = task.payload?.issued_details?.blockers || [];
  const assemblyPlannedTotal = assemblyAssignments.reduce((sum, item) => sum + Number(item.planned_qty || 0), 0);
  const assemblyProducedTotal = assemblyAssignments.reduce((sum, item) => sum + Number(item.produced_qty || 0), 0);
  const assemblySelectableLimit = Math.max(
    transferredAssemblySerialNumbers.length,
    Math.min(taskSerialNumbers.length, Math.max(0, Math.floor(assemblyIssuedQty))),
  );
  const assemblySelectionCapacity = Math.max(assemblySelectableLimit - selectedAssemblySerialNumbers.length, 0);
  const freeAssemblySerialNumbers = taskSerialNumbers.filter((serialNumber) => (
    !selectedAssemblySerialNumbers.includes(serialNumber) && !assemblyClaims[serialNumber]
  ));
  const myAssemblySerialNumbers = taskSerialNumbers.filter((serialNumber) => (
    !selectedAssemblySerialNumbers.includes(serialNumber)
    && Number(assemblyClaims[serialNumber]) === Number(user?.id)
  ));
  const otherAssemblySerialNumbers = taskSerialNumbers.filter((serialNumber) => (
    !selectedAssemblySerialNumbers.includes(serialNumber)
    && assemblyClaims[serialNumber]
    && Number(assemblyClaims[serialNumber]) !== Number(user?.id)
  ));
  const assemblyColleagueSummary = Object.entries(
    assemblyClaimDetails
      .filter((claim) => Number(claim.user_id) !== Number(user?.id))
      .reduce((result, claim) => {
        result[claim.user_name] = (result[claim.user_name] || 0) + 1;
        return result;
      }, {}),
  ).map(([name, count]) => `${name} — ${count}`).join(", ");
  const unassembledAssemblySerialNumbers = myAssemblySerialNumbers;
  const visibleUnassembledAssemblySerialNumbers = visibleAssemblySerialNumbers.filter((serialNumber) => !selectedAssemblySerialNumbers.includes(serialNumber));
  const newAssemblySerialCount = selectedAssemblySerialNumbers.filter((serialNumber) => !transferredAssemblySerialSet.has(serialNumber)).length;
  const unsavedAssemblySerialCount = selectedAssemblySerialNumbers.filter((serialNumber) => (
    !transferredAssemblySerialSet.has(serialNumber)
    && ["planned", "in_assembly"].includes(taskSerialNumberStatuses[serialNumber])
  )).length;
  const assemblyTransferRemaining = selectedAssemblySerialNumbers.filter((serialNumber) => !transferredAssemblySerialSet.has(serialNumber)).length;
  const assemblyCompletedSerialCount = selectedAssemblySerialNumbers.length;
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
  const canSetDeadline = userHasRole(user, ["admin", "manager"]) && task.status !== "done";
  const canEditTask = task.status === "in_progress";
  const canCompleteStatus = task.status === "in_progress";
  const canComplete = canCompleteStatus && (
    canManageTasks(user)
    || task.assigned_user_id === user?.id
    || assignedAssemblyToMe
    || (task.type === "tester_check" && userHasRole(user, ["tester"]))
    || (task.type === "assembler_build" && userHasRole(user, ["assembler"]))
  );
  const hasOpenMaterialFlow = openMaterialFlow.length > 0;
  const hasAssemblyExtraComponents = task.type === "assembler_build" && (completionPayload.extra_components || []).some((item) => item.component_id && Number(item.qty || 0) > 0 && String(item.reason || "").trim());
  const blocksAssemblyTransfer = task.type === "assembler_build" && hasOpenMaterialFlow;
  const hasRepairExtraComponents = task.type === "repair_defects" && (completionPayload.extra_components || []).some((item) => item.component_id && Number(item.qty || 0) > 0 && String(item.reason || "").trim());
  const hasIncompleteRepairComponents = task.type === "repair_defects" && (completionPayload.extra_components || []).some((item) => (
    !item.component_id || Number(item.qty || 0) <= 0 || !String(item.reason || "").trim()
  ));
  const blocksRepairCompletion = task.type === "repair_defects" && hasOpenMaterialFlow;
  const blocksRepairResultCompletion = task.type === "repair_defects"
    && serialRepairResults.length > 0
    && completedSerialRepairResults.length !== serialRepairResults.length;
  const blocksTestingCompletion = task.type === "tester_check"
    && serialTestResults.length > 0
    && reviewedSerialTestResults.length === 0;
  const taskUx = TASK_UX_CONFIG[task.type] || {
    area: "Рабочая задача",
    purpose: task.description || "Выполнить назначенную работу и зафиксировать результат",
    steps: ["Проверить исходные данные", "Выполнить назначенную работу", "Зафиксировать результат"],
    action: "Завершить задачу",
    accent: "slate",
  };
  const accentClasses = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };
  const actionLabel = loading
    ? "Сохранение..."
    : task.type === "repair_defects" && hasIncompleteRepairComponents
      ? "Заполните позиции компонентов"
    : task.type === "repair_defects" && blocksRepairResultCompletion
      ? `Описано ${completedSerialRepairResults.length} из ${serialRepairResults.length}`
    : task.type === "tester_check" && blocksTestingCompletion
      ? "Проверьте хотя бы одно устройство"
    : task.type === "tester_check" && serialTestResults.length > 0
      ? `Передать проверенные · ${reviewedSerialTestResults.length}`
    : task.type === "packer_pack"
      ? `Передать на склад · ${packingSelectedCount}`
    : task.type === "procurement_purchase"
      ? "Передать на оплату"
      : task.type === "repair_defects" && hasRepairExtraComponents
        ? "Создать заявку на компоненты"
        : task.type === "repair_defects"
          ? "Завершить ремонт"
        : task.type === "assembler_build" && hasOpenMaterialFlow
            ? "Ожидает допкомпоненты"
          : task.type === "assembler_build"
            ? `Передать на тестирование${assemblyTransferRemaining > 0 ? ` ${assemblyTransferRemaining} шт.` : ""}`
          : taskUx.action;
  const togglePackingSerial = (serialNumber) => {
    setCompletionPayload((current) => {
      const selected = new Set(current.packed_serial_numbers || []);
      if (selected.has(serialNumber)) selected.delete(serialNumber);
      else selected.add(serialNumber);
      const packedSerialNumbers = pendingPackingSerialNumbers.filter((item) => selected.has(item));
      return {
        ...current,
        packed_serial_numbers: packedSerialNumbers,
        packed_qty: String(packedSerialNumbers.length),
      };
    });
  };
  const updateTestingClaims = async (serialNumbers, action = "claim") => {
    if (!serialNumbers.length) return;
    if (reviewedSerialTestResults.length > 0) {
      setError("Сначала передайте уже проверенные устройства, затем изменяйте свою очередь");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/tasks/${task.id}/testing-claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial_numbers: serialNumbers, action }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось закрепить устройства");
      await load();
      return;
    }
    const data = await res.json();
    setTask(data);
    setCompletionPayload(defaultCompletionPayload(data));
    const claimedByMe = (data.payload?.pending_serial_numbers || []).filter((serialNumber) => (
      Number(data.payload?.testing_claims?.[serialNumber]) === Number(user?.id)
    ));
    setActiveTestSerial(claimedByMe[0] || "");
  };
  const updateAssemblyClaims = async (serialNumbers, action = "claim") => {
    if (!serialNumbers.length) return;
    if (unsavedAssemblySerialCount > 0) {
      setError("Сначала сохраните или передайте уже собранные устройства, затем изменяйте свою очередь");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/tasks/${task.id}/assembly-claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial_numbers: serialNumbers, action }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось закрепить устройства");
      await load();
      return;
    }
    const data = await res.json();
    setTask(data);
    setCompletionPayload(defaultCompletionPayload(data));
    setSuccessMessage(
      action === "claim"
        ? `${serialNumbers.length === 1 ? "Устройство закреплено" : `Закреплено устройств: ${serialNumbers.length}`}. Текущий список сохранён.`
        : `${serialNumbers.length === 1 ? "Устройство освобождено" : `Освобождено устройств: ${serialNumbers.length}`}.`,
    );
  };
  const selectPackingSerials = (serialNumbers) => {
    const requested = new Set(serialNumbers);
    const packedSerialNumbers = pendingPackingSerialNumbers.filter((item) => requested.has(item));
    setCompletionPayload((current) => ({
      ...current,
      packed_serial_numbers: packedSerialNumbers,
      packed_qty: String(packedSerialNumbers.length),
    }));
  };
  const setAssemblySerialSelection = (serialNumbers) => {
    const requested = new Set(serialNumbers);
    const availableNewSerials = taskSerialNumbers
      .filter((item) => !transferredAssemblySerialSet.has(item) && requested.has(item))
      .slice(0, Math.max(assemblySelectableLimit - transferredAssemblySerialNumbers.length, 0));
    const selected = new Set([...transferredAssemblySerialNumbers, ...availableNewSerials]);
    const assembledSerialNumbers = taskSerialNumbers.filter((item) => selected.has(item));
    setCompletionPayload((current) => {
      return {
        ...current,
        assembled_serial_numbers: assembledSerialNumbers,
        assembled_qty: assembledSerialNumbers.length,
        assembly_assignments: (current.assembly_assignments || []).map((assignment, index) => (
          index === 0 ? { ...assignment, produced_qty: assembledSerialNumbers.length } : assignment
        )),
        daily_entries: (current.daily_entries || []).map((entry) => ({ ...entry, qty: "" })),
      };
    });
  };
  const toggleAssemblySerial = (serialNumber) => {
    if (transferredAssemblySerialSet.has(serialNumber)) return;
    const selected = new Set(selectedAssemblySerialNumbers);
    if (selected.has(serialNumber)) {
      selected.delete(serialNumber);
    } else {
      if (assemblySelectionCapacity <= 0) {
        setError(`По выданным комплектам можно отметить не более ${assemblySelectableLimit} шт.`);
        return;
      }
      selected.add(serialNumber);
    }
    setError("");
    setAssemblySerialSelection([...selected]);
  };
  const selectAssemblySerials = (serialNumbers) => {
    if (assemblySelectionCapacity <= 0) {
      setError(`По выданным комплектам можно отметить не более ${assemblySelectableLimit} шт.`);
      return;
    }
    setError("");
    setAssemblySerialSelection([
      ...selectedAssemblySerialNumbers,
      ...serialNumbers.slice(0, assemblySelectionCapacity),
    ]);
  };

  return (
    <div className="task-fullscreen-shell min-h-[calc(100dvh-72px)] bg-white">
      <div className="flex min-h-[calc(100dvh-72px)] w-full flex-col bg-white">
        <div className="task-detail-header shrink-0 border-b border-slate-100 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.09),transparent_42%)] p-5 sm:px-8 sm:py-6">
          <div className="flex justify-between gap-5">
            <div className="max-w-5xl">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-slate-400">
                <span className={`h-2 w-2 rounded-full ${task.status === "done" ? "bg-emerald-500" : task.status === "hold" ? "bg-amber-500" : task.status === "cancelled" ? "bg-rose-500" : "bg-blue-500"}`} />
                <span>{taskUx.area}</span>
                <span>·</span>
                <span>Задача #{task.id}</span>
                {task.order_id && <><span>·</span><span>Заказ #{task.order_id}</span></>}
                <span>·</span>
                <span>{taskDisplayStatus(task)}</span>
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{task.title}</h2>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">{taskUx.purpose}</p>
            </div>
            <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl leading-none text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">×</button>
          </div>
        </div>

        <div className="task-detail-body w-full max-w-none flex-1 space-y-6 p-5 sm:p-8">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}
          {successMessage && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{successMessage}</div>}
          <section className="grid grid-flow-dense grid-cols-1 gap-3 md:grid-cols-3">
            {taskUx.steps.map((step, index) => (
              <div key={step} className="group rounded-2xl border border-slate-200 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${accentClasses[taskUx.accent]}`}>{index + 1}</span>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{index === 0 ? "Проверить" : index === taskUx.steps.length - 1 ? "Результат" : "Выполнить"}</div>
                    <p className="mt-1 text-sm font-bold leading-5 text-slate-800">{step}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
          {task.description && task.description !== taskUx.purpose && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-black text-slate-500">Уточнение к задаче</div>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">{task.description}</p>
            </section>
          )}
          {task.type === "assembly_planning" && (
            <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
              <div className="border-b border-blue-100 bg-blue-50/60 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {task.payload?.product_context?.product_name || "Изделие"}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {[task.payload?.product_context?.drawing_number, task.payload?.planned_at && `Распределено ${formatYekaterinburgDateTime(task.payload.planned_at)}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="w-fit rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                    Распределение завершено
                  </span>
                </div>
                <div className="mt-4 grid grid-flow-dense grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    ["План", `${planningTotal || planningAllocatedTotal} шт.`],
                    ["Распределено", `${planningAllocatedTotal} шт.`],
                    ["Сборщики", planningAllocations.length],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-blue-100 bg-white px-3 py-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-blue-400">{label}</div>
                      <div className="mt-1 text-xl font-black text-blue-800">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-black text-slate-900">Назначенные партии</h4>
                  <span className="text-xs font-bold text-slate-400">Выпущено {planningProducedTotal} из {planningAllocatedTotal} шт.</span>
                </div>
                <div className="space-y-2">
                  {planningAllocations.map((allocation, index) => {
                    const statusClass = allocation.status === "done"
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : allocation.status === "in_progress"
                        ? "border-blue-100 bg-blue-50 text-blue-700"
                        : "border-amber-100 bg-amber-50 text-amber-700";
                    return (
                      <div key={allocation.task_id} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_110px_130px] sm:items-center">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">{index + 1}</span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-900">
                              {allocation.assigned_user?.full_name || allocation.assigned_user?.username || "Сборщик не указан"}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-400">
                              Задача #{allocation.task_id}
                              {allocation.due_date ? ` · срок ${new Date(allocation.due_date).toLocaleDateString("ru-RU")}` : " · без срока"}
                              {allocation.serial_numbers?.length ? ` · ${allocation.serial_numbers.length} зав. номеров` : ""}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Партия</div>
                          <div className="mt-1 text-sm font-black text-slate-800">{allocation.planned_qty} шт.</div>
                        </div>
                        <span className={`w-fit rounded-xl border px-3 py-2 text-xs font-black ${statusClass}`}>
                          {TASK_STATUS_LABELS[allocation.status] || allocation.status}
                        </span>
                      </div>
                    );
                  })}
                  {planningAllocations.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400">
                      Дочерние задачи распределения не найдены
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
          {task.payload?.batch_summary && (
            <section className={`grid grid-cols-2 gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 ${task.type === "packer_pack" ? "" : "md:grid-cols-4"}`}>
              {(task.type === "packer_pack"
                ? [
                    ["Партия", `${task.payload.batch_summary.current_batch_qty} шт.`],
                    ["Всего изделий в очереди", `${task.payload.batch_summary.pending_qty} шт.`],
                  ]
                : [
                    ["Текущая партия", task.payload.batch_summary.current_batch_id ? `#${task.payload.batch_summary.current_batch_id}` : "—"],
                    ["В этой поставке", `${task.payload.batch_summary.current_batch_qty} шт.`],
                    ["Всего в очереди", `${task.payload.batch_summary.pending_qty} шт.`],
                    ["Партий ожидает", task.payload.batch_summary.batches_waiting],
                  ]).map(([label, value]) => (
                <div key={label}>
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-400">{label}</div>
                  <div className="mt-1 text-lg font-black text-blue-800">{value}</div>
                </div>
              ))}
            </section>
          )}

          {canSetDeadline && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3">
                <h3 className="text-sm font-black text-slate-900">Дедлайн задачи</h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Менеджер или администратор может установить срок на любом этапе работы.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_auto] lg:items-end">
                <label>
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Дата и время</span>
                  <input
                    type="datetime-local"
                    value={deadlineValue}
                    onChange={(event) => setDeadlineValue(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Причина изменения</span>
                  <input
                    value={deadlineReason}
                    onChange={(event) => setDeadlineReason(event.target.value)}
                    placeholder={task.due_date ? "Например: согласован новый срок" : "Например: срок согласован с производством"}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveDeadline}
                  disabled={deadlineSaving || !deadlineReason.trim()}
                  className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {deadlineSaving ? "Сохраняем..." : "Сохранить срок"}
                </button>
              </div>
            </section>
          )}

          {(canTake || canManageTasks(user)) && !["done", "waiting_delivery", "ready_to_issue"].includes(task.status) && (
            <section className="grid grid-cols-1 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_260px]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3F8CFF] text-xs font-black text-white shadow-sm">
                  {task.assigned_user ? personInitials(task.assigned_user) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H2v-2a4 4 0 014-4h3m4 6v-2a4 4 0 00-8 0v2m11-13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{task.assigned_user ? assigneeName(task) : "Исполнитель не назначен"}</h3>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">{ROLE_LABELS[task.role] || task.role}</p>
                </div>
              </div>
              {canManageTasks(user) ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAssigneeOpen((current) => !current)}
                    className={`flex min-h-11 w-full items-center justify-between rounded-xl border bg-slate-50 px-3 text-left text-sm font-bold text-slate-700 outline-none transition hover:border-slate-300 ${assigneeOpen ? "border-blue-400 bg-white ring-4 ring-blue-500/10" : "border-slate-200"}`}
                  >
                    <span className="truncate">{task.assigned_user ? assigneeName(task) : "Выбрать исполнителя"}</span>
                    <svg className={`ml-3 h-4 w-4 shrink-0 text-slate-400 transition-transform ${assigneeOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {assigneeOpen && (
                    <div className="absolute right-0 top-full z-40 mt-2 max-h-64 w-full min-w-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                      <button
                        type="button"
                        onClick={async () => { setAssigneeOpen(false); await assignTask(""); }}
                        className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-bold transition hover:bg-slate-50 ${!task.assigned_user_id ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
                      >
                        Не назначен
                      </button>
                      {users.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={async () => { setAssigneeOpen(false); await assignTask(item.id); }}
                          className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 ${Number(task.assigned_user_id) === Number(item.id) ? "bg-blue-50" : ""}`}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3F8CFF] text-xs font-black text-white shadow-sm">{personInitials(item)}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-800">{item.full_name || item.username}</span>
                            <span className="block text-[10px] font-semibold text-slate-400">{ROLE_LABELS[item.role] || item.role}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={takeTask} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700">
                  Взять в работу
                </button>
              )}
            </section>
          )}

          <fieldset disabled={!canEditTask} className={`task-workspace space-y-6 ${!canEditTask && task.status !== "done" ? "opacity-60" : ""}`}>
          {task.type === "procurement_purchase" && purchases.length > 0 && (
            <section className="bg-white border border-slate-100 rounded-2xl p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Закупки по задаче</h3>
                {invoiceAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {invoiceAttachments.map((file, index) => (
                      <AuthenticatedFileLink
                        key={file.id || file.storage_path || file.path || file.url || `${file.original_name}-${index}`}
                        file={file}
                        className="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                      >
                        Счёт: {file.original_name || `файл ${index + 1}`}
                      </AuthenticatedFileLink>
                    ))}
                  </div>
                )}
              </div>
			                  <div className="space-y-2">
                {purchases.map((purchase) => {
                  return (
                  <div key={purchase.id} className="grid grid-cols-1 gap-3 border-b border-slate-100 pb-3 text-xs last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_90px_90px_120px]">
	                    <div className="min-w-0">
	                      <div className="font-bold text-slate-700 break-words">{componentTitle(purchase)}</div>
	                      <div className="text-[11px] font-semibold text-slate-400 mt-1">{lineProductLabel(purchase)}</div>
	                      <div className="text-slate-400 mt-1 break-words">{[purchase.supplier, purchase.invoice, purchase.expected_date].filter(Boolean).join(" · ") || "Без реквизитов"}</div>
                    </div>
                    <div className="font-black text-slate-900">Заказано {purchase.qty}</div>
                    <div className="font-black text-emerald-700">Принято {purchase.received_qty || 0}</div>
                    <div className="text-slate-400 break-words">{purchase.payment_ref ? `Оплачено: ${purchase.payment_ref}` : purchase.comment || "—"}</div>
                  </div>
                );})}
              </div>
            </section>
          )}

          {["warehouse_issue_materials", "assembler_receive_materials", "repair_issue_materials", "repair_receive_materials"].includes(task.type) && transferMaterials.length > 0 && (
            <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {task.type === "assembler_receive_materials" ? "Список на получение" : "Список на выдачу"}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-blue-600">Заказ №{task.order_id} · {transferMaterials.length} поз. · {transferQtyTotal} шт.</p>
                  {materialTransfer && (
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Передача №{materialTransfer.id} · Получатель: {ROLE_LABELS[materialTransfer.recipient_role] || materialTransfer.recipient_role} · Статус: {{
                        reserved: "Зарезервировано",
                        issued: "Выдано складом",
                        accepted: "Получено",
                      }[materialTransfer.status] || materialTransfer.status}
                    </p>
                  )}
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
                      <th className="px-3 py-2.5 text-right font-black">Запрошено</th>
                      <th className="px-3 py-2.5 text-right font-black">Выдано</th>
                      <th className="px-3 py-2.5 text-right font-black">Получено</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferMaterials.map((material, index) => {
                      const transferLine = transferLineFor(material);
                      return (
                      <tr key={`${material.component_id}-${index}`} className="border-t border-blue-50 text-slate-700">
                        <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                        <td className="px-3 py-3 font-semibold text-slate-500">{lineProductLabel(material)}</td>
                        <td className="px-3 py-3 font-semibold">{material.component_name || `Компонент ID ${material.component_id}`}</td>
                        <td className="px-3 py-3 font-mono text-slate-500">{material.part_number || "—"}</td>
                        <td className="px-3 py-3 text-right font-black">{transferLine?.requested_qty ?? material.requested_qty ?? material.qty ?? 0}</td>
                        <td className="px-3 py-3 text-right font-black text-blue-700">{transferLine?.issued_qty ?? 0}</td>
                        <td className="px-3 py-3 text-right font-black text-emerald-700">{transferLine?.accepted_qty ?? 0}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {["warehouse_receive_components", "order_adjustment_return"].includes(task.type) && orderedItems.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{task.type === "order_adjustment_return" ? "Возврат лишних комплектующих" : "Приемка поставки"}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {task.type === "order_adjustment_return"
                      ? "Примите обратно только фактически возвращённые неиспользованные комплектующие."
                      : "Проверьте фактическое поступление и приложите закрывающие документы."}
                  </p>
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
                    <AuthenticatedFileLink file={task.payload.invoice_attachment} className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-emerald-700 hover:bg-emerald-50">
                      Счет: {task.payload.invoice_attachment.original_name}
                    </AuthenticatedFileLink>
                  )}
                  {task.payload?.payment?.payment_order_attachment && (
                    <AuthenticatedFileLink file={task.payload.payment.payment_order_attachment} className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-emerald-700 hover:bg-emerald-50">
                      Платежное поручение: {task.payload.payment.payment_order_attachment.original_name}
                    </AuthenticatedFileLink>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {orderedItems.map((item, itemIndex) => {
                      const lineKey = item.line_uid || item.component_id;
                      const orderedQty = Number(item.shortage_qty || item.qty || 0);
                      const receivedQty = Number(receivedByLine[lineKey] || 0);
                      const remainingLine = shortages.find((line) => item.line_uid ? line.line_uid === item.line_uid : line.component_id === item.component_id);
                      const remainingQty = Number(remainingLine?.shortage_qty || remainingLine?.qty || Math.max(orderedQty - receivedQty, 0));
                      const receivingLine = (completionPayload.items || []).find((line) => item.line_uid ? line.line_uid === item.line_uid : line.component_id === item.component_id);
                      return (
                        <div key={item.line_uid || `${item.component_id}-${itemIndex}`} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_auto_220px] md:items-center">
                          <div className="min-w-0">
                            <div className="font-black text-slate-900">{componentTitle(item)}</div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-400">{lineProductLabel(item)}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-center text-xs md:min-w-56">
                            <div><div className="font-black text-slate-900">{orderedQty}</div><div className="mt-0.5 font-semibold text-slate-400">заказано</div></div>
                            <div><div className="font-black text-emerald-700">{receivedQty}</div><div className="mt-0.5 font-semibold text-slate-400">принято</div></div>
                            <div><div className="font-black text-amber-700">{remainingQty}</div><div className="mt-0.5 font-semibold text-slate-400">осталось</div></div>
                          </div>
                          {task.status !== "done" && (
                            remainingQty > 0 && receivingLine ? (
                              <label className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                                <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-blue-600">Принять сейчас</span>
                                <div className="flex gap-2">
                                  <div className="relative min-w-0 flex-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max={remainingQty}
                                      value={receivingLine.qty || ""}
                                      onChange={(e) => changeLineQty(item.component_id, e.target.value, item.line_uid)}
                                      className="min-h-11 w-full rounded-xl border border-blue-200 bg-white px-3 pr-10 text-right text-base font-black text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">шт.</span>
                                  </div>
                                  <button type="button" onClick={() => changeLineQty(item.component_id, String(remainingQty), item.line_uid)} className="rounded-xl border border-blue-200 bg-white px-3 text-xs font-black text-blue-700 hover:bg-blue-100">Всё</button>
                                </div>
                              </label>
                            ) : <div className="text-center text-xs font-semibold text-emerald-600">Принято полностью</div>
                          )}
                        </div>
                      );
                    })}
              </div>
              {receiptHistory.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {receiptHistory.map((entry, index) => (
                    <p key={`${entry.received_at}-${index}`} className="text-xs font-semibold text-emerald-700">
                      Приёмка {index + 1}: {(entry.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0)} шт.
                      {entry.received_at ? ` · ${formatYekaterinburgDateTime(entry.received_at)}` : ""}
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

          {shortages.length > 0 && !["warehouse_receive_components", "order_adjustment_return"].includes(task.type) && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {task.type === "procurement_purchase" ? "Закупка комплектующих" : showComponentChecklist ? "Чеклист комплектующих" : "Дефицит комплектующих"}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-red-600">{shortages.length} поз. · требуется {shortageQtyTotal} шт.</p>
                </div>
                {task.type === "procurement_purchase" && (
                  <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                    <div className="rounded-xl border border-red-100 bg-white px-3 py-2">
                      <div className="font-black text-red-700">{shortageQtyTotal || 0}</div>
                      <div className="font-semibold text-slate-400">дефицит</div>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-white px-3 py-2">
                      <div className="font-black text-blue-700">{deliveryQtyTotal || 0}</div>
                      <div className="font-semibold text-slate-400">в счет</div>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-white px-3 py-2">
                      <div className="font-black text-amber-700">{procurementRemainingTotal || 0}</div>
                      <div className="font-semibold text-slate-400">останется</div>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                      <div className="font-black text-emerald-700">{procurementCompleteLines}/{shortages.length}</div>
                      <div className="font-semibold text-slate-400">закрыто позиций</div>
                    </div>
                  </div>
                )}
              </div>
              {task.type === "procurement_purchase" && (
                <div className="mb-4 rounded-2xl border border-red-100 bg-white p-4">
                  <p className="mb-2 text-xs font-black text-slate-700">Счет поставщика</p>
                  <p className="mb-3 text-xs font-semibold text-slate-500">
                    Укажите фактическое количество из счёта. Можно закупить меньше потребности частичной партией или больше — например, из-за минимального заказа поставщика.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <PayloadField label="Номер счёта" name="invoice" value={completionPayload.invoice} onChange={changePayload} />
                    <PayloadField label="Поставщик" name="supplier" value={completionPayload.supplier} onChange={changePayload} />
                    <label className="block min-w-0">
                      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Ожидаемая дата</span>
                      <CalendarField
                        value={completionPayload.expected_date}
                        onChange={(value) => changePayload("expected_date", value)}
                        minDate={new Date().toLocaleDateString("en-CA")}
                        className="min-w-0"
                      />
                    </label>
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
                      <PayloadField label="Комментарий к закупке" name="comment" value={completionPayload.comment} onChange={changePayload} />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] font-bold">
                    <span className="rounded-xl bg-blue-50 px-3 py-1.5 text-blue-700">Выбрано позиций: {procurementSelectedLines}</span>
                    {procurementPartialLines > 0 && <span className="rounded-xl bg-amber-50 px-3 py-1.5 text-amber-700">Частично: {procurementPartialLines}</span>}
                    {procurementExcessTotal > 0 && <span className="rounded-xl bg-violet-50 px-3 py-1.5 text-violet-700">Излишек на склад: {procurementExcessTotal} шт.</span>}
                    {!completionPayload.supplier && <span className="rounded-xl bg-rose-50 px-3 py-1.5 text-rose-700">Укажите поставщика</span>}
                    {!completionPayload.invoice && <span className="rounded-xl bg-rose-50 px-3 py-1.5 text-rose-700">Укажите номер счёта</span>}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {shortages.map((item, itemIndex) => {
                  const draftLine = procurementDraftLines[itemIndex];
                  const stateMeta = {
                    empty: { label: "Не обработано", className: "bg-slate-100 text-slate-500" },
                    partial: { label: "Частично", className: "bg-amber-50 text-amber-700" },
                    complete: { label: "Закрыто", className: "bg-emerald-50 text-emerald-700" },
                    excess: { label: "С излишком", className: "bg-violet-50 text-violet-700" },
                  }[draftLine?.status || "empty"];
                  const coveragePercent = draftLine?.requiredQty
                    ? Math.min(Math.round((draftLine.draftQty / draftLine.requiredQty) * 100), 100)
                    : 0;
                  return (
                  <div key={item.line_uid || `${item.component_id}-${itemIndex}`} className={`grid grid-cols-1 gap-4 rounded-2xl border bg-white p-4 text-xs text-slate-700 transition md:grid-cols-[minmax(0,1fr)_240px] md:items-center ${
                    draftLine?.status === "partial" ? "border-amber-200" : draftLine?.status === "excess" ? "border-violet-200" : draftLine?.status === "complete" ? "border-emerald-200" : "border-slate-200"
                  }`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="font-black break-words text-slate-900">{componentTitle(item)}</div>
                        {task.type === "procurement_purchase" && <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${stateMeta.className}`}>{stateMeta.label}</span>}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-400">{lineProductLabel(item)}</div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-semibold text-slate-500">
                        <span>Требуется: <b className="text-slate-800">{item.required_qty || item.qty || item.shortage_qty}</b></span>
                        <span>На складе: <b className="text-slate-800">{item.available_qty ?? "—"}</b></span>
                        <span>К закупке: <b className="text-rose-600">{item.shortage_qty || item.qty}</b></span>
                      </div>
                      {task.type === "procurement_purchase" && (
                        <div className="mt-3">
                          <div className="mb-1.5 flex justify-between text-[10px] font-bold text-slate-400">
                            <span>Покрытие текущим счётом</span>
                            <span>{coveragePercent}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full transition-all ${
                              draftLine?.status === "partial" ? "bg-amber-400" : draftLine?.status === "excess" ? "bg-violet-500" : "bg-emerald-500"
                            }`} style={{ width: `${coveragePercent}%` }} />
                          </div>
                        </div>
                      )}
                      {(item.expected_date || item.invoice || item.supplier) && (
                        <div className="mt-1 break-words text-slate-400">
                          {[item.expected_date && `Дата ${item.expected_date}`, item.invoice && `Счет ${item.invoice}`, item.supplier].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    {task.type === "procurement_purchase" && (
                      <div>
                        {deliveries.map((delivery, index) => (delivery.line_uid ? delivery.line_uid === item.line_uid : delivery.component_id === item.component_id) && (
                          <label key={index} className="block rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                            <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-blue-600">Закупить по этому счёту</span>
                            <div className="flex gap-2">
                              <div className="relative min-w-0 flex-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="0"
                                  value={delivery.qty || ""}
                                  onChange={(e) => changeDelivery(index, { qty: e.target.value })}
                                  className="min-h-11 w-full rounded-xl border border-blue-200 bg-white px-3 pr-10 text-right text-base font-black text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">шт.</span>
                              </div>
                              <button type="button" onClick={() => changeDelivery(index, { qty: String(item.shortage_qty || item.qty || 0) })} className="rounded-xl border border-blue-200 bg-white px-3 text-xs font-black text-blue-700 hover:bg-blue-100">Всё</button>
                            </div>
                            {Number(delivery.qty || 0) > Number(item.shortage_qty || item.qty || 0) && (
                              <span className="mt-2 block text-[11px] font-bold text-amber-700">
                                Излишек {Number(delivery.qty || 0) - Number(item.shortage_qty || item.qty || 0)} шт. будет оприходован на склад.
                              </span>
                            )}
                            {Number(delivery.qty || 0) > 0 && Number(delivery.qty || 0) < Number(item.shortage_qty || item.qty || 0) && (
                              <span className="mt-2 block text-[11px] font-bold text-amber-700">
                                После счёта останется закупить {Number(item.shortage_qty || item.qty || 0) - Number(delivery.qty || 0)} шт.
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );})}
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {task.type === "assembler_build" && (
              <div className="md:col-span-2 space-y-4">
                <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50 p-1.5">
                  {[
                    ["work", "Работа"],
                    ["components", "Комплектующие"],
                    ["documents", "Документы"],
                    ["history", "История"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAssemblyTab(id)}
                      className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-bold transition ${
                        assemblyTab === id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {label}
                      {id === "components" && openMaterialFlow.length > 0 ? ` · ${openMaterialFlow.length}` : ""}
                    </button>
                  ))}
                </div>

                <div className={`${assemblyTab === "work" ? "" : "hidden"} rounded-2xl border border-slate-100 bg-white p-4`}>
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
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["План", assemblyTargetQty || "—"],
                      ["Собрано", assemblyProducedTotal || 0],
                      ["Осталось", assemblyOrderRemaining || 0],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
                        <div className="mt-1 text-xl font-black text-slate-900">{value}</div>
                      </div>
                    ))}
                  </div>
                  {taskSerialNumbers.length > 0 && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-blue-100 bg-white">
                      <div className="border-b border-blue-100 bg-blue-50/60 p-3 sm:p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Заводские номера партии</div>
                            <div className="mt-1 text-xs font-semibold text-blue-600">
                              Собрано {assemblyCompletedSerialCount} из {taskSerialNumbers.length} устройств
                            </div>
                          </div>
                          <span className="w-fit rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-black text-blue-700">
                            {Math.round((assemblyCompletedSerialCount / taskSerialNumbers.length) * 100)}%
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${(assemblyCompletedSerialCount / taskSerialNumbers.length) * 100}%` }}
                          />
                        </div>
                        <div className="mt-3 grid grid-flow-dense grid-cols-2 gap-2 lg:grid-cols-5">
                          {[
                            ["free", "Свободные", freeAssemblySerialNumbers.length],
                            ["my", "Мои устройства", myAssemblySerialNumbers.length],
                            ["other", "У коллег", otherAssemblySerialNumbers.length],
                            ["assembled", "Собраны сейчас", newAssemblySerialCount],
                            ["transferred", "На тестировании", transferredAssemblySerialNumbers.length],
                          ].map(([filter, label, count]) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => { setAssemblySerialFilter(filter); setAssemblySerialsExpanded(false); }}
                              className={`min-w-0 rounded-xl border px-2 py-2.5 text-left transition ${
                                assemblySerialFilter === filter
                                  ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                                  : "border-blue-100 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                              }`}
                            >
                              <span className="block truncate text-[10px] font-bold">{label}</span>
                              <span className="mt-0.5 block text-lg font-black leading-none">{count}</span>
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] font-semibold text-blue-700">
                          Доступно по выданным комплектам: {assemblySelectableLimit} шт. · можно отметить ещё {assemblySelectionCapacity} шт.
                        </div>
                        {assemblySerialFilter === "free" && freeAssemblySerialNumbers.length > 0 && (
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button type="button" disabled={loading} onClick={() => updateAssemblyClaims(freeAssemblySerialNumbers.slice(0, 1))} className="min-h-10 rounded-xl bg-blue-600 px-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:bg-slate-300">
                              Взять следующее устройство
                            </button>
                            <button type="button" disabled={loading} onClick={() => updateAssemblyClaims(freeAssemblySerialNumbers)} className="min-h-10 rounded-xl border border-blue-200 bg-white px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:text-slate-300">
                              Взять все свободные
                            </button>
                          </div>
                        )}
                        {assemblySerialFilter === "other" && otherAssemblySerialNumbers.length > 0 && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                            У коллег в работе: {assemblyColleagueSummary}
                          </div>
                        )}
                        {assemblySerialFilter === "my" && (
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            <button
                              type="button"
                              onClick={() => selectAssemblySerials(unassembledAssemblySerialNumbers.slice(0, 1))}
                              disabled={assemblySelectionCapacity <= 0 || unassembledAssemblySerialNumbers.length === 0}
                              className="min-h-10 rounded-xl bg-blue-600 px-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
                            >
                              Собрано следующее
                            </button>
                            <button
                              type="button"
                              onClick={() => selectAssemblySerials(visibleUnassembledAssemblySerialNumbers)}
                              disabled={assemblySelectionCapacity <= 0 || visibleUnassembledAssemblySerialNumbers.length === 0}
                              className="min-h-10 rounded-xl border border-blue-200 bg-white px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:border-slate-200 disabled:text-slate-300"
                            >
                              Отметить показанные собранными
                            </button>
                            <button
                              type="button"
                              onClick={() => selectAssemblySerials(unassembledAssemblySerialNumbers)}
                              disabled={assemblySelectionCapacity <= 0 || unassembledAssemblySerialNumbers.length === 0}
                              className="min-h-10 rounded-xl border border-blue-200 bg-white px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:border-slate-200 disabled:text-slate-300"
                            >
                              Собран весь мой остаток
                            </button>
                            <button type="button" disabled={loading || myAssemblySerialNumbers.length === 0} onClick={() => updateAssemblyClaims(myAssemblySerialNumbers, "release")} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:text-slate-300">
                              Освободить мои устройства
                            </button>
                          </div>
                        )}
                        {assemblySerialFilter === "assembled" && newAssemblySerialCount > 0 && (
                          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-sm font-black text-emerald-900">К передаче готово {newAssemblySerialCount} шт.</div>
                              <div className="mt-1 text-[11px] font-semibold text-emerald-700">Проверьте номера ниже, сохраните отметки или передайте партию на тестирование.</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setAssemblySerialSelection(transferredAssemblySerialNumbers); setError(""); }}
                              className="min-h-10 shrink-0 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
                            >
                              Снять все новые отметки
                            </button>
                          </div>
                        )}
                        {taskSerialNumbers.length > assemblySerialPageSize && (
                          <label className="relative mt-3 block">
                            <span className="sr-only">Найти заводской номер</span>
                            <input
                              value={assemblySerialSearch}
                              onChange={(event) => setAssemblySerialSearch(event.target.value)}
                              placeholder="Найти заводской номер"
                              className="min-h-10 w-full rounded-xl border border-blue-100 bg-white px-3 pr-16 font-mono text-xs font-bold text-slate-700 outline-none transition placeholder:font-sans placeholder:font-semibold placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                              {filteredAssemblySerialNumbers.length}
                            </span>
                          </label>
                        )}
                      </div>
                      <div className="p-3 sm:p-4">
                        <div className="hidden max-h-[420px] overflow-auto rounded-xl border border-slate-200 sm:block">
                          <table className="w-full border-collapse text-left">
                            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              <tr>
                                <th className="w-16 border-b border-slate-200 px-4 py-3">№</th>
                                <th className="border-b border-slate-200 px-4 py-3">Заводской номер</th>
                                <th className="w-44 border-b border-slate-200 px-4 py-3">Состояние</th>
                                <th className="w-64 border-b border-slate-200 px-4 py-3 text-right">Действие</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {visibleAssemblySerialNumbers.map((serialNumber) => {
                                const serialIndex = taskSerialNumbers.indexOf(serialNumber);
                                const transferred = transferredAssemblySerialSet.has(serialNumber);
                                const assembled = selectedAssemblySerialNumbers.includes(serialNumber);
                                const claimOwnerId = assemblyClaims[serialNumber];
                                const claimedByMe = Number(claimOwnerId) === Number(user?.id);
                                const claimedByOther = claimOwnerId && !claimedByMe;
                                const claimOwnerName = assemblyClaimDetails.find((claim) => claim.serial_number === serialNumber)?.user_name;
                                return (
                                  <tr key={serialNumber} className={`transition-colors ${transferred ? "bg-emerald-50/50" : assembled ? "bg-blue-50/60" : "bg-white hover:bg-slate-50"}`}>
                                    <td className="px-4 py-3 text-xs font-black text-slate-400">{serialIndex + 1}</td>
                                    <td className="px-4 py-3">
                                      <span className="font-mono text-sm font-black text-slate-900">{serialNumber}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black ${
                                        transferred
                                          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                                          : assembled
                                            ? "border-blue-200 bg-blue-100 text-blue-800"
                                            : "border-slate-200 bg-slate-100 text-slate-600"
                                      }`}>
                                        {transferred ? "На тестировании" : assembled ? "Собрано сейчас" : claimedByMe ? "У меня в сборке" : claimedByOther ? `У ${claimOwnerName || "коллеги"}` : "Свободно"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      {claimedByMe && !assembled && !transferred ? (
                                        <div className="flex justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() => toggleAssemblySerial(serialNumber)}
                                            className="min-h-9 rounded-lg border border-blue-200 bg-white px-3 text-xs font-black text-blue-700 transition hover:bg-blue-600 hover:text-white"
                                          >
                                            Отметить собранным
                                          </button>
                                          <button
                                            type="button"
                                            disabled={loading}
                                            onClick={() => updateAssemblyClaims([serialNumber], "release")}
                                            className="min-h-9 rounded-lg border border-rose-200 bg-white px-3 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:text-slate-300"
                                          >
                                            Убрать
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={transferred || claimedByOther}
                                          onClick={() => assembled ? toggleAssemblySerial(serialNumber) : updateAssemblyClaims([serialNumber])}
                                          className={`min-h-9 rounded-lg border px-3 text-xs font-black transition ${
                                            transferred
                                              ? "cursor-default border-emerald-100 bg-transparent text-emerald-600"
                                              : claimedByOther
                                                ? "cursor-default border-slate-100 bg-slate-50 text-slate-400"
                                              : assembled
                                                ? "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                                : "border-blue-200 bg-white text-blue-700 hover:bg-blue-600 hover:text-white"
                                          }`}
                                        >
                                          {transferred ? "Зафиксировано" : claimedByOther ? "У коллеги" : assembled ? "Снять отметку" : "Взять устройство"}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="space-y-2 sm:hidden">
                          {visibleAssemblySerialNumbers.map((serialNumber) => {
                            const serialIndex = taskSerialNumbers.indexOf(serialNumber);
                            const transferred = transferredAssemblySerialSet.has(serialNumber);
                            const assembled = selectedAssemblySerialNumbers.includes(serialNumber);
                            const claimOwnerId = assemblyClaims[serialNumber];
                            const claimedByMe = Number(claimOwnerId) === Number(user?.id);
                            const claimedByOther = claimOwnerId && !claimedByMe;
                            return (
                              <div
                                key={serialNumber}
                                className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                                  transferred
                                    ? "border-emerald-100 bg-emerald-50/70"
                                    : assembled
                                      ? "border-blue-200 bg-blue-50"
                                      : "border-slate-100 bg-slate-50/70 hover:border-blue-200 hover:bg-blue-50/50"
                                }`}
                              >
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black transition ${
                                  transferred
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : assembled
                                      ? "border-blue-500 bg-blue-500 text-white"
                                      : "border-slate-200 bg-white text-slate-400"
                                }`}>
                                  {assembled ? "✓" : serialIndex + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-mono text-xs font-black text-slate-800" title={serialNumber}>{serialNumber}</div>
                                  <div className={`mt-0.5 text-[10px] font-bold ${transferred ? "text-emerald-700" : assembled ? "text-blue-700" : "text-slate-400"}`}>
                                    {transferred ? "На тестировании" : assembled ? "Собрано сейчас" : claimedByMe ? "У меня в сборке" : claimedByOther ? "У коллеги" : "Свободно"}
                                  </div>
                                </div>
                                {claimedByMe && !assembled && !transferred ? (
                                  <div className="flex shrink-0 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleAssemblySerial(serialNumber)}
                                      className="min-h-9 rounded-lg border border-blue-200 bg-white px-2.5 text-[10px] font-black text-blue-700"
                                    >
                                      Собрано
                                    </button>
                                    <button
                                      type="button"
                                      disabled={loading}
                                      onClick={() => updateAssemblyClaims([serialNumber], "release")}
                                      className="min-h-9 rounded-lg border border-rose-200 bg-white px-2.5 text-[10px] font-black text-rose-700"
                                    >
                                      Убрать
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={transferred || claimedByOther}
                                    onClick={() => assembled ? toggleAssemblySerial(serialNumber) : updateAssemblyClaims([serialNumber])}
                                    className={`min-h-9 shrink-0 rounded-lg border px-3 text-[10px] font-black ${
                                      transferred
                                        ? "border-emerald-100 text-emerald-600"
                                        : assembled
                                          ? "border-slate-200 bg-white text-slate-600"
                                          : "border-blue-200 bg-white text-blue-700"
                                    }`}
                                  >
                                    {transferred ? "Готово" : claimedByOther ? "Занято" : assembled ? "Снять" : "Взять"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {visibleAssemblySerialNumbers.length === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400">
                            {assemblySerialSearch.trim()
                              ? "Заводской номер не найден в этой очереди"
                              : assemblySerialFilter === "free"
                                ? "Свободных устройств сейчас нет"
                                : assemblySerialFilter === "my"
                                  ? "В вашей очереди пока нет устройств"
                                  : assemblySerialFilter === "other"
                                    ? "У коллег сейчас нет устройств"
                                : assemblySerialFilter === "assembled"
                                  ? "Новых собранных устройств пока нет"
                                  : "Устройства ещё не передавались на тестирование"}
                          </div>
                        )}
                        {!assemblySerialSearch.trim() && filteredAssemblySerialNumbers.length > assemblySerialPageSize && (
                          <button
                            type="button"
                            onClick={() => setAssemblySerialsExpanded((current) => !current)}
                            className="mt-3 min-h-10 w-full rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            {assemblySerialsExpanded
                              ? "Свернуть список"
                              : `Показать все · ещё ${filteredAssemblySerialNumbers.length - assemblySerialPageSize}`}
                          </button>
                        )}
                        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs font-semibold text-slate-400">
                            {newAssemblySerialCount > 0
                              ? `Текущая партия: ${newAssemblySerialCount} шт. Переданные ранее устройства изменить нельзя.`
                              : "Отметьте собранные устройства — они появятся в очереди «Собраны сейчас»."}
                          </span>
                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => complete(true)}
                              disabled={loading || !canComplete || newAssemblySerialCount <= 0}
                              className="min-h-10 rounded-xl border border-blue-200 bg-white px-4 text-xs font-black text-blue-700 transition hover:bg-blue-50 disabled:border-slate-200 disabled:text-slate-300"
                            >
                              Сохранить отметки
                            </button>
                            <button
                              type="button"
                              onClick={() => complete()}
                              disabled={loading || !canComplete || blocksAssemblyTransfer || newAssemblySerialCount <= 0}
                              className="min-h-10 rounded-xl bg-blue-600 px-4 text-xs font-black text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                            >
                              Передать на тест · {newAssemblySerialCount}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                <div className={`${assemblyTab === "work" && canManageTasks(user) && !task.payload?.parent_planning_task_id ? "" : "hidden"} rounded-2xl border border-slate-100 bg-white p-4`}>
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
                <div className={`${assemblyTab === "work" && taskSerialNumbers.length === 0 ? "" : "hidden"} rounded-2xl border border-slate-100 bg-white p-4`}>
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
                <div className={`${assemblyTab === "components" ? "" : "hidden"} rounded-2xl border border-slate-100 bg-white p-4`}>
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
	                          <div>
                                <ComponentSearchField
	                              value={item.component_query || ""}
	                              onChange={(value) => changeExtraComponent(index, { component_query: value, component_id: "" })}
	                              placeholder="Поиск по R1, названию, артикулу"
                                  matches={matches}
                                  onSelect={(component) => changeExtraComponent(index, {
                                    component_id: component.component_id,
                                    component_query: [uniqueDesignators(component.designators), component.component_name, component.part_number].filter(Boolean).join(" · "),
                                  })}
	                              className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3F8CFF]"
                                />
                              </div>
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
	                              Выбрано: {componentTitle(selected)}{selected.designators ? ` · ${uniqueDesignators(selected.designators)}` : ""}
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
		                            <div className="font-black text-slate-800">Заявка {index + 1}{request.created_at ? ` · ${formatYekaterinburgDateTime(request.created_at)}` : ""}</div>
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

                {assemblyTab === "documents" && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <h3 className="text-sm font-black text-slate-900">Документы изделия</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Чертежи и файлы, необходимые во время сборки.</p>
                    <div className="mt-4 space-y-3">
                      {productDocuments.map((product) => (
                        <div key={product.product_id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                          <div className="font-black text-slate-900">{product.product_name}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-400">
                            {[product.drawing_number, product.revision && `Рев. ${product.revision}`].filter(Boolean).join(" · ") || "Без децимального номера"}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(product.attachments || []).map((file) => (
                              <a key={file.stored_name} href={productFileUrl(file)} target="_blank" rel="noreferrer" className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50">
                                {file.original_name}
                              </a>
                            ))}
                            {(product.attachments || []).length === 0 && <span className="text-xs font-semibold text-slate-400">Файлов нет</span>}
                          </div>
                        </div>
                      ))}
                      {!productDocuments.length && (
                        <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">Документы не приложены</div>
                      )}
                    </div>
                  </div>
                )}

                {assemblyTab === "history" && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <h3 className="text-sm font-black text-slate-900">История сборки</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Все сохранённые отметки выпуска по этой задаче.</p>
                    <div className="mt-4 divide-y divide-slate-100">
                      {dailyProgress.slice().reverse().map((entry, index) => (
                        <div key={`${entry.date}-${entry.assignment_id || index}`} className="grid grid-cols-[90px_minmax(0,1fr)_auto] gap-3 py-3 text-xs first:pt-0 last:pb-0">
                          <span className="font-bold text-slate-500">{entry.date}</span>
                          <span className="min-w-0 font-semibold text-slate-600">
                            {[entry.product_name, entry.user_name, entry.transfer_from_user_name && `передано от ${entry.transfer_from_user_name}`].filter(Boolean).join(" · ")}
                            {entry.comment ? ` · ${entry.comment}` : ""}
                          </span>
                          <span className="font-black text-slate-900">{entry.qty} шт.</span>
                        </div>
                      ))}
                      {!dailyProgress.length && (
                        <div className="py-8 text-center text-sm font-semibold text-slate-400">Отметок выпуска пока нет</div>
                      )}
                    </div>
                  </div>
                )}
	              </div>
            )}
            {task.type === "tester_check" && (
              <div className="testing-workspace md:col-span-2">
                <div className="testing-overview mb-4 overflow-hidden rounded-2xl border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_62%)] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">На проверке {testTotalQty || 0} шт.</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Накоплено из {task.payload?.batch_summary?.batches_waiting || 1} поступлений
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="min-w-24 rounded-xl border border-emerald-100 bg-white px-4 py-2">
                        <div className="text-xl font-black text-emerald-700">{testPassedTotal || 0}</div>
                        <div className="text-xs font-semibold text-slate-400">годных</div>
                      </div>
                      <div className="min-w-24 rounded-xl border border-rose-100 bg-white px-4 py-2">
                        <div className="text-xl font-black text-rose-700">{testDefectiveTotal || 0}</div>
                        <div className="text-xs font-semibold text-slate-400">брак</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bg-emerald-500 transition-all duration-300"
                      style={{ width: `${testTotalQty ? (testPassedTotal / testTotalQty) * 100 : 0}%` }}
                    />
                    <div
                      className="bg-rose-500 transition-all duration-300"
                      style={{ width: `${testTotalQty ? (testDefectiveTotal / testTotalQty) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="mb-4 grid grid-flow-dense grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1.5 sm:grid-cols-3">
                  {[
                    ["checklist", "1. Проверка", `${reviewedSerialTestResults.length}/${serialTestResults.length || testTotalQty || 0}`],
                    ["serials", "2. Обзор", taskSerialNumbers.length ? `${taskSerialNumbers.length} шт.` : `${testTotalQty || 0} шт.`],
                    ["result", "3. Результат", testDefectiveTotal ? `брак ${testDefectiveTotal}` : "без брака"],
                  ].map(([id, label, detail]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTestingStep(id)}
                      className={`group flex min-h-14 items-center justify-between gap-3 rounded-xl px-4 text-left transition ${
                        testingStep === id
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/15"
                          : "text-slate-500 hover:bg-white hover:text-blue-700"
                      }`}
                    >
                      <span className="text-sm font-black">{label}</span>
                      <span className={`text-[11px] font-bold ${testingStep === id ? "text-slate-300" : "text-slate-400"}`}>{detail}</span>
                    </button>
                  ))}
                </div>

                {testingStep === "checklist" && (
                  <div className="mb-4 space-y-3">
                    <div className="grid grid-flow-dense grid-cols-2 gap-2 lg:grid-cols-4">
                      {[
                        ["Свободные", freeSerialTestResults.length, "border-blue-100 bg-blue-50 text-blue-800"],
                        ["Мои устройства", mySerialTestResults.length, "border-blue-200 bg-blue-100/70 text-blue-900"],
                        ["У коллег", otherClaimedSerialTestResults.length, "border-slate-200 bg-slate-50 text-slate-700"],
                        ["Проверены", processedTaskSerialCount + reviewedSerialTestResults.length, "border-emerald-100 bg-emerald-50 text-emerald-800"],
                      ].map(([label, value, classes]) => (
                        <div key={label} className={`rounded-xl border px-3 py-3 ${classes}`}>
                          <div className="text-[10px] font-bold">{label}</div>
                          <div className="mt-1 text-xl font-black">{value}</div>
                        </div>
                      ))}
                    </div>

                    {freeSerialTestResults.length > 0 && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-sm font-black text-slate-900">Свободные устройства</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Закрепите номера за собой перед заполнением чек-листа.</p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" disabled={loading} onClick={() => updateTestingClaims([freeSerialTestResults[0].serial_number])} className="min-h-10 rounded-xl bg-blue-600 px-4 text-xs font-black text-white transition hover:bg-blue-700 disabled:bg-slate-300">
                              Взять следующее
                            </button>
                            <button type="button" disabled={loading} onClick={() => updateTestingClaims(freeSerialTestResults.map((result) => result.serial_number))} className="min-h-10 rounded-xl border border-blue-200 bg-white px-4 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:text-slate-300">
                              Взять все свободные
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {freeSerialTestResults.slice(0, 8).map((result) => (
                            <button key={result.serial_number} type="button" disabled={loading} onClick={() => updateTestingClaims([result.serial_number])} className="rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 font-mono text-[10px] font-black text-slate-700 transition hover:border-blue-300">
                              {result.serial_number}
                            </button>
                          ))}
                          {freeSerialTestResults.length > 8 && <span className="px-2 py-1.5 text-[10px] font-bold text-blue-600">ещё {freeSerialTestResults.length - 8}</span>}
                        </div>
                      </div>
                    )}

                    {otherClaimedSerialTestResults.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                        У коллег в работе: {testingColleagueSummary}
                      </div>
                    )}

                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    <div className="grid grid-flow-dense grid-cols-1 lg:grid-cols-12">
                      <aside className="border-b border-slate-100 bg-slate-50/70 p-3 lg:col-span-4 lg:border-r lg:border-b-0">
                        <div className="mb-3 px-1">
                          <h3 className="text-sm font-black text-slate-900">Устройства партии</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-400">Выберите номер и пройдите его чек-лист.</p>
                        </div>
                        <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                          {mySerialTestResults.map((result, index) => {
                            const hasDefect = result.reviewed && (result.checklist || []).some((item) => !item.checked);
                            const completedChecks = (result.checklist || []).filter((item) => typeof item.checked === "boolean").length;
                            const totalChecks = (result.checklist || []).length;
                            return (
                              <button
                                key={result.serial_number}
                                type="button"
                                onClick={() => setActiveTestSerial(result.serial_number)}
                                className={`group flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left transition ${
                                  activeTestSerial === result.serial_number
                                    ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/15"
                                    : "border-slate-100 bg-white text-slate-700 hover:border-blue-200"
                                }`}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-mono text-xs font-black">{result.serial_number}</span>
                                  <span className={`mt-1 block text-[10px] font-bold ${activeTestSerial === result.serial_number ? "text-slate-300" : "text-slate-400"}`}>
                                    {result.reviewed ? `Устройство ${index + 1} из ${mySerialTestResults.length}` : `Заполнено ${completedChecks} из ${totalChecks}`}
                                  </span>
                                </span>
                                <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${
                                  !result.reviewed
                                    ? "bg-blue-50 text-blue-600"
                                    : hasDefect
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}>
                                  {!result.reviewed ? (completedChecks ? "В процессе" : "Не начато") : hasDefect ? "Брак" : "Годен"}
                                </span>
                              </button>
                            );
                          })}
                          {mySerialTestResults.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-8 text-center text-xs font-semibold text-slate-400">
                              Возьмите свободное устройство
                            </div>
                          )}
                        </div>
                      </aside>

                      <div className="p-4 lg:col-span-8 lg:p-5">
                        {activeSerialTestResult ? (
                          <>
                            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-xs font-bold text-slate-400">Моё устройство · заполнено {activeTestChecklistCompleted} из {activeTestChecklistTotal}</p>
                                <h3 className="mt-1 font-mono text-xl font-black text-slate-900">{activeSerialTestResult.serial_number}</h3>
                              </div>
                              <div className="flex flex-col items-start gap-2 sm:items-end">
                                <span className={`w-fit rounded-xl px-3 py-2 text-xs font-black ${
                                  activeSerialTestResult.reviewed
                                    ? (activeSerialTestResult.checklist || []).every((item) => item.checked)
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-rose-50 text-rose-700"
                                    : activeTestChecklistReady
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-slate-100 text-slate-600"
                                }`}>
                                  {activeSerialTestResult.reviewed
                                    ? (activeSerialTestResult.checklist || []).every((item) => item.checked) ? "Годен к упаковке" : "Будет направлен в ремонт"
                                    : activeTestChecklistReady ? "Готово к фиксации" : "Проверка не завершена"}
                                </span>
                                {!activeSerialTestResult.reviewed && (
                                  <button type="button" onClick={() => passAllSerialChecks(activeSerialTestResult.serial_number)} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100">
                                    Все пункты пройдены
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${activeTestChecklistTotal ? activeTestChecklistCompleted / activeTestChecklistTotal * 100 : 0}%` }} />
                            </div>
                            <div className="grid grid-flow-dense grid-cols-1 gap-2 sm:grid-cols-2">
                              {(activeSerialTestResult.checklist || []).map((item, index) => (
                                <div key={`${activeSerialTestResult.serial_number}-${item.id || index}`} className={`rounded-xl border p-3 transition ${
                                  item.checked === true
                                    ? "border-emerald-200 bg-emerald-50"
                                    : item.checked === false
                                      ? "border-rose-200 bg-rose-50"
                                      : "border-slate-200 bg-white"
                                }`}>
                                  <div className="mb-3 flex items-start gap-2">
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${
                                      item.checked === true
                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                        : item.checked === false
                                          ? "border-rose-500 bg-rose-500 text-white"
                                          : "border-slate-200 bg-slate-50 text-slate-400"
                                    }`}>
                                      {item.checked === true ? "✓" : item.checked === false ? "×" : index + 1}
                                    </span>
                                    <span className="pt-1 text-sm font-bold text-slate-800">{item.label}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => changeSerialChecklist(activeSerialTestResult.serial_number, index, true)} className={`min-h-9 rounded-lg border text-xs font-black transition ${item.checked === true ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"}`}>
                                      Пройдено
                                    </button>
                                    <button type="button" onClick={() => changeSerialChecklist(activeSerialTestResult.serial_number, index, false)} className={`min-h-9 rounded-lg border text-xs font-black transition ${item.checked === false ? "border-rose-500 bg-rose-500 text-white" : "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"}`}>
                                      Не пройдено
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                              <p className="max-w-md text-xs font-semibold text-slate-500">
                                Непройденный пункт автоматически отправит это устройство в ремонт.
                              </p>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                {!activeSerialTestResult.reviewed && (
                                  <button type="button" onClick={() => updateTestingClaims([activeSerialTestResult.serial_number], "release")} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50">
                                    Освободить
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => confirmSerialTestResult(activeSerialTestResult.serial_number)}
                                  disabled={!activeTestChecklistReady}
                                  className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                                >
                                  {activeTestChecklistReady ? "Зафиксировать и перейти дальше" : `Осталось пунктов: ${activeTestChecklistTotal - activeTestChecklistCompleted}`}
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-400">Выберите устройство для проверки</div>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                )}

                {testingStep === "serials" && taskSerialNumbers.length > 0 && (
                  <div className="mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="text-base font-black text-slate-900">Результаты по устройствам</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-400">Итог определяется автоматически по персональному чек-листу каждого номера.</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                          Проверено ранее: {processedTaskSerialCount}
                        </span>
                        <input
                          type="search"
                          value={serialSearch}
                          onChange={(event) => setSerialSearch(event.target.value)}
                          placeholder="Найти заводской номер"
                          className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:w-56"
                        />
                      </div>
                    </div>
                    <div className="grid grid-flow-dense grid-cols-1 gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleTaskSerialNumbers.map((serialNumber) => {
                        const serialResult = serialTestResults.find((result) => result.serial_number === serialNumber);
                        const isDefective = serialResult?.reviewed && (serialResult.checklist || []).some((item) => !item.checked);
                        const serialStatus = taskSerialNumberStatuses[serialNumber];
                        const isProcessed = ["passed", "repair", "packed", "stocked"].includes(serialStatus);
                        const processedLabel = serialStatus === "repair" ? "В ремонте" : "Годен";
                        const resultLabel = isProcessed ? processedLabel : !serialResult?.reviewed ? "Не проверено" : isDefective ? "В ремонт" : "Годен";
                        return (
                          <div
                            key={serialNumber}
                            className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 text-left transition ${
                              isProcessed
                                ? "cursor-default border-slate-100 bg-slate-50 text-slate-400"
                                : isDefective
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-emerald-100 bg-emerald-50/60 text-emerald-700 hover:border-emerald-200"
                            }`}
                          >
                            <span className="truncate font-mono text-xs font-black">{serialNumber}</span>
                            <span className="shrink-0 text-xs font-black">{resultLabel}</span>
                          </div>
                        );
                      })}
                      {!visibleTaskSerialNumbers.length && (
                        <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400 sm:col-span-2 xl:col-span-3">Заводской номер не найден</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-semibold text-slate-500">
                        Проверено: <span className="font-black text-slate-900">{reviewedSerialTestResults.length} из {serialTestResults.length}</span>
                      </p>
                      <button type="button" onClick={() => setTestingStep("result")} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700">
                        Перейти к результату
                      </button>
                    </div>
                  </div>
                )}

                {testingStep === "serials" && taskSerialNumbers.length === 0 && (
                  <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    У партии нет заводских номеров. Количество брака можно указать на следующем шаге.
                    <button type="button" onClick={() => setTestingStep("result")} className="mt-3 block min-h-10 rounded-xl bg-amber-900 px-4 text-xs font-black text-white">Перейти к результату</button>
                  </div>
                )}

                {testingStep === "result" && <div className="grid grid-flow-dense grid-cols-1 gap-4 xl:grid-cols-12">
                  <div className="space-y-3 xl:col-span-7">
                  {testProductLines.length > 0 ? (
                    <div className="space-y-3">
                      {testProductLines.map((item) => {
                        const line = (completionPayload.defective_products || []).find((entry) => entry.product_id === item.product_id);
                        const defectiveQty = serialTestResults.length && testProductLines.length === 1
                          ? testDefectiveTotal
                          : Number(line?.defective_qty || 0);
                        const totalQty = Number(item.qty || 0);
                        const setDefectiveQty = (value) => changeDefectiveProduct(
                          item.product_id,
                          String(Math.min(Math.max(Number(value || 0), 0), totalQty)),
                        );
                        return (
                          <div key={item.product_id} className="rounded-2xl border border-slate-100 bg-white p-4">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="truncate text-base font-black text-slate-900">{item.product_name || `Изделие ID ${item.product_id}`}</div>
                                <div className="mt-1 text-xs font-semibold text-slate-400">
                                  {[item.drawing_number, `${totalQty} шт.`].filter(Boolean).join(" · ")}
                                </div>
                              </div>
                              <div className="text-sm font-bold text-emerald-700">
                                Годных: {Math.max(totalQty - defectiveQty, 0)}
                              </div>
                            </div>
                            {taskSerialNumbers.length === 0 && (
                            <>
                            <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2">
                              <button
                                type="button"
                                disabled={defectiveQty <= 0}
                                onClick={() => setDefectiveQty(defectiveQty - 1)}
                                className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 text-xl font-black text-slate-600 transition hover:bg-slate-100 disabled:text-slate-300"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={totalQty}
                                value={line?.defective_qty || ""}
                                placeholder="Брак, шт."
                                onChange={(e) => changeDefectiveProduct(item.product_id, e.target.value)}
                                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-lg font-black text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                              />
                              <button
                                type="button"
                                disabled={defectiveQty >= totalQty}
                                onClick={() => setDefectiveQty(defectiveQty + 1)}
                                className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 text-xl font-black text-slate-600 transition hover:bg-slate-100 disabled:text-slate-300"
                              >
                                +
                              </button>
                            </div>
                            <p className="mt-2 text-center text-xs font-semibold text-slate-400">Укажите только количество изделий с браком</p>
                            </>
                            )}
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

                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white xl:col-span-5">
                    <div className="border-b border-slate-100 p-4">
                      <h3 className="text-base font-black text-slate-900">Итог проверки</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-400">Проверьте результат перед завершением задачи.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-4">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <div className="text-2xl font-black text-emerald-700">{testPassedTotal || 0}</div>
                        <div className="mt-1 text-xs font-bold text-emerald-600">годных изделий</div>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                        <div className="text-2xl font-black text-rose-700">{testDefectiveTotal || 0}</div>
                        <div className="mt-1 text-xs font-bold text-rose-600">отправится в ремонт</div>
                      </div>
                    </div>
                    <div className="space-y-2 px-4">
                      <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold ${
                        !serialTestResults.length || reviewedSerialTestResults.length > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        <span>Готово к передаче</span>
                        <span>
                          {serialTestResults.length
                            ? `${reviewedSerialTestResults.length} из ${serialTestResults.length}`
                            : "Без заводских номеров"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                        <span>Заводские номера</span>
                        <span>{taskSerialNumbers.length || "не заданы"}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <PayloadField label="Комментарий к проверке" name="notes" value={completionPayload.notes} onChange={changePayload} />
                    </div>
                  </div>
                </div>}
              </div>
            )}
            {task.type === "repair_defects" && (
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-flow-dense grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1.5 sm:grid-cols-3">
                  {[
                    ["devices", "Устройства", `${repairSerialDefects.length || repairDefectiveQty || 0} шт.`],
                    ["components", "Компоненты", (completionPayload.extra_components || []).length ? `${(completionPayload.extra_components || []).length} поз.` : "не требуются"],
                    ["requests", "Заявки", hasOpenMaterialFlow ? "есть активные" : materialRequests.length ? `${materialRequests.length} в истории` : "нет заявок"],
                  ].map(([id, label, detail]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRepairTab(id)}
                      className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 text-left transition ${
                        repairTab === id
                          ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700"
                      }`}
                    >
                      <span className="text-sm font-black">{label}</span>
                      <span className={`text-[11px] font-bold ${repairTab === id ? "text-blue-500" : "text-slate-400"}`}>{detail}</span>
                    </button>
                  ))}
                </div>

                {repairTab === "devices" && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    <div className="grid grid-flow-dense grid-cols-1 lg:grid-cols-12">
                      <aside className="border-b border-slate-100 bg-slate-50/70 p-3 lg:col-span-4 lg:border-r lg:border-b-0">
                        <div className="mb-3 flex items-center justify-between gap-3 px-1">
                          <div>
                            <h3 className="text-sm font-black text-slate-900">Дефектная партия</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-400">Выберите устройство.</p>
                          </div>
                          <span className="rounded-lg bg-rose-100 px-2 py-1 text-xs font-black text-rose-700">{repairSerialDefects.length || repairDefectiveQty || 0}</span>
                        </div>
                        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                          {repairSerialDefects.map((defect, index) => (
                            <button
                              key={defect.serial_number}
                              type="button"
                              onClick={() => setActiveRepairSerial(defect.serial_number)}
                              className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left transition ${
                                activeRepairDefect?.serial_number === defect.serial_number
                                  ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/15"
                                  : "border-slate-100 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-mono text-xs font-black">{defect.serial_number}</span>
                                <span className={`mt-1 block text-[10px] font-bold ${activeRepairDefect?.serial_number === defect.serial_number ? "text-blue-100" : "text-slate-400"}`}>
                                  Устройство {index + 1} из {repairSerialDefects.length}
                                </span>
                              </span>
                              <span className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700">
                                {(defect.failed_checks || []).length} причин
                              </span>
                            </button>
                          ))}
                        </div>
                      </aside>

                      <div className="p-4 lg:col-span-8 lg:p-5">
                        {activeRepairDefect ? (
                          <>
                            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-xs font-bold text-slate-400">{repairContext.product_name || "Ремонт устройства"}</p>
                                <h3 className="mt-1 font-mono text-xl font-black text-slate-900">{activeRepairDefect.serial_number}</h3>
                                <p className="mt-1 text-xs font-semibold text-slate-400">{repairContext.drawing_number || "Без децимального номера"}</p>
                              </div>
                              <span className="w-fit rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Требуется ремонт</span>
                            </div>
                            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                              <h4 className="text-xs font-black text-rose-700">Причины по результатам тестирования</h4>
                              <div className="mt-3 grid grid-flow-dense grid-cols-1 gap-2 sm:grid-cols-2">
                                {(activeRepairDefect.failed_checks || []).map((check, index) => (
                                  <div key={`${check.id || check.label}-${index}`} className="flex min-h-11 items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 text-sm font-semibold text-rose-900">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-black text-rose-700">×</span>
                                    <span>{check.label || "Причина не указана"}</span>
                                  </div>
                                ))}
                                {!(activeRepairDefect.failed_checks || []).length && (
                                  <p className="text-sm font-semibold text-rose-700 sm:col-span-2">Причина старой заявки не была сохранена по пунктам чек-листа.</p>
                                )}
                              </div>
                              {activeRepairDefect.tester_note && (
                                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">Комментарий тестировщика: {activeRepairDefect.tester_note}</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-400">В задаче нет привязанных заводских номеров</div>
                        )}
                        <div className="mt-5 border-t border-slate-100 pt-4">
                          <label className="block">
                            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Что сделано с устройством {activeRepairDefect?.serial_number || ""}
                            </span>
                            <textarea
                              rows={4}
                              value={activeSerialRepairResult?.work_done || ""}
                              onChange={(event) => changeSerialRepairResult(activeRepairDefect?.serial_number, event.target.value)}
                              disabled={!activeRepairDefect}
                              placeholder="Опишите диагностику, заменённые компоненты и выполненные работы"
                              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
                            />
                          </label>
                          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                            <span>Заполнено устройств</span>
                            <span className="font-black text-slate-900">{completedSerialRepairResults.length} из {serialRepairResults.length}</span>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-slate-400">После завершения устройства будут переданы только на повторное тестирование.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {repairTab === "components" && <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Компоненты для ремонта</h3>
                      <p className="mt-1 max-w-xl text-xs font-semibold text-slate-400">Добавляйте только позиции, которых не хватает для устранения дефекта. Система проверит склад и при необходимости создаст закупку.</p>
                    </div>
                    <button type="button" onClick={addExtraComponent} className="min-h-11 shrink-0 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-blue-700">
                      Добавить позицию
                    </button>
                  </div>
                  <div className="space-y-3">
                    {repairComponentOptions.length === 0 && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        В составе изделия нет привязанных покупных компонентов для выбора.
                      </div>
                    )}
                    {(completionPayload.extra_components || []).length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
                        <h4 className="text-sm font-black text-slate-800">Дополнительные компоненты не требуются</h4>
                        <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-slate-400">Можно вернуться к устройствам и завершить ремонт. Если в процессе понадобится деталь, добавьте её здесь.</p>
                        <button type="button" onClick={addExtraComponent} className="mt-4 min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:text-blue-700">
                          Добавить первую позицию
                        </button>
                      </div>
                    )}
                    {(completionPayload.extra_components || []).map((item, index) => {
                      const matches = repairComponentMatches(item.component_query);
                      const selected = repairComponentOptions.find((component) => component.component_id === Number(item.component_id));
                      const isReady = Boolean(selected && Number(item.qty || 0) > 0 && String(item.reason || "").trim());
                      return (
                        <div key={index} className={`rounded-2xl border transition ${isReady ? "border-emerald-100 bg-emerald-50/30" : "border-slate-200 bg-slate-50/70"}`}>
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white/80 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${isReady ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span>
                              <div>
                                <h4 className="text-sm font-black text-slate-900">Позиция заявки</h4>
                                <p className={`mt-0.5 text-[10px] font-bold ${isReady ? "text-emerald-600" : "text-slate-400"}`}>{isReady ? "Готова к отправке" : "Заполните обязательные поля"}</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => removeExtraComponent(index)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-white text-lg font-bold text-rose-500 transition hover:bg-rose-50" aria-label={`Удалить позицию ${index + 1}`}>×</button>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-flow-dense grid-cols-1 gap-3 lg:grid-cols-12">
                              <div className="lg:col-span-9">
                                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Компонент *</span>
                                <ComponentSearchField
                                  value={item.component_query || ""}
                                  onChange={(value) => changeExtraComponent(index, { component_query: value, component_id: "" })}
                                  placeholder="Позиционное обозначение, название или артикул"
                                  matches={matches}
                                  onSelect={(component) => changeExtraComponent(index, {
                                    component_id: component.component_id,
                                    component_query: [uniqueDesignators(component.designators), component.component_name, component.part_number].filter(Boolean).join(" · "),
                                  })}
                                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                                />
                              </div>
                              <label className="lg:col-span-3">
                                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Количество *</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty || ""}
                                  onChange={(e) => changeExtraComponent(index, { qty: e.target.value })}
                                  placeholder="1"
                                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black outline-none transition focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                                />
                              </label>
                              <label className="lg:col-span-12">
                                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Зачем нужен компонент *</span>
                                <input
                                  value={item.reason || ""}
                                  onChange={(e) => changeExtraComponent(index, { reason: e.target.value })}
                                  placeholder="Например: замена элемента с коротким замыканием"
                                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                                />
                              </label>
                            </div>
                          {selected && (
                            <div className="mt-3 flex flex-col gap-1 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 sm:flex-row sm:items-center sm:justify-between">
                              <span className="font-black">Выбрано: {componentTitle(selected)}</span>
                              <span className="font-semibold">{[uniqueDesignators(selected.designators), selected.value, selected.package].filter(Boolean).join(" · ")}</span>
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
                          </div>
                        </div>
                      );
                    })}
                    {(completionPayload.extra_components || []).length > 0 && (
                      <div className={`flex flex-col gap-2 rounded-xl px-4 py-3 text-xs font-bold sm:flex-row sm:items-center sm:justify-between ${
                        hasIncompleteRepairComponents ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        <span>{hasIncompleteRepairComponents ? "Есть незаполненные позиции" : "Все позиции готовы к отправке"}</span>
                        <span>{(completionPayload.extra_components || []).filter((item) => item.component_id && Number(item.qty || 0) > 0 && String(item.reason || "").trim()).length} из {(completionPayload.extra_components || []).length}</span>
                      </div>
                    )}
                  </div>
                </div>}

                {repairTab === "requests" && hasOpenMaterialFlow && (
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

                {repairTab === "requests" && materialRequests.length > 0 && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700">История заявок</h3>
                    <div className="space-y-3">
                      {materialRequests.map((request, index) => (
                        <div key={`${request.created_at}-${index}`} className="rounded-xl border border-amber-100 bg-white p-3 text-xs">
                          <div className="font-black text-slate-800">Заявка {index + 1}{request.created_at ? ` · ${formatYekaterinburgDateTime(request.created_at)}` : ""}</div>
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
                {repairTab === "requests" && !hasOpenMaterialFlow && materialRequests.length === 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white px-5 py-10 text-center">
                    <h3 className="text-sm font-black text-slate-900">Заявок на компоненты нет</h3>
                    <p className="mt-2 text-xs font-semibold text-slate-400">Если для ремонта понадобятся детали, добавьте их на вкладке «Компоненты».</p>
                    <button type="button" onClick={() => setRepairTab("components")} className="mt-4 min-h-10 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-blue-700">
                      Перейти к компонентам
                    </button>
                  </div>
                )}
              </div>
            )}
            {task.type === "packer_pack" && (
              <div className="md:col-span-2 overflow-hidden rounded-2xl border border-violet-100 bg-white">
                <div className="border-b border-violet-100 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_48%)] p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Упаковка по заводским номерам</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Отметьте конкретные устройства, которые фактически упакованы и готовы к передаче на склад.</p>
                    </div>
                    <div className="rounded-xl border border-violet-100 bg-white px-4 py-2 text-center">
                      <div className="text-xl font-black text-violet-700">{packingSelectedCount}</div>
                      <div className="text-[10px] font-bold text-violet-500">выбрано из {packingSerialUnits.length}</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-flow-dense grid-cols-3 gap-2">
                    {[
                      ["Доступно", packingSerialUnits.length],
                      ["Упаковано сейчас", packingSelectedCount],
                      ["Останется", Math.max(packingSerialUnits.length - packingSelectedCount, 0)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-violet-100 bg-white px-3 py-2.5">
                        <div className="truncate text-[10px] font-bold text-slate-400">{label}</div>
                        <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="mb-4 grid grid-flow-dense grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
                    <label className="relative block">
                      <span className="sr-only">Найти устройство</span>
                      <input
                        value={packingSerialSearch}
                        onChange={(event) => setPackingSerialSearch(event.target.value)}
                        placeholder="Заводской номер, изделие или децимальный номер"
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-14 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">{visiblePackingSerialUnits.length}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => selectPackingSerials(visiblePackingSerialUnits.map((item) => item.serial_number))} disabled={visiblePackingSerialUnits.length === 0} className="min-h-11 rounded-xl border border-violet-200 bg-violet-50 px-4 text-xs font-black text-violet-700 transition hover:bg-violet-100 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300">
                        Выбрать показанные
                      </button>
                      <button type="button" onClick={() => selectPackingSerials([])} disabled={packingSelectedCount === 0} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:text-slate-300">
                        Снять отметки
                      </button>
                    </div>
                  </div>

                  <div className="hidden max-h-[430px] overflow-auto rounded-xl border border-slate-200 sm:block">
                    <table className="w-full border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="w-14 border-b border-slate-200 px-4 py-3">Упак.</th>
                          <th className="border-b border-slate-200 px-4 py-3">Заводской номер</th>
                          <th className="border-b border-slate-200 px-4 py-3">Изделие</th>
                          <th className="w-56 border-b border-slate-200 px-4 py-3">Децимальный номер</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visiblePackingSerialUnits.map((item) => {
                          const selected = selectedPackingSerialNumbers.includes(item.serial_number);
                          return (
                            <tr key={item.serial_number} onClick={() => togglePackingSerial(item.serial_number)} className={`cursor-pointer transition-colors ${selected ? "bg-violet-50/80" : "bg-white hover:bg-slate-50"}`}>
                              <td className="px-4 py-3">
                                <span className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-black ${selected ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 bg-white text-transparent"}`}>✓</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-sm font-black text-slate-900">{item.serial_number}</td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-700">{item.product_name || "Изделие"}</td>
                              <td className="px-4 py-3 font-mono text-xs font-black text-violet-700">{item.drawing_number || "Не указан"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2 sm:hidden">
                    {visiblePackingSerialUnits.map((item) => {
                      const selected = selectedPackingSerialNumbers.includes(item.serial_number);
                      return (
                        <button key={item.serial_number} type="button" onClick={() => togglePackingSerial(item.serial_number)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selected ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-white"}`}>
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${selected ? "border-violet-500 bg-violet-600 text-white" : "border-slate-200 text-transparent"}`}>✓</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-xs font-black text-slate-900">{item.serial_number}</span>
                            <span className="mt-1 block truncate text-[10px] font-bold text-slate-500">{item.product_name || "Изделие"} · {item.drawing_number || "Децимальный номер не указан"}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {visiblePackingSerialUnits.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-400">
                      {packingSerialSearch.trim() ? "Устройства не найдены" : "Нет устройств, доступных для упаковки"}
                    </div>
                  )}

                  <div className={`mt-4 rounded-xl border px-4 py-3 text-xs font-semibold ${packingSelectedCount ? "border-violet-100 bg-violet-50 text-violet-800" : "border-amber-100 bg-amber-50 text-amber-800"}`}>
                    {packingSelectedCount
                      ? `На склад будут переданы только выбранные устройства: ${packingSelectedCount} шт.`
                      : "Перед завершением отметьте хотя бы одно фактически упакованное устройство."}
                  </div>
                </div>
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
                    <AuthenticatedFileLink file={task.payload.invoice_attachment} className="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">
                      Счет: {task.payload.invoice_attachment.original_name}
                    </AuthenticatedFileLink>
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
          </fieldset>

          {task.type === "manual" && <section className="rounded-2xl border border-slate-100 bg-white p-4">
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Результат работы</h3>
            <div className="flex gap-2">
              <input disabled={!canEditTask} value={note} onChange={(e) => setNote(e.target.value)} placeholder={canEditTask ? "Добавить комментарий..." : "Сначала возьмите задачу в работу"} className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[#3F8CFF] disabled:bg-slate-50 disabled:text-slate-400" />
              <button disabled={!canEditTask} onClick={addNote} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:bg-slate-300">Добавить</button>
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
          </section>}
        </div>

        <div className="task-detail-actionbar sticky bottom-0 z-20 flex shrink-0 items-center justify-between border-t border-slate-100 bg-white/95 p-4 backdrop-blur sm:px-8 sm:py-5">
          <button onClick={() => onClose()} className="text-xs font-bold text-slate-500">← Вернуться назад</button>
	          {task.status !== "done" && (
	            canComplete ? (
	              <div className="flex flex-col gap-2 sm:flex-row">
                    {task.type === "procurement_purchase" && (
                      <button
                        type="button"
                        onClick={() => complete(true)}
                        disabled={loading || procurementSelectedLines === 0}
                        className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-xs font-black text-blue-700 transition hover:bg-blue-50 disabled:border-slate-200 disabled:text-slate-300"
                      >
                        Сохранить черновик
                      </button>
                    )}
		                <button
                      onClick={() => complete(false)}
                      disabled={loading || blocksAssemblyTransfer || blocksRepairCompletion || blocksRepairResultCompletion || hasIncompleteRepairComponents || blocksTestingCompletion || (task.type === "assembler_build" && assemblyTransferRemaining <= 0) || (task.type === "packer_pack" && packingSelectedCount <= 0)}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest"
                    >
		                  {actionLabel}
		                </button>
	              </div>
            ) : task.status === "ready_to_issue" ? (
              <span className="text-xs font-bold text-slate-400">
                {task.type === "repair_issue_materials" && task.payload?.counterparty_role !== "assembler"
                  ? "Ожидает получения инженером по ремонту"
                  : "Ожидает получения сборщиком"}
              </span>
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
  const completionKeyRef = useRef(null);
  const [task, setTask] = useState(null);
  const [payload, setPayload] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
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
        qty: "",
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
  }, [taskId]);

  useEffect(() => {
    completionKeyRef.current = null;
    queueMicrotask(load);
  }, [load]);

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
      const productLines = task?.payload?.pending_product_lines?.length
        ? task.payload.pending_product_lines
        : (task?.payload?.product_lines || []);
      const totalQty = productLines.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      return {
        ...current,
        defective_products: next,
        defective_qty: String(totalDefective),
        passed_qty: String(Math.max(totalQty - totalDefective, 0)),
      };
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

  const complete = async (saveOnly = false) => {
    completionKeyRef.current ||= crypto.randomUUID();
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
      body: JSON.stringify({ payload: numericPayload, idempotency_key: completionKeyRef.current }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось завершить задачу");
      return;
    }
    completionKeyRef.current = null;
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
  const quickTestProductLines = task.payload?.pending_product_lines?.length
    ? task.payload.pending_product_lines
    : (task.payload?.product_lines || []);

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
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold text-blue-800">
                Введите количество из счёта: оно может быть меньше потребности для частичной закупки или больше при минимальной партии поставщика.
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PayloadField label="Номер счета / ссылка" name="invoice" value={payload.invoice} onChange={change} />
                <PayloadField label="Поставщик" name="supplier" value={payload.supplier} onChange={change} />
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Ожидаемая дата</span>
                  <CalendarField
                    value={payload.expected_date}
                    onChange={(value) => change("expected_date", value)}
                    minDate={new Date().toLocaleDateString("en-CA")}
                    className="min-w-0"
                  />
                </label>
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
            <AuthenticatedFileLink file={task.payload.invoice_attachment} className="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">
              Счет закупщика: {task.payload.invoice_attachment.original_name}
            </AuthenticatedFileLink>
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
                      step="any"
                      value={line?.qty || ""}
                      onChange={(e) => changeLine(collection, item.component_id, e.target.value, item.line_uid)}
                      className="w-full min-h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                    />
                    {task.type === "procurement_purchase" && Number(line?.qty || 0) > Number(item.shortage_qty || item.qty || 0) && (
                      <p className="text-[11px] font-bold text-amber-700">
                        Излишек {Number(line.qty) - Number(item.shortage_qty || item.qty || 0)} шт. поступит на склад.
                      </p>
                    )}
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
              {quickTestProductLines.length === 0 && (
                <PayloadField label="Бракованных изделий" name="defective_qty" value={payload.defective_qty} onChange={change} type="number" />
              )}
              {quickTestProductLines.length > 0 && (
                <div className="space-y-2 sm:col-span-2">
                  {quickTestProductLines.map((item) => {
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        setTasks(await res.json());
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);
  return { tasks, loading, reload: load };
}

function TaskList({ endpoint, user, onOpenPage, title, subtitle }) {
  const { tasks, loading, reload } = useTasks(endpoint);
  const [activeTaskId, setActiveTaskId] = useState(null);

  return (
    <div className="workspace-page personnel-page w-full max-w-none space-y-6 p-4 sm:p-6 lg:p-10">
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

function ManualTaskModal({ user, onClose, onCreated }) {
  const allowedRoles = canManageTasks(user)
    ? Object.keys(ROLE_LABELS).filter((role) => role !== "admin")
    : userRoles(user).filter((role) => role !== "admin");
  const [form, setForm] = useState({
    title: "",
    description: "",
    role: allowedRoles[0] || user?.role || "",
    assigned_user_id: "",
    order_id: "",
    product_id: "",
    priority: "normal",
    planned_start_at: "",
    due_date: "",
    estimated_hours: "",
    dependency_ids: [],
  });
  const [assignees, setAssignees] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [manualOptions, setManualOptions] = useState({ orders: [], products: [], tasks: [] });
  const [watcherIds, setWatcherIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tasks/assignees?role=${encodeURIComponent(form.role)}`);
      if (res.ok) setAssignees(await res.json());
    };
    if (form.role) load();
  }, [form.role]);

  useEffect(() => {
    const load = async () => {
      const [peopleRes, optionsRes] = await Promise.all([
        fetch("/api/tasks/assignees"),
        fetch("/api/tasks/manual-options"),
      ]);
      if (peopleRes.ok) setAllPeople(await peopleRes.json());
      if (optionsRes.ok) setManualOptions(await optionsRes.json());
    };
    load();
  }, []);

  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const toggleWatcher = (id) => setWatcherIds((current) => (
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  ));
  const addDependency = (value) => {
    const id = Number(value);
    if (!id) return;
    change("dependency_ids", [...new Set([...form.dependency_ids, id])]);
  };
  const removeDependency = (id) => {
    change("dependency_ids", form.dependency_ids.filter((item) => item !== id));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Введите название задачи");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      role: form.role,
      assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : null,
      order_id: form.order_id ? Number(form.order_id) : null,
      product_id: form.product_id ? Number(form.product_id) : null,
      priority: form.priority,
      planned_start_at: form.planned_start_at || null,
      due_date: form.due_date || null,
      estimated_minutes: form.estimated_hours ? Math.round(Number(form.estimated_hours) * 60) : null,
      watcher_ids: watcherIds,
      dependency_ids: form.dependency_ids,
    };
    const res = await fetch("/api/tasks/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось создать задачу");
      return;
    }
    await onCreated();
    onClose();
  };

  const inputClass = "min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#3F8CFF]">Новая работа</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Создать ручную задачу</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">Заказ и изделие можно не указывать.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-500">✕</button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Название *</span>
            <input autoFocus value={form.title} onChange={(e) => change("title", e.target.value)} className={inputClass} placeholder="Что нужно сделать" />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Описание</span>
            <textarea value={form.description} onChange={(e) => change("description", e.target.value)} className={`${inputClass} min-h-24 py-3`} placeholder="Результат, условия и важные детали" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Отдел *</span>
            <select value={form.role} onChange={(e) => change("role", e.target.value)} className={inputClass}>
              {allowedRoles.map((role) => <option value={role} key={role}>{ROLE_LABELS[role] || role}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Исполнитель</span>
            <select value={form.assigned_user_id} onChange={(e) => change("assigned_user_id", e.target.value)} className={inputClass}>
              <option value="">Без исполнителя</option>
              {assignees.map((item) => <option value={item.id} key={item.id}>{item.full_name || item.username}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Приоритет</span>
            <select value={form.priority} onChange={(e) => change("priority", e.target.value)} className={inputClass}>
              <option value="low">Низкий</option>
              <option value="normal">Обычный</option>
              <option value="high">Высокий</option>
              <option value="critical">Критический</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Оценка, часов</span>
            <input type="number" min="0.25" step="0.25" value={form.estimated_hours} onChange={(e) => change("estimated_hours", e.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Плановое начало</span>
            <input type="datetime-local" value={form.planned_start_at} onChange={(e) => change("planned_start_at", e.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Дедлайн</span>
            <input type="datetime-local" value={form.due_date} onChange={(e) => change("due_date", e.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Связать с заказом</span>
            <select value={form.order_id} onChange={(e) => change("order_id", e.target.value)} className={inputClass}>
              <option value="">Без привязки к заказу</option>
              {manualOptions.orders.map((order) => (
                <option value={order.id} key={order.id}>Заказ №{order.id} · {order.customer_name || "Без заказчика"}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Связать с изделием</span>
            <select value={form.product_id} onChange={(e) => change("product_id", e.target.value)} className={inputClass}>
              <option value="">Без привязки к изделию</option>
              {manualOptions.products.map((product) => (
                <option value={product.id} key={product.id}>
                  {product.name}{product.drawing_number ? ` · ${product.drawing_number}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Начать после другой задачи</span>
            <select value="" onChange={(e) => addDependency(e.target.value)} className={inputClass}>
              <option value="">Выберите задачу, если есть зависимость</option>
              {manualOptions.tasks
                .filter((task) => !form.dependency_ids.includes(task.id))
                .map((task) => (
                  <option value={task.id} key={task.id}>#{task.id} · {task.title}</option>
                ))}
            </select>
            {form.dependency_ids.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.dependency_ids.map((id) => {
                  const dependency = manualOptions.tasks.find((task) => task.id === id);
                  return (
                    <button type="button" onClick={() => removeDependency(id)} key={id} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-left text-xs font-bold text-blue-700">
                      #{id} · {dependency?.title || "Задача"} <span className="ml-1 text-blue-400">×</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs font-bold text-slate-500">Наблюдатели</div>
          <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {allPeople.map((item) => (
              <button type="button" onClick={() => toggleWatcher(item.id)} key={item.id} className={`rounded-xl border px-3 py-2 text-xs font-bold ${watcherIds.includes(item.id) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}>
                {item.full_name || item.username}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="min-h-11 rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-600">Отмена</button>
          <button disabled={saving} className="min-h-11 rounded-2xl bg-[#3F8CFF] px-6 text-sm font-bold text-white disabled:bg-slate-300">{saving ? "Создание..." : "Создать задачу"}</button>
        </div>
      </form>
    </div>
  );
}

function TaskCalendar({ endpoint, user, onOpenTask }) {
  const { tasks, loading, reload } = useTasks(endpoint);
  const [manualTaskOpen, setManualTaskOpen] = useState(false);
  const [periodOffset, setPeriodOffset] = useState(0);
  const [viewMode, setViewMode] = useState("week");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const toDateOnly = (date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };
  const formatIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const parseTaskDate = (task) => {
    const expected = taskExpectedDates(task)[0];
    const value = task.effective_deadline || task.due_date || task.sla_due_at || expected || (task.status === "done" ? task.completed_at : null);
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return toDateOnly(date);
  };
  const parseTaskCalendarDate = (task) => {
    const plannedDate = parseTaskDate(task);
    if (plannedDate) return plannedDate;
    if (!task.created_at) return null;
    const createdDate = new Date(task.created_at);
    if (Number.isNaN(createdDate.getTime())) return null;
    return toDateOnly(createdDate);
  };

  const today = toDateOnly(new Date());
  const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };
  const startOfWeek = (date) => {
    const result = toDateOnly(date);
    const day = result.getDay() || 7;
    result.setDate(result.getDate() - day + 1);
    return result;
  };
  const endOfWeek = (date) => {
    const result = startOfWeek(date);
    result.setDate(result.getDate() + 6);
    return result;
  };
  const selectedDay = (() => {
    const date = toDateOnly(new Date());
    date.setDate(date.getDate() + periodOffset);
    return date;
  })();
  const weekStart = (() => {
    const date = toDateOnly(new Date());
    date.setDate(date.getDate() + periodOffset * 7);
    return startOfWeek(date);
  })();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const monthDate = addMonths(toDateOnly(new Date()), periodOffset);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const monthGridStart = startOfWeek(monthStart);
  const monthGridEnd = endOfWeek(monthEnd);
  const monthDays = [];
  for (let date = new Date(monthGridStart); date <= monthGridEnd; date.setDate(date.getDate() + 1)) {
    monthDays.push(new Date(date));
  }
  const sidebarMonthDate = viewMode === "month" ? monthDate : weekStart;
  const sidebarMonthStart = new Date(sidebarMonthDate.getFullYear(), sidebarMonthDate.getMonth(), 1);
  const sidebarGridStart = startOfWeek(sidebarMonthStart);
  const sidebarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(sidebarGridStart);
    date.setDate(sidebarGridStart.getDate() + index);
    return date;
  });
  const visibleDays = viewMode === "day" ? [selectedDay] : viewMode === "month" ? monthDays : weekDays;
  const periodStart = visibleDays[0];
  const periodEnd = visibleDays[visibleDays.length - 1];

  const roles = [...new Set(tasks.map((task) => task.role).filter(Boolean))].sort();
  const statuses = [...new Set(tasks.map((task) => taskKanbanColumn(task)).filter(Boolean))].sort();
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "all" && taskKanbanColumn(task) !== statusFilter) return false;
    if (roleFilter !== "all" && task.role !== roleFilter) return false;
    return true;
  });

  const activeTasks = filteredTasks.filter((task) => task.status !== "done");
  const overdueTasks = filteredTasks.filter((task) => {
    const date = parseTaskDate(task);
    return task.status !== "done" && date && date < today;
  });
  const unassignedTasks = activeTasks.filter((task) => !task.assigned_user_id);
  const noDateTasks = activeTasks.filter((task) => !parseTaskDate(task));
  const waitingTasks = activeTasks.filter((task) => taskKanbanColumn(task) === "waiting_delivery");
  const doneTodayTasks = filteredTasks.filter((task) => {
    const date = parseTaskDate(task);
    return task.status === "done" && date && formatIsoDate(date) === formatIsoDate(today);
  });

  const tasksByDay = visibleDays.reduce((result, day) => {
    result[formatIsoDate(day)] = [];
    return result;
  }, {});
  filteredTasks.forEach((task) => {
    const date = parseTaskCalendarDate(task);
    if (!date) return;
    const key = formatIsoDate(date);
    if (date >= periodStart && date <= periodEnd && tasksByDay[key]) {
      tasksByDay[key].push(task);
    }
  });
  Object.values(tasksByDay).forEach((items) => items.sort((a, b) => taskKanbanColumn(a).localeCompare(taskKanbanColumn(b)) || a.id - b.id));
  const orderGroups = Object.values(filteredTasks.reduce((result, task) => {
    const key = task.order_id ? String(task.order_id) : "no-order";
    if (!result[key]) {
      result[key] = {
        key,
        title: task.order_id ? `Заказ #${task.order_id}` : "Без производственного заказа",
        tasks: [],
      };
    }
    result[key].tasks.push(task);
    return result;
  }, {})).sort((a, b) => {
    if (a.key === "no-order") return 1;
    if (b.key === "no-order") return -1;
    return Number(b.key) - Number(a.key);
  });

  const pickerDate = viewMode === "day" ? selectedDay : viewMode === "month" ? monthDate : weekStart;
  const jumpToDate = (value) => {
    if (!value) return;
    const target = toDateOnly(new Date(`${value}T12:00:00`));
    if (viewMode === "day") {
      setPeriodOffset(Math.round((target - today) / 86400000));
      return;
    }
    if (viewMode === "month") {
      setPeriodOffset((target.getFullYear() - today.getFullYear()) * 12 + target.getMonth() - today.getMonth());
      return;
    }
    const targetWeek = startOfWeek(target);
    const currentWeek = startOfWeek(today);
    setPeriodOffset(Math.round((targetWeek - currentWeek) / 604800000));
  };
  const changeViewMode = (mode) => {
    setViewMode(mode);
    setPeriodOffset(0);
  };
  const openCalendarDay = (date) => {
    setViewMode("day");
    setPeriodOffset(Math.round((toDateOnly(date) - today) / 86400000));
  };
  const stepPeriod = (direction) => setPeriodOffset((value) => value + direction);
  const resetPeriod = () => setPeriodOffset(0);
  const calendarPeriodTitle = viewMode === "day"
    ? selectedDay.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : viewMode === "week"
      ? `${weekStart.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${weekEnd.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}`
      : viewMode === "month"
        ? monthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
        : "Задачи по заказам";
  const calendarButton = "inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-xs font-semibold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0";
  const fieldClass = "w-full min-h-10 appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10";

  const statusLabel = (key) => ({
    assigned: "Назначены",
    in_progress: "В работе",
    hold: "Холд",
    waiting_delivery: "Ожидание",
    delayed: "Задержка",
    done: "Готово",
  }[key] || key);

  const statusBadgeClass = (task) => {
    const column = taskKanbanColumn(task);
    if (column === "delayed") return "border-rose-100 bg-rose-50 text-rose-600";
    if (column === "done") return "border-emerald-100 bg-emerald-50 text-emerald-700";
    if (column === "waiting_delivery") return "border-amber-100 bg-amber-50 text-amber-700";
    if (column === "hold") return "border-orange-100 bg-orange-50 text-orange-700";
    if (column === "in_progress") return "border-blue-100 bg-blue-50 text-[#3F8CFF]";
    return "border-slate-100 bg-slate-50 text-slate-500";
  };

  const miniTask = (task) => (
    <button
      key={task.id}
      type="button"
      onClick={() => onOpenTask(task.id)}
      title={task.title}
      className="task-mini-card block w-full rounded-2xl border border-slate-100 bg-white p-3 text-left text-xs shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 min-w-0 break-words font-black leading-snug text-slate-900">{task.title}</span>
        <span className="shrink-0 rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-400">#{task.id}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(task)}`}>{statusLabel(taskKanbanColumn(task))}</span>
        <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">{ROLE_LABELS[task.role] || task.role}</span>
      </div>
      <div className="mt-2 font-semibold text-slate-500">Заказ #{task.order_id || "—"}</div>
      <div className="mt-1 font-semibold text-slate-400">{assigneeName(task)}</div>
    </button>
  );

  const calendarToolbar = (
    <div className="mac-main-toolbar">
      <h2>{calendarPeriodTitle}</h2>
      <div className="mac-view-segment">
        {[
          ["day", "День"],
          ["week", "Неделя"],
          ["month", "Месяц"],
          ["orders", "По заказам"],
        ].map(([mode, label]) => (
          <button type="button" key={mode} className={viewMode === mode ? "active" : ""} onClick={() => changeViewMode(mode)}>
            {label}
          </button>
        ))}
      </div>
      <div className="mac-toolbar-actions">
        <div className={`mac-period-navigation ${viewMode === "orders" ? "hidden" : ""}`}>
          <button type="button" onClick={() => stepPeriod(-1)} aria-label="Предыдущий период"><ChevronLeft size={17} /></button>
          <button type="button" className="today" onClick={resetPeriod}>Сегодня</button>
          <button type="button" onClick={() => stepPeriod(1)} aria-label="Следующий период"><ChevronRight size={17} /></button>
        </div>
        <button type="button" onClick={() => setManualTaskOpen(true)} className="mac-create-task">
          <Plus size={16} />
          <span>Задача</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`tasks-calendar-page view-${viewMode} flex h-full w-full max-w-none flex-col gap-6 p-4 sm:p-6 lg:p-8`}>
      <div className="task-command-header rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="task-command-copy">
            <p className="text-[11px] font-bold text-slate-400">Диспетчерская</p>
            <h1 className="mt-1 max-w-6xl w-full text-2xl font-black text-slate-900 sm:text-3xl">Все задачи без лишнего шума</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">План-график задач по срокам, статусам и ответственным.</p>
          </div>
          <button type="button" onClick={() => setManualTaskOpen(true)} className="task-new-button min-h-12 rounded-2xl bg-[#3F8CFF] px-5 text-sm font-black text-white shadow-sm hover:bg-[#1f78ff]">
            Новая задача <ArrowRight size={17} />
          </button>
        </div>

        <div className="task-summary-strip">
          <div className="task-summary-main">
            <span>В активной очереди</span>
            <strong>{activeTasks.length}</strong>
            <small>{overdueTasks.length ? `${overdueTasks.length} требуют срочного внимания` : "Просроченных задач нет"}</small>
          </div>
          <div className="task-summary-cells">
            {[
              ["Просрочено", overdueTasks.length, "text-rose-600"],
              ["Без исполнителя", unassignedTasks.length, "text-slate-700"],
              ["Ожидание", waitingTasks.length, "text-amber-700"],
              ["Готово сегодня", doneTodayTasks.length, "text-emerald-700"],
            ].map(([label, value, cls]) => (
              <div key={label} className="task-summary-cell">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                <div className={`mt-1 text-xl font-black ${cls}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="task-control-panel mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_auto] lg:items-end">
          <label className={`task-date-picker ${viewMode === "orders" ? "is-hidden" : ""}`}>
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Перейти к дате</span>
            <input type="date" value={formatIsoDate(pickerDate)} onChange={(event) => jumpToDate(event.target.value)} className={fieldClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Статус</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={fieldClass}>
              <option value="all">Все статусы</option>
              {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Отдел</span>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={fieldClass}>
              <option value="all">Все отделы</option>
              {roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>)}
            </select>
          </label>
          <button type="button" onClick={reload} className={`${calendarButton} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>Обновить</button>
        </div>
        <div className="task-view-switcher mt-3 flex flex-wrap gap-2">
          {[
            ["day", "День"],
            ["week", "Неделя"],
            ["month", "Месяц"],
            ["orders", "По заказам"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => changeViewMode(mode)}
              className={`${calendarButton} ${
                viewMode === mode
                  ? "border-[#3F8CFF] bg-[#3F8CFF] text-white shadow-sm hover:bg-[#1f78ff] hover:shadow-md"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-medium text-slate-400">Загрузка задач...</div>
      ) : (
        <>
          {(overdueTasks.length > 0 || noDateTasks.length > 0) && (
            <div className="task-attention-grid grid grid-cols-1 gap-4 xl:grid-cols-2">
              {overdueTasks.length > 0 && (
                <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-black text-slate-900">Просрочено</h2>
                    <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">{overdueTasks.length}</span>
                  </div>
                  <div className="space-y-2">{overdueTasks.slice(0, 8).map(miniTask)}</div>
                </section>
              )}
              {noDateTasks.length > 0 && (
                <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-black text-slate-900">Без срока</h2>
                    <span className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">{noDateTasks.length}</span>
                  </div>
                  <div className="space-y-2">{noDateTasks.slice(0, 8).map(miniTask)}</div>
                </section>
              )}
            </div>
          )}

          {viewMode === "orders" ? (
            <div className="mac-orders-view">
              {calendarToolbar}
            <div className="task-order-groups grid grid-cols-1 gap-4 2xl:grid-cols-2">
              {orderGroups.length > 0 ? orderGroups.map((group) => {
                const groupActive = group.tasks.filter((task) => task.status !== "done").length;
                const groupDone = group.tasks.filter((task) => task.status === "done").length;
                return (
                  <section key={group.key} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400">Производственный заказ</p>
                        <h2 className="mt-1 text-xl font-black text-slate-900">{group.title}</h2>
                        <p className="mt-2 text-sm font-medium text-slate-500">Вся цепочка задач по заявке на производство</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-600">Активно: <b className="text-[#3F8CFF]">{groupActive}</b></span>
                        <span className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-600">Готово: <b className="text-emerald-700">{groupDone}</b></span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {group.tasks
                        .slice()
                        .sort((a, b) => (parseTaskCalendarDate(a)?.getTime() || 0) - (parseTaskCalendarDate(b)?.getTime() || 0) || a.id - b.id)
                        .map(miniTask)}
                    </div>
                  </section>
                );
              }) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-medium text-slate-400">Задач нет.</div>
              )}
            </div>
            </div>
          ) : viewMode === "month" ? (
            <div className="mac-calendar-layout mac-month-layout">
              <aside className="mac-calendar-sidebar">
                <div className="mac-mini-calendar">
                  <div className="mac-mini-calendar-title">
                    {sidebarMonthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                  </div>
                  <div className="mac-mini-weekdays">
                    {["П", "В", "С", "Ч", "П", "С", "В"].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
                  </div>
                  <div className="mac-mini-days">
                    {sidebarDays.map((day) => {
                      const key = formatIsoDate(day);
                      const inMonth = day.getMonth() === sidebarMonthDate.getMonth();
                      return (
                        <button
                          type="button"
                          key={key}
                          className={`${inMonth ? "" : "muted"} ${key === formatIsoDate(monthDate) ? "selected" : ""} ${key === formatIsoDate(today) ? "today" : ""}`}
                          onClick={() => jumpToDate(key)}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mac-calendar-filters">
                  <h3>Календари</h3>
                  {[
                    ["all", "Все задачи", "#6558e8"],
                    ["in_progress", "В работе", "#3b82f6"],
                    ["waiting_delivery", "Ожидание", "#e49b31"],
                    ["done", "Завершённые", "#25a47a"],
                  ].map(([value, label, color]) => (
                    <button type="button" key={value} className={statusFilter === value ? "active" : ""} onClick={() => setStatusFilter(value)}>
                      <i style={{ background: color }} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <div className="mac-undated-list">
                  <div><h3>Без срока</h3><span>{noDateTasks.length}</span></div>
                  {noDateTasks.slice(0, 4).map((task) => (
                    <button type="button" key={task.id} onClick={() => onOpenTask(task.id)}>
                      <strong>{task.title}</strong>
                      <span>{ROLE_LABELS[task.role] || task.role}</span>
                    </button>
                  ))}
                  {!noDateTasks.length && <p>Все активные задачи запланированы.</p>}
                </div>
              </aside>

            <div className="mac-calendar-workspace">
              {calendarToolbar}
            <section className="mac-month-calendar">
              <div className="mac-month-title">
                <h2>{monthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</h2>
                <span>{filteredTasks.length} задач</span>
              </div>
              <div className="mac-month-weekdays">
                {["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"].map((label) => <span key={label}>{label}</span>)}
              </div>
              <div className="mac-month-grid">
                {visibleDays.map((day) => {
                  const key = formatIsoDate(day);
                  const dayTasks = tasksByDay[key] || [];
                  const isToday = key === formatIsoDate(today);
                  const isCurrentMonth = day.getMonth() === monthDate.getMonth();
                  return (
                    <div key={key} className={`${isCurrentMonth ? "" : "muted"} ${isToday ? "today" : ""}`}>
                      <button type="button" className="mac-month-day-number" onClick={() => openCalendarDay(day)}>
                        {day.getDate()}
                      </button>
                      <div className="mac-month-events">
                        {dayTasks.slice(0, 4).map((task) => (
                          <button type="button" key={task.id} className={`status-${taskKanbanColumn(task)}`} onClick={() => onOpenTask(task.id)}>
                            <i />
                            <span>{!parseTaskDate(task) ? "Без срока · " : ""}{task.title}</span>
                          </button>
                        ))}
                        {dayTasks.length > 4 && <button type="button" onClick={() => openCalendarDay(day)}>Ещё {dayTasks.length - 4}</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            </div>
            </div>
          ) : (
            <div className="mac-calendar-layout">
              <aside className="mac-calendar-sidebar">
                <div className="mac-mini-calendar">
                  <div className="mac-mini-calendar-title">
                    {sidebarMonthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                  </div>
                  <div className="mac-mini-weekdays">
                    {["П", "В", "С", "Ч", "П", "С", "В"].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
                  </div>
                  <div className="mac-mini-days">
                    {sidebarDays.map((day) => {
                      const key = formatIsoDate(day);
                      const inMonth = day.getMonth() === sidebarMonthDate.getMonth();
                      const selected = visibleDays.some((visibleDay) => formatIsoDate(visibleDay) === key);
                      return (
                        <button
                          type="button"
                          key={key}
                          className={`${inMonth ? "" : "muted"} ${selected ? "selected" : ""} ${key === formatIsoDate(today) ? "today" : ""}`}
                          onClick={() => jumpToDate(key)}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mac-calendar-filters">
                  <h3>Календари</h3>
                  {[
                    ["all", "Все задачи", "#6558e8"],
                    ["in_progress", "В работе", "#3b82f6"],
                    ["waiting_delivery", "Ожидание", "#e49b31"],
                    ["done", "Завершённые", "#25a47a"],
                  ].map(([value, label, color]) => (
                    <button type="button" key={value} className={statusFilter === value ? "active" : ""} onClick={() => setStatusFilter(value)}>
                      <i style={{ background: color }} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <div className="mac-undated-list">
                  <div><h3>Без срока</h3><span>{noDateTasks.length}</span></div>
                  {noDateTasks.slice(0, 4).map((task) => (
                    <button type="button" key={task.id} onClick={() => onOpenTask(task.id)}>
                      <strong>{task.title}</strong>
                      <span>{ROLE_LABELS[task.role] || task.role}</span>
                    </button>
                  ))}
                  {!noDateTasks.length && <p>Все активные задачи запланированы.</p>}
                </div>
              </aside>

              <div className="mac-calendar-workspace">
                {calendarToolbar}
              <section className={`mac-calendar-simple ${viewMode === "day" ? "single-day" : ""}`}>
                <div className="mac-simple-days-header" style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(${viewMode === "day" ? "520px" : "160px"}, 1fr))` }}>
                  {visibleDays.map((day) => {
                    const key = formatIsoDate(day);
                    return (
                      <div key={key} className={key === formatIsoDate(today) ? "today" : ""}>
                        <span>{day.toLocaleDateString("ru-RU", { weekday: "short" })}</span>
                        <strong>{day.getDate()}</strong>
                      </div>
                    );
                  })}
                </div>
                <div className="mac-simple-day-grid" style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(${viewMode === "day" ? "520px" : "160px"}, 1fr))` }}>
                  {visibleDays.map((day) => {
                    const dayTasks = tasksByDay[formatIsoDate(day)] || [];
                    return (
                      <div className="mac-simple-day-column" key={formatIsoDate(day)}>
                        {dayTasks.map((task) => (
                          <button type="button" key={task.id} className={`mac-simple-task status-${taskKanbanColumn(task)}`} onClick={() => onOpenTask(task.id)}>
                            <span>{TASK_STATUS_LABELS[task.status] || task.status}</span>
                            <strong>{task.title}</strong>
                            <small>{!parseTaskDate(task) ? "Без срока · " : ""}{task.order_id ? `Заказ #${task.order_id}` : "Без заказа"} · {assigneeName(task)}</small>
                          </button>
                        ))}
                        {!dayTasks.length && <div className="mac-simple-empty">Нет задач</div>}
                      </div>
                    );
                  })}
                </div>
              </section>
              </div>
            </div>
          )}
        </>
      )}

      {manualTaskOpen && <ManualTaskModal user={user} onClose={() => setManualTaskOpen(false)} onCreated={reload} />}
    </div>
  );
}

function TaskKanban({ endpoint, user, onOpenPage, onOpenTask, title, subtitle, personal = false }) {
  const { tasks: loadedTasks, loading, reload } = useTasks(endpoint);
  const tasks = personal
    ? loadedTasks.filter((task) => (
      !task.assigned_user_id
      || Number(task.assigned_user_id) === Number(user?.id)
    ))
    : loadedTasks;
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
      const reason = window.prompt("Укажите причину постановки задачи на холд");
      if (!reason?.trim()) return;
      const res = await fetch(`/api/tasks/${task.id}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "hold", reason: reason.trim() }),
      });
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
        const reason = window.prompt("Укажите причину возобновления задачи");
        if (!reason?.trim()) return;
        const resumeRes = await fetch(`/api/tasks/${task.id}/resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "in_progress", reason: reason.trim() }),
        });
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
        const reason = window.prompt("Укажите причину возврата задачи в назначенные");
        if (!reason?.trim()) return;
        const resumeRes = await fetch(`/api/tasks/${task.id}/resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "assigned", reason: reason.trim() }),
        });
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
    <div className="task-kanban-page flex h-full w-full max-w-none flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <div className="task-kanban-header rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="task-command-copy">
            <p className="text-[11px] font-bold text-slate-400">Персональная очередь</p>
            <h1 className="mt-1 max-w-6xl w-full text-2xl font-black text-slate-900 sm:text-3xl">{title}: от входящих до результата</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="task-kanban-summary">
            <div><span>Всего</span><strong>{tasks.length}</strong></div>
            <div><span>Активно</span><strong>{activeCount}</strong></div>
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
          className="kanban-board task-kanban-board min-h-0 flex-1 overflow-x-auto rounded-3xl pb-1"
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
                  className={`task-kanban-column flex min-h-[520px] w-[340px] shrink-0 flex-col rounded-3xl border p-3 transition-all 2xl:w-[380px] ${
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
                        onOpenTask={onOpenTask}
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

const Dashboard = ({ onOpenPage, onOpenTask }) => {
  const { tasks } = useTasks("/api/tasks/mine");
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const areaCounts = tasks.reduce((acc, task) => {
    const key = ROLE_LABELS[task.role] || task.role;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const activeTasks = tasks.filter((task) => !["done", "cancelled"].includes(task.status));
  const inProgressTasks = activeTasks.filter((task) => task.status === "in_progress");
  const waitingTasks = activeTasks.filter((task) => ["assigned", "open", "hold", "waiting_delivery"].includes(task.status));
  const overdueTasks = activeTasks.filter((task) => {
    const rawDate = task.due_date || task.deadline;
    if (!rawDate) return false;
    const dueDate = new Date(rawDate);
    return !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
  });
  const spotlightPosition = activeTasks.length ? spotlightIndex % activeTasks.length : 0;
  const spotlightTask = activeTasks[spotlightPosition];

  return (
    <div className="live-crm-dashboard crm-dashboard-v2">
      <div className="dashboard-flow" aria-label="Производственный поток">
        <div>
          {["Заказ", "Комплектация", "Сборка", "Тестирование", "Ремонт", "Упаковка", "Готовая продукция"].map((stage) => (
            <span key={stage}>{stage}<i /></span>
          ))}
        </div>
        <div aria-hidden="true">
          {["Заказ", "Комплектация", "Сборка", "Тестирование", "Ремонт", "Упаковка", "Готовая продукция"].map((stage) => (
            <span key={stage}>{stage}<i /></span>
          ))}
        </div>
      </div>

      <div className="dashboard-bento">
        <section className="dashboard-priority-card">
          <div className="dashboard-priority-top">
            <div>
              <span>Следующее действие</span>
              <h2>{spotlightTask ? spotlightTask.title : "Очередь разобрана"}</h2>
            </div>
            {spotlightTask && <span className="dashboard-task-id">#{spotlightTask.id}</span>}
          </div>
          {spotlightTask ? (
            <>
              <p>{TASK_UX_CONFIG[spotlightTask.task_type]?.purpose || "Откройте задачу, проверьте данные и выполните следующий этап."}</p>
              <div className="dashboard-priority-meta">
                <span><Clock3 size={15} />{TASK_STATUS_LABELS[spotlightTask.status] || spotlightTask.status}</span>
                <span>{ROLE_LABELS[spotlightTask.role] || spotlightTask.role}</span>
              </div>
              <div className="dashboard-priority-actions">
                <button type="button" onClick={() => onOpenTask(spotlightTask.id)}>
                  Перейти к задаче <ArrowRight size={17} />
                </button>
                {activeTasks.length > 1 && (
                  <div>
                    <button type="button" aria-label="Предыдущая задача" onClick={() => setSpotlightIndex((index) => (index - 1 + activeTasks.length) % activeTasks.length)}><ChevronLeft size={17} /></button>
                    <span>{spotlightPosition + 1} / {activeTasks.length}</span>
                    <button type="button" aria-label="Следующая задача" onClick={() => setSpotlightIndex((index) => (index + 1) % activeTasks.length)}><ChevronRight size={17} /></button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="dashboard-clear-state">
              <span>Активных задач нет. Можно проверить общий производственный поток.</span>
              <button type="button" onClick={() => onOpenPage("Производство")}>Открыть производство</button>
            </div>
          )}
        </section>

        <section className={`dashboard-attention-card ${overdueTasks.length ? "has-alert" : ""}`}>
          <CircleAlert size={22} />
          <span>Требует внимания</span>
          <strong>{overdueTasks.length}</strong>
          <p>{overdueTasks.length ? "Просроченные задачи нужно разобрать в первую очередь." : "Просроченных задач нет."}</p>
          <button type="button" onClick={() => onOpenPage("Мои задачи")}>Проверить очередь <ArrowRight size={15} /></button>
        </section>

        <button type="button" className="dashboard-kpi-card" onClick={() => onOpenPage("Мои задачи")}>
          <Play size={19} />
          <span>В работе</span>
          <strong>{inProgressTasks.length}</strong>
          <small>Активные операции</small>
        </button>

        <button type="button" className="dashboard-kpi-card" onClick={() => onOpenPage("Мои задачи")}>
          <ListChecks size={19} />
          <span>Ожидают</span>
          <strong>{waitingTasks.length}</strong>
          <small>Можно взять следующими</small>
        </button>

        <section className="live-task-section dashboard-recent-tasks">
          <div className="live-card-heading">
            <div>
              <span>Рабочая очередь</span>
              <h2>Ближайшие задачи</h2>
            </div>
            <button type="button" onClick={() => onOpenPage("Мои задачи")}>Все задачи</button>
          </div>
          <div className="live-task-list">
            {tasks.slice(0, 5).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={onOpenPage}
                onOpenTask={onOpenTask}
                compact
              />
            ))}
            {tasks.length === 0 && <div className="live-empty">Нет активных задач</div>}
          </div>
        </section>

        <aside className="live-areas dashboard-areas">
          <div className="live-card-heading">
            <div>
              <span>Нагрузка</span>
              <h2>По направлениям</h2>
            </div>
          </div>
          <div className="live-area-list">
            {Object.entries(areaCounts).map(([area, count], index) => (
              <button type="button" onClick={() => onOpenPage("Мои задачи")} key={area}>
                <i style={{ "--area-index": index }} />
                <span>{area}</span>
                <strong>{count}</strong>
              </button>
            ))}
            {Object.keys(areaCounts).length === 0 && <div className="live-empty">Нет данных</div>}
          </div>
        </aside>
      </div>
    </div>
  );
};

const AllTasks = ({ user, onOpenPage, onOpenTask }) => (
  <TaskCalendar
    endpoint="/api/tasks"
    user={user}
    onOpenPage={onOpenPage}
    onOpenTask={onOpenTask}
  />
);
const MyTasks = ({ user, onOpenPage, onOpenTask }) => (
  <TaskKanban
    key={user.id}
    endpoint="/api/tasks/mine"
    user={user}
    personal
    title="Мои задачи"
    subtitle={`${ROLE_LABELS[user.role] || user.role || "Сотрудник"}: персональная очередь работ`}
    onOpenPage={onOpenPage}
    onOpenTask={onOpenTask}
  />
);

function LoginPage({ onLogin, theme, onToggleTheme }) {
  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className={`login-page ${theme === "dark" ? "theme-dark" : ""}`}>
      <button type="button" onClick={onToggleTheme} className="login-theme-toggle" aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}>
        {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        <span>{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</span>
      </button>

      <main className="login-shell">
        <section className="login-welcome" aria-label="О системе">
          <div className="login-brand">
            <span className="login-brand-mark"><img src={projectLogo} alt="" /></span>
            <span>Проекты</span>
          </div>
          <div className="login-welcome-copy">
            <p>Управление производством</p>
            <h1>Вся работа команды — в одном пространстве</h1>
            <span>Заявки, производство, склад и задачи сотрудников всегда под рукой.</span>
          </div>
          <div className="login-orbit" aria-hidden="true"><i /><i /><i /></div>
        </section>

        <form onSubmit={submit} className="login-form">
          <div className="login-form-heading">
            <span className="login-mobile-logo"><img src={projectLogo} alt="" /> Проекты</span>
            <p>Добро пожаловать</p>
            <h2>Вход в систему</h2>
            <span>Используйте телефон и пароль, выданные руководителем.</span>
          </div>

          {error && <div className="login-error" role="alert"><CircleAlert size={18} /><span>{error}</span></div>}

          <label className="login-field">
            <span>Телефон</span>
            <div>
              <Phone size={18} />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={(e) => setPhone(defaultPhoneInput(e.target.value))}
                placeholder="+7 900 123-45-67"
                inputMode="tel"
                autoComplete="username"
                autoFocus
              />
            </div>
          </label>

          <label className="login-field">
            <span>Пароль</span>
            <div>
              <LockKeyhole size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button disabled={loading || !phone.trim() || !password} className="login-submit">
            <span>{loading ? "Проверяем данные…" : "Войти в Проекты"}</span>
            {!loading && <ArrowRight size={18} />}
          </button>

          <p className="login-help">Не получается войти? Обратитесь к менеджеру или администратору.</p>
        </form>
      </main>
    </div>
  );
}

function Personnel({ currentUser }) {
  const canManagePersonnel = userHasRole(currentUser, ["admin", "manager"]);
  const currentUserIsAdmin = userRoles(currentUser).includes("admin");
  const canEditUser = (user) => canManagePersonnel && (currentUserIsAdmin || !userRoles(user).includes("admin"));
  const [users, setUsers] = useState([]);
  const emptyForm = {
    password: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    phone: "+7",
    role: "manager",
    roles: ["manager"],
    task_roles: [],
    auto_tasks_enabled: true,
    manual_assignment_enabled: true,
  };
  const [form, setForm] = useState({
    password: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    phone: "+7",
    role: "manager",
    roles: ["manager"],
    task_roles: [],
    auto_tasks_enabled: true,
    manual_assignment_enabled: true,
  });
  const [drafts, setDrafts] = useState({});
  const [passwords, setPasswords] = useState({});
  const [panelMode, setPanelMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const fetchUsers = useCallback(async () => {
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
        task_roles: userTaskRoles(user),
        auto_tasks_enabled: user.auto_tasks_enabled,
        manual_assignment_enabled: user.manual_assignment_enabled,
        is_active: user.is_active,
      }])));
    }
  }, []);

  useEffect(() => {
    queueMicrotask(fetchUsers);
  }, [fetchUsers]);

  const fullName = (user) => {
    const parts = [user.last_name, user.first_name, user.middle_name].filter(Boolean);
    return parts.length ? parts.join(" ") : user.full_name || "ФИО не указано";
  };

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
      task_roles: userTaskRoles(user),
      auto_tasks_enabled: user.auto_tasks_enabled,
      manual_assignment_enabled: user.manual_assignment_enabled,
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
        task_roles: form.task_roles,
        auto_tasks_enabled: form.auto_tasks_enabled,
        manual_assignment_enabled: form.manual_assignment_enabled,
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
        task_roles: patch.task_roles ?? userTaskRoles(user),
        auto_tasks_enabled: patch.auto_tasks_enabled ?? user.auto_tasks_enabled,
        manual_assignment_enabled: patch.manual_assignment_enabled ?? user.manual_assignment_enabled,
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
        task_roles: userTaskRoles(user),
        auto_tasks_enabled: user.auto_tasks_enabled,
        manual_assignment_enabled: user.manual_assignment_enabled,
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
      <div className="personnel-detail-panel h-full w-full max-w-2xl overflow-hidden bg-white shadow-2xl">
        {panelMode === "create" ? (
          <form onSubmit={createUser} className="flex h-full flex-col bg-white">
            <div className="z-10 flex shrink-0 flex-col gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div>
                <p className="text-[11px] font-bold text-slate-400">Персонал</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">Новый сотрудник</h3>
                <p className="mt-2 text-sm text-slate-500">Телефон, пароль, роль и контактные данные.</p>
              </div>
              <button type="button" onClick={closePanel} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-slate-50">
                Закрыть
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 p-5 sm:p-6">
              <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-xs font-black text-violet-700">1</span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Личные данные</h4>
                    <p className="mt-1 text-xs font-medium text-slate-400">Так сотрудник будет отображаться в задачах и назначениях.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold text-slate-500">Фамилия <span className="text-rose-500">*</span></label>
                    <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Иванов" className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-bold text-slate-500">Имя <span className="text-rose-500">*</span></label>
                    <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Иван" className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-[11px] font-bold text-slate-500">Отчество <span className="font-medium text-slate-400">— необязательно</span></label>
                    <input value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} placeholder="Иванович" className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-xs font-black text-violet-700">2</span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Вход в систему</h4>
                    <p className="mt-1 text-xs font-medium text-slate-400">Телефон станет логином. Пароль сотрудник сможет использовать сразу.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold text-slate-500">Телефон <span className="text-rose-500">*</span></label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} onBlur={(e) => setForm({ ...form, phone: defaultPhoneInput(e.target.value) })} inputMode="tel" placeholder="+7 900 123-45-67" className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-bold text-slate-500">Временный пароль <span className="text-rose-500">*</span></label>
                    <input required minLength={6} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Не менее 6 символов" className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-xs font-black text-violet-700">3</span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Роли и доступ</h4>
                      <p className="mt-1 text-xs font-medium text-slate-400">Можно выбрать несколько рабочих ролей.</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-xl bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-500">Выбрано: {form.roles.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(ROLE_LABELS).filter(([role]) => currentUserIsAdmin || role !== "admin").map(([role, label]) => {
                    const selected = form.roles.includes(role);
                    return (
                      <label key={role} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition ${selected ? "border-violet-200 bg-violet-50 text-violet-800 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/40"}`}>
                        <input type="checkbox" checked={selected} onChange={() => setForm((current) => {
                          const roles = toggleRole(current.roles, role);
                          return { ...current, roles, role: roles[0] };
                        })} className="h-4 w-4 accent-violet-600" />
                        <span className="min-w-0 flex-1">{label}</span>
                        {selected && <span className="text-[10px] font-black text-violet-600">Выбрано</span>}
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4">
                  <h4 className="text-sm font-black text-slate-900">Получаемые задачи</h4>
                  <p className="mt-1 text-xs font-medium text-slate-400">Очереди задач настраиваются отдельно от прав доступа.</p>
                </div>
                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(TASK_ROLE_LABELS).map(([role, label]) => (
                    <label key={role} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-3.5 py-3 text-sm font-semibold text-slate-600">
                      <input type="checkbox" checked={form.task_roles.includes(role)} onChange={() => setForm((current) => ({
                        ...current,
                        task_roles: current.task_roles.includes(role)
                          ? current.task_roles.filter((item) => item !== role)
                          : [...current.task_roles, role],
                      }))} className="h-4 w-4 accent-blue-600" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <label className="mb-2 flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                  Получает автоматические задачи
                  <input type="checkbox" checked={form.auto_tasks_enabled} onChange={(e) => setForm({ ...form, auto_tasks_enabled: e.target.checked })} className="h-5 w-5 accent-blue-600" />
                </label>
                <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                  Разрешено назначать вручную
                  <input type="checkbox" checked={form.manual_assignment_enabled} onChange={(e) => setForm({ ...form, manual_assignment_enabled: e.target.checked })} className="h-5 w-5 accent-blue-600" />
                </label>
              </section>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-slate-400">Обязательные поля отмечены звёздочкой</span>
                <span className="font-bold text-slate-600">{form.roles.length} {russianCountLabel(form.roles.length, "роль", "роли", "ролей")}</span>
              </div>
              <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-violet-600 bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-md">
                Создать сотрудника <ArrowRight size={17} />
              </button>
            </div>
          </form>
        ) : selectedUser && (
          <form onSubmit={(e) => { e.preventDefault(); updateUser(selectedUser, selectedDraft); }} className="flex h-full flex-col bg-white">
            <div className="personnel-detail-header z-10 flex shrink-0 flex-col gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                <PersonnelAvatar user={selectedUser} size="lg" />
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

            <fieldset disabled={!canEditUser(selectedUser)} className="flex-1 overflow-y-auto bg-slate-50/60 p-5 sm:p-6">
              <div className="flex flex-col gap-5">
                <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4">
                    <h4 className="text-sm font-black text-slate-900">Личные данные</h4>
                    <p className="mt-1 text-xs font-medium text-slate-400">Имя и контакты, которые отображаются в задачах.</p>
                  </div>
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
                </section>

                <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Роли и доступ</h4>
                      <p className="mt-1 text-xs font-medium text-slate-400">Определяют рабочие разделы и доступные действия.</p>
                    </div>
                    <span className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[10px] font-bold ${selectedDraft.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{selectedDraft.is_active ? "Доступ включён" : "Доступ отключён"}</span>
                  </div>
                  <label className={`mb-4 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition ${selectedDraft.is_active ? "border-emerald-100 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
                    <div>
                      <span className="block text-sm font-bold text-slate-800">Вход в систему</span>
                      <span className="mt-1 block text-xs text-slate-500">{selectedDraft.is_active ? "Сотрудник может войти и работать с задачами." : "Вход заблокирован, данные сотрудника сохраняются."}</span>
                    </div>
                    <input type="checkbox" checked={Boolean(selectedDraft.is_active)} onChange={(e) => updateDraft(selectedUser.id, { is_active: e.target.checked })} className="h-5 w-5 shrink-0 accent-emerald-600" />
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Object.entries(ROLE_LABELS).filter(([role]) => currentUserIsAdmin || role !== "admin").map(([role, label]) => {
                      const selected = (selectedDraft.roles || userRoles(selectedUser)).includes(role);
                      return (
                          <label key={role} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition ${selected ? "border-violet-200 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/40"}`}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {
                                const roles = toggleRole(selectedDraft.roles || userRoles(selectedUser), role);
                                updateDraft(selectedUser.id, { roles, role: roles[0] });
                              }}
                              className="h-4 w-4 accent-violet-600"
                            />
                            <span className="min-w-0 flex-1">{label}</span>
                          </label>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4">
                    <h4 className="text-sm font-black text-slate-900">Получаемые задачи</h4>
                    <p className="mt-1 text-xs font-medium text-slate-400">Определяют автоматические очереди и возможность ручного назначения.</p>
                  </div>
                  <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Object.entries(TASK_ROLE_LABELS).map(([role, label]) => {
                      const selected = (selectedDraft.task_roles || []).includes(role);
                      return (
                        <label key={role} className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold ${selected ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"} ${canEditUser(selectedUser) ? "cursor-pointer" : "cursor-default opacity-75"}`}>
                          <input disabled={!canEditUser(selectedUser)} type="checkbox" checked={selected} onChange={() => updateDraft(selectedUser.id, {
                            task_roles: selected
                              ? selectedDraft.task_roles.filter((item) => item !== role)
                              : [...(selectedDraft.task_roles || []), role],
                          })} className="h-4 w-4 accent-blue-600" />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <label className="mb-2 flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                    Получает автоматические задачи
                    <input disabled={!canEditUser(selectedUser)} type="checkbox" checked={Boolean(selectedDraft.auto_tasks_enabled)} onChange={(e) => updateDraft(selectedUser.id, { auto_tasks_enabled: e.target.checked })} className="h-5 w-5 accent-blue-600" />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                    Разрешено назначать вручную
                    <input disabled={!canEditUser(selectedUser)} type="checkbox" checked={Boolean(selectedDraft.manual_assignment_enabled)} onChange={(e) => updateDraft(selectedUser.id, { manual_assignment_enabled: e.target.checked })} className="h-5 w-5 accent-blue-600" />
                  </label>
                </section>

                <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-sm font-bold text-slate-900">Смена пароля</p>
                  <p className="mt-1 text-xs text-slate-400">Введите новый временный пароль длиной не менее 6 символов.</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input type="password" placeholder="Не менее 6 символов" value={passwords[selectedUser.id] || ""} onChange={(e) => setPasswords((current) => ({ ...current, [selectedUser.id]: e.target.value }))} className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                    <button type="button" onClick={() => changePassword(selectedUser)} disabled={savingId === selectedUser.id || !(passwords[selectedUser.id] || "").trim()} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-50">
                      Сменить пароль
                    </button>
                  </div>
                </section>

                {canEditUser(selectedUser) && currentUser?.id !== selectedUser.id && (
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
            </fieldset>

            {canEditUser(selectedUser) && <div className="shrink-0 border-t border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
              <button type="submit" disabled={savingId === selectedUser.id} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-violet-600 bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-md disabled:opacity-50">
                {savingId === selectedUser.id ? "Сохранение..." : "Сохранить изменения"} <ArrowRight size={17} />
              </button>
            </div>}
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
          {canManagePersonnel && <button type="button" onClick={openCreatePanel} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#3F8CFF] bg-[#3F8CFF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#1f78ff] hover:shadow-md">
            Добавить сотрудника
          </button>}
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
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <PersonnelAvatar user={user} />
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
                <div className="flex max-w-full shrink-0 flex-wrap justify-start gap-1.5 sm:max-w-[46%] sm:justify-end">
                  {userRoles(user).slice(0, 3).map((role) => (
                    <span key={role} className="max-w-full truncate rounded-xl border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700">
                      {ROLE_LABELS[role] || role}
                    </span>
                  ))}
                  {userRoles(user).length > 3 && (
                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-500">
                      +{userRoles(user).length - 3}
                    </span>
                  )}
                </div>
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

      {panel && createPortal(panel, document.body)}
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("Панель");
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskChangeVersion, setTaskChangeVersion] = useState(0);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("smart_factory_theme");
    if (savedTheme) return savedTheme;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const workspaceRef = useRef(null);

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
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }, [activePage]);

  useGSAP(() => {
    if (!workspaceRef.current) return;
    gsap.fromTo(
      workspaceRef.current,
      { autoAlpha: 0.82 },
      { autoAlpha: 1, duration: 0.28, ease: "power2.out", clearProps: "opacity,visibility" },
    );
    const cards = workspaceRef.current.querySelectorAll(
      ".live-metric, .live-task-section, .live-areas, .crm-page-card, .dashboard-priority-card, .dashboard-attention-card, .dashboard-kpi-card",
    );
    if (cards.length) {
      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.38, stagger: 0.045, ease: "power2.out", clearProps: "transform,opacity,visibility" },
      );
    }
    const inlineImage = workspaceRef.current.querySelector(".dashboard-inline-image");
    if (inlineImage) {
      gsap.fromTo(
        inlineImage,
        { scale: 0.82, autoAlpha: 0.35 },
        {
          scale: 1,
          autoAlpha: 1,
          ease: "none",
          scrollTrigger: {
            trigger: inlineImage,
            start: "top 92%",
            end: "bottom 22%",
            scrub: 0.6,
          },
        },
      );
    }
    const taskIntro = workspaceRef.current.querySelector(".task-command-copy > p:last-child");
    if (taskIntro) {
      gsap.fromTo(
        taskIntro,
        { autoAlpha: 0.18 },
        {
          autoAlpha: 1,
          ease: "none",
          scrollTrigger: {
            trigger: taskIntro,
            start: "top 92%",
            end: "bottom 62%",
            scrub: 0.5,
          },
        },
      );
    }
    const media = gsap.matchMedia();
    media.add("(min-width: 1101px)", () => {
      const kanbanHeader = workspaceRef.current?.querySelector(".task-kanban-header");
      if (!kanbanHeader) return undefined;
      const trigger = ScrollTrigger.create({
        trigger: kanbanHeader,
        start: "top 72px",
        end: "+=120",
        pin: true,
        pinSpacing: false,
      });
      return () => trigger.kill();
    });
    return () => media.revert();
  }, { scope: workspaceRef, dependencies: [activePage], revertOnUpdate: true });

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
    if (page === "Персонал") return true;
    if (page === "Все задачи") return userHasRole(user, ["manager"]);
    if (["Панель", "Все заявки", "Мои задачи"].includes(page)) return true;
    if (page === "База изделий") return userHasRole(user, ["engineer", "manager", "production", "assembler", "tester", "repair_engineer"]);
    if (page === "Склад ТМЦ") return userHasRole(user, ["warehouse", "manager", "engineer", "procurement", "packer"]);
    if (page === "Склад готовой продукции") return userHasRole(user, ["warehouse", "manager", "production", "packer"]);
    if (page === "Производство") return userHasRole(user, ["warehouse", "manager", "production", "assembler", "tester", "repair_engineer", "packer", "procurement"]);
    return true;
  };

  const openPage = (page) => {
    setActiveTaskId(null);
    setActivePage(canOpen(page) ? page : "Мои задачи");
  };

  const renderContent = () => {
    if (!canOpen(activePage)) return <Dashboard key={taskChangeVersion} user={user} onOpenPage={openPage} onOpenTask={setActiveTaskId} />;

    switch (activePage) {
      case "Панель": return <Dashboard key={taskChangeVersion} user={user} onOpenPage={openPage} onOpenTask={setActiveTaskId} />;
      case "Все заявки": return <ManufacturingPage user={user} onOpenTask={setActiveTaskId} taskChangeVersion={taskChangeVersion} />;
      case "Все задачи": return <AllTasks key={taskChangeVersion} user={user} onOpenPage={openPage} onOpenTask={setActiveTaskId} />;
      case "Мои задачи": return <MyTasks key={`${user.id}-${taskChangeVersion}`} user={user} onOpenPage={openPage} onOpenTask={setActiveTaskId} />;
      case "Персонал": return <Personnel currentUser={user} />;
      case "База изделий": return <GadgetsBase />;
      case "Склад ТМЦ": return <InventoryBase user={user} />;
      case "Склад готовой продукции": return <FinishedGoodsBase user={user} />;
      case "Производство": return <ManufacturingPage user={user} onOpenTask={setActiveTaskId} taskChangeVersion={taskChangeVersion} />;
      default: return <Dashboard key={taskChangeVersion} user={user} onOpenPage={openPage} onOpenTask={setActiveTaskId} />;
    }
  };

  if (booting) return <div className={`min-h-screen app-shell ${theme === "dark" ? "theme-dark" : ""}`} />;
  if (!user) return <LoginPage onLogin={setUser} theme={theme} onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")} />;

  return (
    <div className={`crm-app app-shell ${theme === "dark" ? "theme-dark" : ""}`}>
      <CrmSidebar
        activePage={activePage}
        onOpenPage={openPage}
        user={user}
        onLogout={logout}
        canOpen={canOpen}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="crm-main">
        <CrmTopbar
          onMenu={() => setMobileMenuOpen(true)}
          onOpenPage={openPage}
          activePage={activePage}
          theme={theme}
          onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        />
        <main ref={workspaceRef} className="app-main crm-workspace-content w-full max-w-full overflow-x-hidden">
          {activeTaskId ? (
            <TaskDetailModal
              taskId={activeTaskId}
              user={user}
              onClose={() => setActiveTaskId(null)}
              onChanged={() => setTaskChangeVersion((version) => version + 1)}
            />
          ) : renderContent()}
        </main>
      </div>
    </div>
  );
}
