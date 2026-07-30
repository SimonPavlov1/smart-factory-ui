import React, { useCallback, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { formatYekaterinburgDateTime } from "../dateTime";
// Импортируем ваш локальный ГОСТ шрифт

const monthNames = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];
const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function dateToValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function buildCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

export function CalendarField({ value, onChange, className = "", compact = false, disabled = false, minDate = "" }) {
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 320 });
  const triggerRef = useRef(null);
  const selectedDate = parseDateValue(value);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const days = buildCalendarDays(viewDate);
  const todayValue = dateToValue(new Date());

  const selectDate = (date) => {
    const nextValue = dateToValue(date);
    if (minDate && nextValue < minDate) return;
    onChange(nextValue);
    setOpen(false);
  };

  const toggleCalendar = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(340, window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      const estimatedHeight = 390;
      const top = rect.bottom + estimatedHeight <= window.innerHeight - 12
        ? rect.bottom + 8
        : Math.max(12, rect.top - estimatedHeight - 8);
      setPopoverPosition({ top, left, width });
    }
    setOpen(true);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleCalendar}
        className={`flex w-full items-center justify-between border border-slate-200 bg-white text-left font-semibold text-slate-800 outline-none transition-all hover:border-blue-100 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 ${compact ? "min-h-9 rounded-xl px-3 py-2 text-xs" : "min-h-11 rounded-2xl px-3.5 py-3 text-sm"}`}
      >
        <span>{selectedDate ? selectedDate.toLocaleDateString("ru-RU") : "Выберите дату"}</span>
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
        </svg>
      </button>

      {open && createPortal(
        <>
          <button
            type="button"
            aria-label="Закрыть календарь"
            className="crm-calendar-backdrop fixed inset-0 z-[90] cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            className="crm-calendar-popover fixed z-[100] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl"
            style={{ top: popoverPosition.top, left: popoverPosition.left, width: popoverPosition.width }}
          >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm font-black text-slate-900">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
            {weekDays.map((day) => <div key={day} className="py-1">{day}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((date) => {
              const dateValue = dateToValue(date);
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = value === dateValue;
              const isToday = todayValue === dateValue;
              const isBeforeMin = Boolean(minDate && dateValue < minDate);
              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={isBeforeMin}
                  onClick={() => selectDate(date)}
                  className={`flex h-9 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                    isBeforeMin
                      ? "cursor-not-allowed text-slate-200"
                      : isSelected
                      ? "bg-[#3F8CFF] text-white shadow-sm"
                      : isToday
                      ? "border border-blue-100 bg-blue-50 text-[#3F8CFF]"
                      : isCurrentMonth
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange(todayValue);
                setViewDate(new Date());
                setOpen(false);
              }}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
            >
              Очистить
            </button>
          </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

function ProductOrderSelect({ products, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const selected = products.find((product) => Number(product.id) === Number(value));
  const normalizedQuery = query.trim().toLowerCase();
  const matches = products.filter((product) => (
    `${product.name || ""} ${product.drawing_number || ""} ${product.sku || ""}`
      .toLowerCase()
      .includes(normalizedQuery)
  ));

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      const estimatedHeight = 360;
      const top = rect.bottom + estimatedHeight <= window.innerHeight - 12
        ? rect.bottom + 8
        : Math.max(12, rect.top - estimatedHeight - 8);
      setPosition({ top, left, width });
    }
    setQuery("");
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const choose = (productId) => {
    onChange(String(productId));
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={show}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-3.5 py-2.5 text-left outline-none transition-all focus:ring-4 focus:ring-blue-500/10 ${
          open ? "border-[#3F8CFF]" : "border-slate-200 hover:border-blue-200"
        }`}
      >
        <span className="min-w-0">
          <span className={`block truncate text-sm font-semibold ${selected ? "text-slate-800" : "text-slate-400"}`}>
            {selected?.name || (products.length ? "Выберите изделие" : "База изделий пуста")}
          </span>
          {selected?.drawing_number && (
            <span className="mt-0.5 block truncate font-mono text-[10px] font-bold text-slate-400">
              {selected.drawing_number}
            </span>
          )}
        </span>
        <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <>
          <button
            type="button"
            aria-label="Закрыть список изделий"
            className="fixed inset-0 z-[110] cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            className="manufacturing-product-select fixed z-[120] overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl"
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            <div className="relative p-1">
              <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOpen(false);
                  if (event.key === "Enter" && matches.length === 1) {
                    event.preventDefault();
                    choose(matches[0].id);
                  }
                }}
                placeholder="Название, артикул или децимальный номер"
                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div className="mt-1 max-h-64 space-y-1 overflow-y-auto p-1" role="listbox">
              {matches.map((product) => {
                const isSelected = Number(product.id) === Number(value);
                return (
                  <button
                    key={product.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => choose(product.id)}
                    className={`group flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                      isSelected
                        ? "border-blue-200 bg-blue-50"
                        : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-800">{product.name}</span>
                      <span className="mt-1 block truncate font-mono text-[10px] font-semibold text-slate-400">
                        {product.drawing_number || product.sku || "Без децимального номера"}
                      </span>
                    </span>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${
                      isSelected
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-slate-200 bg-white text-transparent group-hover:text-slate-300"
                    }`}>
                      ✓
                    </span>
                  </button>
                );
              })}
              {matches.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400">
                  Изделие не найдено
                </div>
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

const CANCELLATION_DECISIONS = [
  { value: "returned", title: "Вернуть на склад", description: "Неиспользованные материалы возвращаются в доступный остаток." },
  { value: "accepted_delivery", title: "Принять поставку", description: "Поставку уже нельзя отменить — принимаем и используем позже." },
  { value: "complete", title: "Завершить сборку", description: "Начатое изделие выгоднее закончить и оприходовать." },
  { value: "disassemble", title: "Разобрать изделие", description: "Вернуть пригодные комплектующие на склад." },
  { value: "scrap", title: "Списать", description: "Зафиксировать непригодные материалы или незавершённое изделие." },
  { value: "stopped", title: "Остановить работы", description: "Новых обязательств нет, текущие работы прекращаются." },
];

function CancellationDialog({ mode, item, loading, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState("");
  const [note, setNote] = useState("");
  const isRequest = mode === "request";
  const canSubmit = isRequest ? reason.trim().length >= 3 : Boolean(decision);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-5">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                {isRequest ? "Запросить отмену заказа" : "Как поступить с обязательством?"}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                {isRequest
                  ? "Заказ не удалится мгновенно. Система сначала соберёт незавершённые закупки, материалы и работы."
                  : item?.description}
              </p>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-500 transition hover:bg-slate-50">×</button>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {isRequest ? (
            <div>
              <label className="text-sm font-black text-slate-800">Почему отменяем заказ?</label>
              <textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="Например: клиент отказался от заказа после запуска закупки" />
              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="text-sm font-black text-amber-900">Что произойдёт дальше</div>
                <div className="mt-2 text-sm font-medium leading-6 text-amber-800">Новые работы будут остановлены. Руководитель производства проверит последствия, а ответственным отделам будут созданы задачи на урегулирование.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-flow-dense grid-cols-1 gap-3 md:grid-cols-2">
                {CANCELLATION_DECISIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setDecision(option.value)}
                    className={`group min-h-28 rounded-2xl border p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${decision === option.value ? "border-blue-400 bg-blue-50 ring-4 ring-blue-500/10" : "border-slate-200 bg-white hover:border-blue-200"}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${decision === option.value ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                        {decision === option.value && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      <strong className="text-sm font-black text-slate-900">{option.title}</strong>
                    </span>
                    <span className="mt-2 block pl-8 text-xs font-medium leading-5 text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>
              <label className="mt-5 block text-sm font-black text-slate-800">Комментарий к решению</label>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="Количество, состояние материалов и другие важные детали" />
            </>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-7">
          <button type="button" onClick={onClose} className="min-h-11 rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Вернуться без изменений</button>
          <button type="button" disabled={!canSubmit || loading} onClick={() => onSubmit(isRequest ? { reason: reason.trim() } : { decision, note: note.trim() })} className={`min-h-11 rounded-2xl px-6 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${isRequest ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}>
            {loading ? "Сохраняем..." : isRequest ? "Передать на отмену" : "Зафиксировать решение"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManufacturingPage({ onOpenTask, taskChangeVersion = 0, createRequestVersion = 0, onCreateRequestHandled, user }) {
  const currentRoles = Array.isArray(user?.roles) && user.roles.length ? user.roles : user?.role ? [user.role] : [];
  const currentRolesKey = currentRoles.join("|");
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStats, setOrderStats] = useState({ active: 0, cancelled: 0 });
  const [attentionSummary, setAttentionSummary] = useState({ overdue: 0, shortages: 0, hold: 0, unassigned: 0 });
  const [attentionFilter, setAttentionFilter] = useState("");
  const [products, setProducts] = useState([]);
  const [errorText, setErrorText] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [dailyAssembly, setDailyAssembly] = useState(null);

  // Состояния формы нового заказа
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState("");
  const [selectedItems, setSelectedItems] = useState([{ product_id: "", quantity: 1 }]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Сводная комплектация заказа
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState("");
  const [taskUsersByRole, setTaskUsersByRole] = useState({});
  const [assigningTaskId, setAssigningTaskId] = useState(null);
  const [requiredMaterials, setRequiredMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState("");
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);
  const [isShortagesOpen, setIsShortagesOpen] = useState(false);
  const [isShortagePreviewOpen, setIsShortagePreviewOpen] = useState(false);
  const [orderWorkspaceTab, setOrderWorkspaceTab] = useState("work");
  const [selectedRouteStageKey, setSelectedRouteStageKey] = useState(null);
  const [cancellation, setCancellation] = useState(null);
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [cancellationDialog, setCancellationDialog] = useState(null);
  const [quantityAdjustment, setQuantityAdjustment] = useState(null);
  const [quantityAdjustmentLoading, setQuantityAdjustmentLoading] = useState(false);
  const [quantityAdjustmentError, setQuantityAdjustmentError] = useState("");

  const statusLabels = {
    planned: "Запланирован",
    in_progress: "В работе",
    blocked: "Приостановлен",
    completed: "Готов к отгрузке",
    cancelled: "Отменён",
    cancelled_with_commitments: "Отменён с обязательствами",
    cancellation_requested: "Запрошена отмена",
    settlement: "Урегулирование отмены",
    Created: "Создан",
    "In Progress": "В ожидании",
    Reserved: "Зарезервировано",
    "Procurement Required": "Требуется закупка",
    "Materials Issued": "Выданы комплектующие",
    "In Assembly": "Сборка",
    "Quality Check": "Тестирование",
    "Repair Required": "Требуется ремонт",
    "Ready For Packing": "Готов к упаковке",
    "Finished Goods": "Склад ГП",
    "Ready To Ship": "Готов к отгрузке",
    "Cancellation Requested": "Запрошена отмена",
    "Cancellation Settlement": "Урегулирование отмены",
    Cancelled: "Отменён",
  };

  const stageLabels = {
    not_created: "Не создано",
    assigned: "Назначено",
    in_progress: "В работе",
    done: "Выполнено",
    open: "Открыто",
    waiting_delivery: "Ожидание поставки",
    hold: "На холде",
  };

  const roleLabels = {
    procurement: "Закупщик",
    accounting: "Бухгалтерия",
    warehouse: "Кладовщик",
    assembler: "Сборщик",
    tester: "Тестировщик",
    repair_engineer: "Инженер-наладчик",
    packer: "Упаковщик",
    production_manager: "Руководитель производства",
  };

  const taskStageLabels = {
    procurement_purchase: "Закупка",
    accounting_payment: "Оплата",
    warehouse_receive_components: "Приёмка на склад",
    warehouse_issue_materials: "Выдача комплектующих",
    assembler_receive_materials: "Получение комплектующих",
    assembler_build: "Сборка",
    tester_check: "Тестирование",
    repair_defects: "Ремонт",
    repair_issue_materials: "Выдача на ремонт",
    repair_receive_materials: "Получение для ремонта",
    packer_pack: "Упаковка",
    warehouse_finished_goods: "Склад готовой продукции",
  };

  const cancellationDecisionLabels = {
    returned: "Материалы возвращены на склад",
    accepted_delivery: "Поставку принимаем, несмотря на отмену",
    complete: "Завершить начатую сборку",
    disassemble: "Разобрать незавершённое изделие",
    scrap: "Списать материалы или изделие",
    released: "Резерв снят",
    cancelled: "Обязательство отменено",
    stopped: "Работы остановлены",
  };

  const fieldClass = "w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10";
  const selectClass = `${fieldClass} appearance-none pr-10 font-semibold`;
  const labelClass = "block text-[11px] font-bold text-slate-500 mb-2";
  const primaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#3F8CFF] bg-[#3F8CFF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#1f78ff] hover:shadow-md active:translate-y-0 disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0";
  const neutralButtonClass = "inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0";
  const dangerActionButtonClass = "inline-flex min-h-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition-all duration-150 hover:-translate-y-0.5 hover:bg-rose-100 hover:text-rose-700 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0";
  const dangerButtonClass = "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 transition-all duration-150 hover:-translate-y-0.5 hover:bg-rose-100 hover:text-rose-700 active:translate-y-0 disabled:opacity-30 disabled:hover:translate-y-0";
  const compactFieldClass = "w-full min-h-9 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400";
  const filteredOrders = orders;
  const activeOrdersCount = orderStats.active;
  const cancelledOrdersCount = orderStats.cancelled;
  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / 50));

  const SelectChevron = () => (
    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );

  useEffect(() => {
    if (createRequestVersion > 0) {
      const timer = setTimeout(() => {
        setIsModalOpen(true);
        onCreateRequestHandled?.();
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [createRequestVersion, onCreateRequestHandled]);

  const loadCancellation = async (orderId) => {
    const res = await fetch(`/api/manufacturing/orders/${orderId}/cancellation`);
    if (res.ok) setCancellation(await res.json());
  };

  const requestCancellation = async ({ reason }) => {
    setCancellationLoading(true);
    const res = await fetch(`/api/manufacturing/orders/${activeOrder.id}/cancellation/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setCancellationLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || "Не удалось запросить отмену");
      return;
    }
    setCancellationDialog(null);
    await loadCancellation(activeOrder.id);
    await handleOpenOrder(activeOrder, { background: true, preserveScroll: true });
  };

  const approveCancellation = async () => {
    setCancellationLoading(true);
    const res = await fetch(`/api/manufacturing/orders/${activeOrder.id}/cancellation/approve`, { method: "POST" });
    setCancellationLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || "Не удалось согласовать отмену");
      return;
    }
    await loadCancellation(activeOrder.id);
    await handleOpenOrder(activeOrder, { background: true, preserveScroll: true });
  };

  const resolveCancellationItem = async (item, { decision, note }) => {
    const normalizedDecision = decision === "stopped" && item.obligation_type === "release_reservations" ? "released" : decision;
    setCancellationLoading(true);
    const res = await fetch(`/api/manufacturing/orders/${activeOrder.id}/cancellation/obligations/${item.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: normalizedDecision, note: note || null }),
    });
    setCancellationLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || "Не удалось закрыть обязательство");
      return;
    }
    setCancellationDialog(null);
    await loadCancellation(activeOrder.id);
    await handleOpenOrder(activeOrder, { background: true, preserveScroll: true });
  };

  const openQuantityAdjustment = () => {
    setQuantityAdjustment({
      items: (orderDetail?.items || []).map((item) => ({
        order_item_id: item.id,
        product_name: item.product?.name || `Изделие ID ${item.product_id}`,
        old_quantity: Number(item.quantity || 0),
        quantity: Number(item.quantity || 0),
      })),
      reason: "",
      preview: null,
    });
    setQuantityAdjustmentError("");
  };

  const requestQuantityAdjustmentPreview = async () => {
    if (!quantityAdjustment?.reason?.trim() || quantityAdjustment.reason.trim().length < 3) {
      setQuantityAdjustmentError("Укажите причину изменения");
      return;
    }
    setQuantityAdjustmentLoading(true);
    setQuantityAdjustmentError("");
    const res = await fetch(`/api/manufacturing/orders/${activeOrder.id}/quantity-adjustment/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: quantityAdjustment.reason.trim(),
        items: quantityAdjustment.items.map((item) => ({ order_item_id: item.order_item_id, quantity: Number(item.quantity) })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setQuantityAdjustmentLoading(false);
    if (!res.ok) {
      setQuantityAdjustmentError(data.detail || "Не удалось рассчитать последствия");
      return;
    }
    setQuantityAdjustment((current) => ({ ...current, preview: data }));
  };

  const applyQuantityAdjustment = async () => {
    setQuantityAdjustmentLoading(true);
    setQuantityAdjustmentError("");
    const res = await fetch(`/api/manufacturing/orders/${activeOrder.id}/quantity-adjustment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: quantityAdjustment.reason.trim(),
        items: quantityAdjustment.items.map((item) => ({ order_item_id: item.order_item_id, quantity: Number(item.quantity) })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setQuantityAdjustmentLoading(false);
    if (!res.ok) {
      setQuantityAdjustmentError(data.detail || "Не удалось изменить количество");
      return;
    }
    setQuantityAdjustment(null);
    await handleOpenOrder(activeOrder, { background: true, preserveScroll: true });
    await Promise.all([fetchOrders(), fetchOrderStats()]);
  };

  const fetchOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      setErrorText("");
      const params = new URLSearchParams({
        page: String(ordersPage),
        page_size: "50",
        search: orderSearch.trim(),
        status_group: orderStatusFilter,
        attention: attentionFilter,
      });
      const res = await fetch(`/api/manufacturing/orders?${params}`);
      if (!res.ok) throw new Error(`Статус ${res.status}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setOrdersTotal(Number(res.headers.get("X-Total-Count") || data.length || 0));
    } catch (err) {
      console.error(err);
      setErrorText("Не удалось загрузить список производственных заказов.");
    } finally {
      setOrdersLoading(false);
    }
  }, [attentionFilter, orderSearch, orderStatusFilter, ordersPage]);

  const fetchOrderStats = useCallback(async () => {
    const [activeResponse, cancelledResponse, attentionResponse] = await Promise.all([
      fetch("/api/manufacturing/orders?page=1&page_size=1&status_group=active"),
      fetch("/api/manufacturing/orders?page=1&page_size=1&status_group=cancelled"),
      fetch("/api/manufacturing/orders/attention-summary"),
    ]);
    if (activeResponse.ok && cancelledResponse.ok) {
      setOrderStats({
        active: Number(activeResponse.headers.get("X-Total-Count") || 0),
        cancelled: Number(cancelledResponse.headers.get("X-Total-Count") || 0),
      });
    }
    if (attentionResponse.ok) setAttentionSummary(await attentionResponse.json());
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/production/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        if (data.length > 0) {
          setSelectedItems([{ product_id: data[0].id, quantity: 1 }]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDailyAssembly = useCallback(async () => {
    const roles = currentRolesKey.split("|").filter(Boolean);
    if (!["admin", "manager", "production_manager"].some((role) => roles.includes(role))) return;
    const res = await fetch("/api/tasks/assembly/daily-summary");
    if (res.ok) setDailyAssembly(await res.json());
  }, [currentRolesKey]);

  const handleOpenOrder = async (order, options = {}) => {
    const { background = false, preserveScroll = false } = options;
    const scrollY = preserveScroll ? window.scrollY : null;

    setActiveOrder(order);
    if (!background) {
      setIsMaterialsOpen(false);
      setIsShortagesOpen(false);
      setIsShortagePreviewOpen(false);
      setOrderWorkspaceTab("work");
    }
    if (!background) setOrderDetail(null);
    setOrderDetailError("");
    if (!background) setOrderDetailLoading(true);
    if (!background) setRequiredMaterials([]);
    setMaterialsError("");
    if (!background) setCancellation(null);
    if (!background) setMaterialsLoading(true);

    try {
      const [res, bomRes] = await Promise.all([
        fetch(`/api/manufacturing/orders/${order.id}`),
        fetch(`/api/manufacturing/orders/${order.id}/bom-summary`),
      ]);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setOrderDetailError(data.detail || "Не удалось загрузить заказ");
        return;
      }
      const data = await res.json();
      setOrderDetail(data);
      await loadCancellation(order.id);
      const roles = [...new Set((data.tasks || []).map((task) => task.role).filter(Boolean))];
      const usersByRole = {};
      await Promise.all(roles.map(async (role) => {
        const usersRes = await fetch(`/api/users?role=${encodeURIComponent(role)}`);
        usersByRole[role] = usersRes.ok ? await usersRes.json() : [];
      }));
      setTaskUsersByRole(usersByRole);
      if (bomRes.ok) {
        setRequiredMaterials(await bomRes.json());
      } else {
        const bomData = await bomRes.json().catch(() => ({}));
        setMaterialsError(bomData.detail || "Не удалось загрузить сводную комплектацию");
      }
    } catch (err) {
      console.error(err);
      setOrderDetailError("Ошибка сети при загрузке заказа");
    } finally {
      if (!background) setOrderDetailLoading(false);
      if (!background) setMaterialsLoading(false);
      if (scrollY !== null) {
        requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0, behavior: "auto" }));
      }
    }
  };
  const activeOrderRef = useRef(activeOrder);
  const handleOpenOrderRef = useRef(handleOpenOrder);
  useEffect(() => {
    activeOrderRef.current = activeOrder;
    handleOpenOrderRef.current = handleOpenOrder;
  });

  const assignTask = async (task, userId) => {
    setAssigningTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId ? Number(userId) : null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Не удалось назначить задачу");
        return;
      }
      await handleOpenOrder(activeOrder, { background: true, preserveScroll: true });
    } finally {
      setAssigningTaskId(null);
    }
  };

  const takeTask = async (task) => {
    setAssigningTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}/take`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Не удалось взять задачу в работу");
        return;
      }
      await handleOpenOrder(activeOrder, { background: true, preserveScroll: true });
    } finally {
      setAssigningTaskId(null);
    }
  };

  const setTaskDeadline = async (task, dueDate) => {
    const reason = window.prompt("Укажите причину изменения срока");
    if (!reason?.trim()) return;
    setAssigningTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}/deadline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_date: dueDate || null, reason: reason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Не удалось изменить дедлайн");
        return;
      }
      await handleOpenOrder(activeOrder, { background: true, preserveScroll: true });
    } finally {
      setAssigningTaskId(null);
    }
  };

  // ФУНКЦИЯ ГЕНЕРАЦИИ PDF
  const downloadPDF = async () => {
    if (!activeOrder || !requiredMaterials || requiredMaterials.length === 0) return;

    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF("p", "mm", "a4");

      // Загрузка шрифта
      const response = await fetch("/fonts/Gost_A_naklon.ttf");
      const arrayBuffer = await response.arrayBuffer();
      const fontBase64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      doc.addFileToVFS("GOST.ttf", fontBase64);
      doc.addFont("GOST.ttf", "GOST", "normal");
      doc.setFont("GOST", "normal");

      // --- ШАПКА ДОКУМЕНТА ---
      doc.setFontSize(14);
      doc.text("Ведомость комплектующих заказа", 14, 20);

      doc.setFontSize(10);
      doc.text(`Номер заказа: #${activeOrder.id}`, 14, 30);
      doc.text(`Заказчик: ${activeOrder.customer_name || "Не указан"}`, 14, 35);

      let statusRu = activeOrder.status === "Reserved" ? "Материалы зарезервированы" :
                     activeOrder.status === "In Progress" ? "В ожидании" :
                     activeOrder.status === "Materials Issued" ? "Компоненты выданы" : "В производстве";
      doc.text(`Текущий статус: ${statusRu}`, 14, 40);
      doc.text(`Дата генерации отчета: ${new Date().toLocaleDateString("ru-RU")}`, 14, 45);

      // --- ТАБЛИЦА ---
      autoTable(doc, {
        startY: 52, // Сдвинули таблицу ниже, чтобы освободить место для шапки
        head: [["Изделие", "Сборочная единица", "Поз. обозначение", "Наименование", "Кол."]],
        body: requiredMaterials.map((mat) => [
          mat.device || "-",
          mat.assembly || "-",
          mat.designators || mat.sku || "-",
          mat.name || "-",
          mat.qty || "1",
        ]),
        theme: "grid",
        styles: {
          font: "GOST",
          fontSize: 9,
          lineColor: [0, 0, 0],
          textColor: [0, 0, 0],
          cellPadding: 1.5,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          halign: "center",
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 38 },
          2: { cellWidth: 28, halign: "center" },
          3: { cellWidth: 70 },
          4: { cellWidth: 15, halign: "center" }
        },
        margin: { left: 14, right: 14 },
      });

      doc.save(`Ведомость_Заказ_№${activeOrder.id}.pdf`);
    } catch (error) {
      console.error("Ошибка PDF:", error);
      alert("Ошибка при генерации документа.");
    }
  };

  const downloadExcel = async () => {
    if (!activeOrder || requiredMaterials.length === 0) return;
    try {
      const response = await fetch(`/api/manufacturing/orders/${activeOrder.id}/bom-summary.xlsx`);
      if (!response.ok) throw new Error(`Статус ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Сводная комплектация заказа ${activeOrder.id}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Ошибка Excel:", error);
      alert("Не удалось скачать комплектацию в Excel.");
    }
  };

  const downloadShortagesExcel = async () => {
    if (!activeOrder || !(orderDetail?.shortages || []).length) return;
    try {
      const response = await fetch(`/api/manufacturing/orders/${activeOrder.id}/shortages.xlsx`);
      if (!response.ok) throw new Error(`Статус ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Ведомость недостающих деталей заказ ${activeOrder.id}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Ошибка Excel:", error);
      alert("Не удалось скачать ведомость недостающих деталей.");
    }
  };

  const downloadShortagesPDF = async () => {
    const shortages = orderDetail?.shortages || [];
    if (!activeOrder || shortages.length === 0) return;

    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF("p", "mm", "a4");
      const response = await fetch("/fonts/Gost_A_naklon.ttf");
      const arrayBuffer = await response.arrayBuffer();
      const fontBase64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      doc.addFileToVFS("GOST.ttf", fontBase64);
      doc.addFont("GOST.ttf", "GOST", "normal");
      doc.setFont("GOST", "normal");
      doc.setFontSize(14);
      doc.text("Ведомость недостающих деталей", 14, 20);
      doc.setFontSize(10);
      doc.text(`Заказ: #${activeOrder.id}`, 14, 30);
      doc.text(`Заказчик: ${activeOrder.customer_name || "Не указан"}`, 14, 35);
      doc.text(`Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`, 14, 40);

      autoTable(doc, {
        startY: 47,
        head: [["Комплектующее", "Артикул", "Требуется", "Доступно", "Не хватает"]],
        body: shortages.map((item) => [
          item.component_name || `Компонент ID ${item.component_id}`,
          item.part_number || "—",
          item.required_qty || 0,
          item.available_qty || 0,
          item.shortage_qty || 0,
        ]),
        theme: "grid",
        styles: {
          font: "GOST",
          fontSize: 9,
          lineColor: [0, 0, 0],
          textColor: [0, 0, 0],
          cellPadding: 1.5,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          halign: "center",
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { cellWidth: 72 },
          1: { cellWidth: 38 },
          2: { cellWidth: 24, halign: "right" },
          3: { cellWidth: 24, halign: "right" },
          4: { cellWidth: 24, halign: "right" },
        },
        margin: { left: 14, right: 14 },
      });

      doc.save(`Дефицит_Заказ_№${activeOrder.id}.pdf`);
    } catch (error) {
      console.error("Ошибка PDF:", error);
      alert("Не удалось сформировать PDF ведомости.");
    }
  };

  const openTaskDocument = async (file) => {
    if (!file?.url) return;
    const preview = window.open("about:blank", "_blank");
    if (preview) preview.opener = null;
    try {
      const response = await fetch(`/api${file.url}`);
      if (!response.ok) throw new Error("Не удалось открыть документ");
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      if (preview) preview.location.href = objectUrl;
      else window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      if (preview) preview.close();
      alert(error.message || "Не удалось открыть документ");
    }
  };

  const handleAddItemRow = () => {
    const defaultId = products.length > 0 ? products[0].id : "";
    setSelectedItems([...selectedItems, { product_id: defaultId, quantity: 1 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (selectedItems.length === 1) return;
    const updated = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  const openCreateOrderPanel = () => {
    setCreateError("");
    setIsModalOpen(true);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setCreateError("");
    if (!customerName.trim()) {
      setCreateError("Укажите наименование заказчика");
      return;
    }
    if (plannedDeliveryDate && plannedDeliveryDate < dateToValue(new Date())) {
      setCreateError("Плановая дата поставки не может быть раньше сегодняшнего дня");
      return;
    }
    const hasInvalidItems = selectedItems.some(item => !item.product_id);
    if (hasInvalidItems) {
      setCreateError("Проверьте правильность выбора изделий");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/manufacturing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          planned_delivery_date: plannedDeliveryDate || null,
          items: selectedItems.map(item => ({
            product_id: parseInt(item.product_id),
            quantity: parseInt(item.quantity)
          }))
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setCustomerName("");
        setPlannedDeliveryDate("");
        setCreateError("");
        if (products.length > 0) {
          setSelectedItems([{ product_id: products[0].id, quantity: 1 }]);
        }
        setOrdersPage(1);
        await Promise.all([fetchOrders(), fetchOrderStats()]);
      } else {
        const errorData = await res.json();
        setCreateError(errorData.detail || "Не удалось создать заказ");
      }
    } catch {
      setCreateError("Ошибка сети");
    } finally {
      setCreateLoading(false);
    }
  };

  const inputDate = (value) => {
    if (!value) return "";
    const datePart = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    if (datePart) return datePart[1];
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : dateToValue(date);
  };
  const formatDate = (value) => {
    const date = parseDateValue(inputDate(value));
    return date ? date.toLocaleDateString("ru-RU") : "—";
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchProducts();
      fetchDailyAssembly();
      fetchOrderStats();
    });
  }, [fetchDailyAssembly, fetchOrderStats]);

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 250);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  useEffect(() => {
    if (taskChangeVersion > 0 && activeOrderRef.current) {
      const timer = setTimeout(
        () => handleOpenOrderRef.current(activeOrderRef.current, { background: true, preserveScroll: true }),
        0,
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [taskChangeVersion]);

  const stageClassName = (status) => {
    if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "in_progress") return "border-blue-200 bg-blue-50 text-blue-700";
    if (status === "assigned" || status === "open" || status === "waiting_delivery" || status === "hold") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-200 bg-slate-50 text-slate-400";
  };

  const orderStatusClass = (status) => {
    if (["cancelled", "cancelled_with_commitments"].includes(status)) return "border-rose-200 bg-rose-50 text-rose-700";
    if (["cancellation_requested", "settlement"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
    if (status === "completed") return "border-emerald-100 bg-emerald-50 text-emerald-700";
    if (status === "in_progress") return "border-blue-100 bg-blue-50 text-blue-700";
    if (status === "blocked") return "border-rose-100 bg-rose-50 text-rose-700";
    if (status === "planned") return "border-slate-100 bg-slate-50 text-slate-600";
    if (status === "Materials Issued") return "border-amber-100 bg-amber-50 text-amber-700";
    if (status === "Reserved") return "border-blue-100 bg-blue-50 text-blue-700";
    if (["In Assembly", "Quality Check", "Ready For Packing", "Finished Goods", "Ready To Ship"].includes(status)) {
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    }
    if (status === "Procurement Required" || status === "Repair Required") return "border-rose-100 bg-rose-50 text-rose-700";
    return "border-slate-100 bg-slate-50 text-slate-600";
  };
  const orderStatusDotClass = (status) => {
    if (["cancelled", "cancelled_with_commitments", "blocked"].includes(status)) return "bg-rose-500";
    if (["cancellation_requested", "settlement", "Procurement Required", "Repair Required"].includes(status)) return "bg-amber-500";
    if (["completed", "Ready To Ship"].includes(status)) return "bg-emerald-500";
    if (status === "planned") return "bg-slate-400";
    return "bg-blue-500";
  };

  const getCurrentStage = (detail) => {
    const stages = detail?.stages || [];
    return stages.find((stage) => ["in_progress", "assigned", "open", "waiting_delivery", "hold"].includes(stage.status)) ||
      stages.find((stage) => stage.status !== "done" && stage.status !== "not_created") ||
      stages.find((stage) => stage.status === "not_created") ||
      stages[stages.length - 1];
  };

  const renderMaterialsSummary = (compact = false) => {
    if (materialsLoading) {
      return <p className="py-6 text-center text-sm text-slate-400">Загрузка сводной комплектации...</p>;
    }
    if (materialsError) {
      return <p className="py-6 text-center text-sm text-red-600">{materialsError}</p>;
    }
    if (requiredMaterials.length === 0) {
      return <p className="py-6 text-center text-sm text-slate-400">Комплектующие не найдены.</p>;
    }

    const grouped = requiredMaterials.reduce((acc, item) => {
      const device = item.device || "Готовое изделие";
      const assembly = item.assembly || "Основной состав";
      const category = item.category || "Прочее";
      if (!acc[device]) acc[device] = {};
      if (!acc[device][assembly]) acc[device][assembly] = {};
      if (!acc[device][assembly][category]) acc[device][assembly][category] = [];
      acc[device][assembly][category].push(item);
      return acc;
    }, {});

    return (
      <div className={compact ? "space-y-3" : "space-y-4"}>
        {Object.entries(grouped).map(([device, assemblies]) => (
          <div key={device} className="rounded-2xl border border-slate-100 bg-white p-4">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">{device}</h3>
            {Object.entries(assemblies).map(([assembly, categories]) => (
              <div key={assembly} className="mt-3">
                <h4 className="text-xs font-bold text-slate-600">{assembly}</h4>
                {Object.entries(categories).map(([category, items]) => (
                  <div key={category} className="mt-2">
                    <p className="mb-1 text-[10px] font-bold text-slate-400">{category}</p>
                    <div className="space-y-1">
                      {items.map((mat) => (
                        <div key={mat.id} className="flex justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-800">{mat.name}</span>
                            <span className="block truncate text-[10px] text-slate-400">
                              {mat.item_type === "purchased_product" ? "Покупное изделие/узел" :
                               mat.item_type === "unresolved_purchase" ? "Непривязанная позиция" :
                               "Покупной компонент"}
                              {mat.sku && mat.sku !== "—" ? ` · ${mat.sku}` : ""}
                              {mat.designators ? ` · ${mat.designators}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 font-bold text-slate-800">{mat.qty} шт.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  if (activeOrder && (orderDetail || orderDetailLoading || orderDetailError)) {
    const currentStage = getCurrentStage(orderDetail);
    const allStageTasks = orderDetail?.stages?.flatMap((stage) =>
      (stage.tasks || []).map((task) => ({ ...task, stageTitle: stage.title }))
    ) || [];
    const activeTasks = allStageTasks.filter((task) => !["done", "cancelled"].includes(task.status));
    const completedTasks = allStageTasks.filter((task) => task.status === "done");
    const shortagesCount = orderDetail?.shortages?.length || 0;
    const documentEntries = [];
    const seenDocuments = new Set();
    const addDocument = (file, label, task) => {
      if (!file?.url) return;
      const key = file.id || file.storage_path || file.path || file.url;
      if (seenDocuments.has(key)) return;
      seenDocuments.add(key);
      documentEntries.push({
        key,
        file,
        label,
        taskId: task?.id,
        taskTitle: task?.title,
        createdAt: task?.completed_at || task?.created_at,
      });
    };
    (orderDetail?.tasks || []).forEach((task) => {
      const payload = task.payload || {};
      const completion = payload.completion || {};
      addDocument(payload.invoice_attachment, "Счёт поставщика", task);
      addDocument(completion.invoice_attachment, "Счёт поставщика", task);
      addDocument(payload.payment_order_attachment, "Платёжное поручение", task);
      addDocument(completion.payment_order_attachment, "Платёжное поручение", task);
      addDocument(payload.payment?.payment_order_attachment, "Платёжное поручение", task);
      addDocument(payload.closing_docs_attachment, "Закрывающие документы", task);
      addDocument(completion.closing_docs_attachment, "Закрывающие документы", task);
      (payload.purchases || []).forEach((purchase) => addDocument(purchase.invoice_attachment, "Счёт поставщика", task));
    });
    const tabs = [
      { id: "work", label: "Обзор" },
      { id: "items", label: "Изделия и обеспечение", count: orderDetail?.items?.length || 0 },
      { id: "tasks", label: "Задачи", count: activeTasks.length || null },
      { id: "documents", label: "Документы", count: documentEntries.length || null },
      { id: "materials", label: "Комплектующие", count: shortagesCount || null },
      { id: "history", label: "История" },
    ];
    const nextTask = activeTasks[0] || null;
    const nextTaskAssignee = nextTask?.assigned_user?.full_name || nextTask?.assigned_user?.username || "Не назначен";
    const nextTaskDueDate = nextTask?.due_date ? formatDate(nextTask.due_date) : "Срок не задан";
    const progressPercent = orderDetail?.progress?.percent || 0;
    const plannedQty = orderDetail?.progress?.planned_qty || 0;
    const finishedQty = orderDetail?.progress?.finished_qty || 0;
    const now = new Date();
    const overdueTasks = activeTasks.filter((task) => (
      task.is_overdue
      || (task.due_date && new Date(task.due_date) < now)
    ));
    const unassignedTasks = activeTasks.filter((task) => !task.assigned_user_id && !task.assigned_user);
    const waitingDeliveryTasks = activeTasks.filter((task) => task.status === "waiting_delivery");
    const heldTasks = activeTasks.filter((task) => task.status === "hold");
    const attentionItems = [
      ...(shortagesCount > 0 ? [{
        key: "shortages",
        tone: "rose",
        title: `Не хватает ${shortagesCount} позиций`,
        detail: "Дефицит может остановить следующие производственные этапы.",
        actionLabel: "Быстрый просмотр",
        onClick: () => setIsShortagePreviewOpen(true),
      }] : []),
      ...(overdueTasks.length > 0 ? [{
        key: "overdue",
        tone: "rose",
        title: `Просрочено задач: ${overdueTasks.length}`,
        detail: `${overdueTasks[0].title} · срок ${formatDate(overdueTasks[0].due_date)}`,
        actionLabel: "Открыть задачу",
        onClick: () => onOpenTask?.(overdueTasks[0].id),
      }] : []),
      ...(heldTasks.length > 0 ? [{
        key: "hold",
        tone: "amber",
        title: `На холде: ${heldTasks.length}`,
        detail: heldTasks[0].title,
        actionLabel: "Разобраться",
        onClick: () => onOpenTask?.(heldTasks[0].id),
      }] : []),
      ...(waitingDeliveryTasks.length > 0 ? [{
        key: "delivery",
        tone: "amber",
        title: `Ожидают поставку: ${waitingDeliveryTasks.length}`,
        detail: waitingDeliveryTasks[0].title,
        actionLabel: "Проверить поставку",
        onClick: () => onOpenTask?.(waitingDeliveryTasks[0].id),
      }] : []),
      ...(unassignedTasks.length > 0 ? [{
        key: "unassigned",
        tone: "blue",
        title: `Без исполнителя: ${unassignedTasks.length}`,
        detail: `${unassignedTasks[0].title} · ${roleLabels[unassignedTasks[0].role] || unassignedTasks[0].role || "Роль не указана"}`,
        actionLabel: "Назначить",
        onClick: () => onOpenTask?.(unassignedTasks[0].id),
      }] : []),
    ];
    const itemSupplyRows = (orderDetail?.items || []).map((item) => {
      const matchesItem = (line) => (
        Number(line?.order_item_id) === Number(item.id)
        || (!line?.order_item_id && Number(line?.product_id) === Number(item.product_id))
      );
      const shortageLines = (orderDetail?.shortages || []).filter(matchesItem);
      const purchaseLines = (orderDetail?.tasks || [])
        .filter((task) => task.type === "procurement_purchase")
        .flatMap((task) => task.payload?.purchases || [])
        .filter(matchesItem);
      const relatedTasks = allStageTasks.filter((task) => {
        const context = task.payload?.product_context || {};
        if (Number(context.order_item_id) === Number(item.id)) return true;
        if (!context.order_item_id && Number(context.product_id) === Number(item.product_id)) return true;
        return (task.payload?.product_lines || []).some(matchesItem);
      });
      const currentItemTask = relatedTasks.find((task) => !["done", "cancelled"].includes(task.status))
        || relatedTasks[relatedTasks.length - 1];
      const assembledQty = relatedTasks
        .filter((task) => task.type === "assembler_build")
        .reduce((taskMaximum, task) => {
          const assignmentsQty = (task.payload?.assembly_assignments || [])
            .filter(matchesItem)
            .reduce((sum, assignment) => sum + Number(assignment.produced_qty || 0), 0);
          const serialQty = Object.values(task.payload?.serial_number_statuses || {})
            .filter((status) => ["assembled", "testing", "passed", "repair", "packed", "stocked"].includes(status))
            .length;
          return Math.max(taskMaximum, assignmentsQty, serialQty);
        }, 0);
      const stockedQty = relatedTasks
        .filter((task) => task.type === "warehouse_finished_goods" && task.status === "done")
        .reduce((sum, task) => sum + (task.payload?.finished_goods || [])
          .filter((line) => Number(line.product_id) === Number(item.product_id))
          .reduce((lineSum, line) => lineSum + Number(line.qty || 0), 0), 0);
      return {
        ...item,
        shortagePositions: shortageLines.length,
        shortageQty: shortageLines.reduce((sum, line) => sum + Number(line.shortage_qty || line.qty || 0), 0),
        orderedQty: purchaseLines.reduce((sum, line) => sum + Number(line.qty || 0), 0),
        receivedQty: purchaseLines.reduce((sum, line) => sum + Number(line.received_qty || 0), 0),
        producedQty: Math.min(Math.max(assembledQty, stockedQty), Number(item.quantity || 0)),
        currentStage: currentItemTask?.stageTitle || (stockedQty >= Number(item.quantity || 0) ? "Готовая продукция" : "Ожидает запуска"),
        currentTaskId: currentItemTask?.id || null,
      };
    });
    const taskResultSummary = (task) => {
      const payload = task.payload || {};
      const completion = payload.completion || payload.last_completion || {};
      const sumLines = (lines, key = "qty") => (lines || []).reduce((sum, line) => sum + Number(line?.[key] || 0), 0);
      if (task.type === "procurement_purchase") {
        const purchases = payload.purchases || [];
        return `Оформлено позиций: ${purchases.length} · количество ${sumLines(purchases).toLocaleString("ru-RU")} комп.`;
      }
      if (task.type === "accounting_payment") {
        return completion.payment_ref ? `Оплата: ${completion.payment_ref}` : "Счёт передан после оплаты";
      }
      if (task.type === "warehouse_receive_components") {
        return `Принято ${sumLines(completion.items || payload.received_items).toLocaleString("ru-RU")} комп.`;
      }
      if (task.type === "warehouse_issue_materials") {
        return `Выдано ${sumLines(payload.materials).toLocaleString("ru-RU")} комп.`;
      }
      if (task.type === "assembler_build") {
        const produced = sumLines(completion.daily_entries) || Number(completion.assembled_qty || 0);
        return produced > 0 ? `Собрано ${produced.toLocaleString("ru-RU")} изд.` : "Сборочная операция завершена";
      }
      if (task.type === "tester_check") {
        return `Годных ${Number(completion.passed_qty || 0).toLocaleString("ru-RU")} · брак ${Number(completion.defective_qty || 0).toLocaleString("ru-RU")}`;
      }
      if (task.type === "repair_defects") {
        return completion.work_done || completion.notes || "Ремонт завершён";
      }
      if (task.type === "packer_pack") {
        return `Упаковано ${Number(completion.packed_qty || 0).toLocaleString("ru-RU")} изд.`;
      }
      if (task.type === "warehouse_finished_goods") {
        return `Оприходовано ${sumLines(completion.accepted_goods || payload.finished_goods).toLocaleString("ru-RU")} изд.`;
      }
      return completion.notes || completion.comment || "Задача завершена";
    };
    const historyEvents = [
      ...completedTasks.map((task) => ({
        key: `task-${task.id}`,
        type: "task",
        date: task.completed_at || task.created_at,
        title: task.title,
        stage: task.stageTitle,
        actor: task.assigned_user?.full_name || task.assigned_user?.username || roleLabels[task.role] || "Исполнитель не указан",
        result: taskResultSummary(task),
        task,
        documents: documentEntries.filter((document) => document.taskId === task.id),
      })),
      ...(orderDetail?.created_at ? [{
        key: "order-created",
        type: "created",
        date: orderDetail.created_at,
        title: "Заказ создан",
        stage: "Начало маршрута",
        actor: "Система",
        result: `${orderDetail.items?.length || 0} поз. · ${plannedQty.toLocaleString("ru-RU")} изд.`,
        task: null,
        documents: [],
      }] : []),
    ].sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0));
    const routeStages = orderDetail?.stages || [];
    const selectedRouteStage = routeStages.find((stage) => stage.key === selectedRouteStageKey)
      || currentStage
      || routeStages[0];
    const routeDoneCount = routeStages.filter((stage) => stage.status === "done").length;
    return (
      <div className="workspace-page manufacturing-page relative w-full max-w-none p-4 sm:p-6 lg:p-10">
        <div className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => { setActiveOrder(null); setOrderDetail(null); setOrderDetailError(""); }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#3F8CFF] transition-colors hover:text-[#1f78ff]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Назад к заказам
              </button>
              <div className="flex flex-wrap gap-2">
                {["admin", "manager", "production", "production_manager"].some((role) => currentRoles.includes(role)) && (
                  <button type="button" onClick={openQuantityAdjustment} className={`${neutralButtonClass} min-h-9`}>
                    Изменить количество
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenOrder(activeOrder, { background: true, preserveScroll: true })}
                  disabled={orderDetailLoading}
                  className={`${neutralButtonClass} min-h-9`}
                >
                  Обновить
                </button>
                {!["cancelled", "cancelled_with_commitments"].includes(cancellation?.cancellation_status) &&
                  ["admin", "manager", "production_manager"].some((role) => currentRoles.includes(role)) && (
                  <button type="button" onClick={() => setCancellationDialog({ mode: "request" })} disabled={cancellationLoading || Boolean(cancellation?.cancellation_status)} className={`${dangerActionButtonClass} min-h-9`}>
                    {cancellation?.cancellation_status ? "Отмена обрабатывается" : "Запросить отмену"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-flow-dense grid-cols-1 lg:grid-cols-12">
            <section className="min-w-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_48%)] p-5 sm:p-7 lg:col-span-8">
              <div className="flex flex-wrap items-center gap-3">
                {orderDetail && (
                  <span className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-bold ${orderStatusClass(orderDetail.status)}`}>
                    {statusLabels[orderDetail.status] || orderDetail.status}
                  </span>
                )}
                {currentStage && (
                  <span className="text-xs font-bold text-slate-500">
                    Текущий этап: <span className="text-slate-800">{currentStage.title}</span>
                  </span>
                )}
              </div>
              <h1 className="mt-4 max-w-5xl text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Заказ #{activeOrder.id} · {activeOrder.customer_name || "Заказчик не указан"}
              </h1>
              <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Поставка</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{formatDate(orderDetail?.planned_delivery_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Изделия</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{finishedQty} из {plannedQty}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Активные задачи</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{activeTasks.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Дефицит</p>
                  <p className={`mt-1 text-sm font-black ${shortagesCount ? "text-rose-600" : "text-emerald-700"}`}>
                    {shortagesCount ? `${shortagesCount} поз.` : "Нет"}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Общий прогресс</span>
                  <span className="text-slate-900">{progressPercent}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </section>

            <aside className="flex flex-col justify-between border-t border-slate-100 bg-slate-950 p-5 text-white sm:p-7 lg:col-span-4 lg:border-l lg:border-t-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Следующее действие</p>
                <h2 className="mt-3 text-xl font-black leading-snug">
                  {nextTask ? nextTask.title : "Все работы завершены"}
                </h2>
                {nextTask && (
                  <div className="mt-4 space-y-2 text-xs font-semibold text-slate-300">
                    <p>{nextTask.stageTitle} · задача #{nextTask.id}</p>
                    <p>Ответственный: <span className="text-white">{nextTaskAssignee}</span></p>
                    <p>Срок: <span className="text-white">{nextTaskDueDate}</span></p>
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={!nextTask}
                onClick={() => nextTask && onOpenTask?.(nextTask.id)}
                className="mt-6 min-h-11 w-full rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition duration-200 hover:-translate-y-0.5 hover:bg-blue-500 disabled:translate-y-0 disabled:bg-slate-800 disabled:text-slate-500"
              >
                {nextTask ? "Открыть задачу" : "Работа завершена"}
              </button>
            </aside>
          </div>
        </div>

        {isShortagePreviewOpen && createPortal((
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
            <button
              type="button"
              aria-label="Закрыть просмотр ведомости"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsShortagePreviewOpen(false)}
            />
            <section className="shortage-preview-panel relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-2xl">
              <header className="flex flex-col gap-4 border-b border-rose-100 bg-rose-50/70 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-rose-600">Заказ #{activeOrder.id}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">Ведомость недостающих деталей</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {(orderDetail?.shortages || []).length} поз. требуют закупки или пополнения склада.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShortagePreviewOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-bold text-slate-500 transition hover:bg-slate-50"
                >
                  ×
                </button>
              </header>

              <div className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-black">Комплектующее</th>
                        <th className="px-4 py-3 font-black">Артикул</th>
                        <th className="px-4 py-3 text-right font-black">Требуется</th>
                        <th className="px-4 py-3 text-right font-black">Доступно</th>
                        <th className="px-4 py-3 text-right font-black">Не хватает</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(orderDetail?.shortages || []).map((item) => (
                        <tr key={item.component_id} className="border-t border-slate-100 text-slate-700">
                          <td className="px-4 py-3 font-bold text-slate-900">{item.component_name || `Компонент ID ${item.component_id}`}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{item.part_number || "—"}</td>
                          <td className="px-4 py-3 text-right font-bold">{item.required_qty || 0}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-700">{item.available_qty || 0}</td>
                          <td className="px-4 py-3 text-right font-black text-rose-700">{item.shortage_qty || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white/95 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsShortagePreviewOpen(false);
                    setIsShortagesOpen(true);
                    setOrderWorkspaceTab("materials");
                  }}
                  className={neutralButtonClass}
                >
                  Открыть в комплектации
                </button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={downloadShortagesExcel} className={neutralButtonClass}>Скачать Excel</button>
                  <button type="button" onClick={downloadShortagesPDF} className={primaryButtonClass}>Скачать PDF</button>
                </div>
              </footer>
            </section>
          </div>
        ), document.body)}

        {quantityAdjustment && createPortal((
          <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
            <button type="button" aria-label="Закрыть изменение количества" className="absolute inset-0 cursor-default" onClick={() => setQuantityAdjustment(null)} />
            <section className="quantity-adjustment-panel relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-2xl">
              <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-blue-600">Заказ #{activeOrder.id}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Изменение количества изделий</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Сначала рассчитайте последствия. Изменение не удаляет выполненную работу и складские движения.</p>
                </div>
                <button type="button" onClick={() => setQuantityAdjustment(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-bold text-slate-500">×</button>
              </header>
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="space-y-3">
                  {quantityAdjustment.items.map((item, index) => (
                    <div key={item.order_item_id} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[minmax(0,1fr)_120px_120px] sm:items-end">
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.product_name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">Позиция заказа #{item.order_item_id}</p>
                      </div>
                      <div>
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">Было</span>
                        <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-500">{item.old_quantity} шт.</div>
                      </div>
                      <label>
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">Станет</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) => setQuantityAdjustment((current) => ({
                            ...current,
                            preview: null,
                            items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: event.target.value } : line),
                          }))}
                          className={fieldClass}
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <label className="mt-4 block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">Причина изменения</span>
                  <textarea
                    value={quantityAdjustment.reason}
                    onChange={(event) => setQuantityAdjustment((current) => ({ ...current, reason: event.target.value, preview: null }))}
                    className={`${fieldClass} min-h-24 py-3`}
                    placeholder="Например: клиент уменьшил количество по дополнительному соглашению"
                  />
                </label>
                {quantityAdjustmentError && <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{quantityAdjustmentError}</div>}
                {quantityAdjustment.preview && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <h3 className="text-sm font-black text-slate-900">Последствия изменения</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {quantityAdjustment.preview.lines.map((line) => (
                        <div key={line.order_item_id} className="grid gap-3 p-4 text-xs sm:grid-cols-[minmax(0,1fr)_repeat(4,120px)] sm:items-center">
                          <div className="font-black text-slate-900">{line.product_name}</div>
                          <div><span className="text-slate-400">Изменение</span><p className={`mt-1 font-black ${line.delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>{line.delta > 0 ? "+" : ""}{line.delta} шт.</p></div>
                          <div><span className="text-slate-400">В производстве</span><p className="mt-1 font-black text-slate-800">{line.locked_wip_qty}</p></div>
                          <div><span className="text-slate-400">Свободный склад</span><p className="mt-1 font-black text-violet-700">{line.surplus_to_free_stock}</p></div>
                          <div><span className="text-slate-400">Снять из плана</span><p className="mt-1 font-black text-slate-800">{line.planned_units_to_remove}</p></div>
                        </div>
                      ))}
                    </div>
                    {quantityAdjustment.preview.return_materials?.length > 0 && (
                      <div className="border-t border-amber-100 bg-amber-50 p-4">
                        <p className="text-sm font-black text-amber-900">Будет создана задача возврата комплектующих</p>
                        <p className="mt-1 text-xs font-semibold text-amber-700">
                          {quantityAdjustment.preview.return_materials.length} поз. · {quantityAdjustment.preview.return_materials_total} шт. необходимо фактически вернуть на склад.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white/95 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <button type="button" onClick={() => setQuantityAdjustment(null)} className={neutralButtonClass}>Отмена</button>
                {!quantityAdjustment.preview ? (
                  <button type="button" disabled={quantityAdjustmentLoading} onClick={requestQuantityAdjustmentPreview} className={primaryButtonClass}>
                    {quantityAdjustmentLoading ? "Расчёт..." : "Рассчитать последствия"}
                  </button>
                ) : (
                  <button type="button" disabled={quantityAdjustmentLoading} onClick={applyQuantityAdjustment} className={primaryButtonClass}>
                    {quantityAdjustmentLoading ? "Применение..." : "Подтвердить изменение"}
                  </button>
                )}
              </footer>
            </section>
          </div>
        ), document.body)}

        {cancellation?.cancellation_status && (
          <section className="mb-6 rounded-3xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Отмена заказа</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {cancellation.cancellation_status === "cancellation_requested" ? "Ожидает решения руководителя" :
                    cancellation.cancellation_status === "settlement" ? "Урегулирование обязательств" :
                    cancellation.cancellation_status === "cancelled_with_commitments" ? "Отменён с обязательствами" : "Заказ отменён"}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-600">Причина: {cancellation.reason || "—"}</p>
              </div>
              {cancellation.cancellation_status === "cancellation_requested" &&
                ["admin", "production_manager"].some((role) => currentRoles.includes(role)) && (
                <button type="button" onClick={approveCancellation} disabled={cancellationLoading} className={primaryButtonClass}>Согласовать отмену</button>
              )}
            </div>
            {cancellation.obligations?.length > 0 && (
              <>
                <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-black text-blue-950">Создано задач по отмене: {cancellation.obligations.length}</div>
                    <div className="mt-1 text-xs font-semibold text-blue-700">Каждое обязательство ниже — отдельная рабочая задача ответственного отдела.</div>
                  </div>
                  <button type="button" onClick={() => onOpenTask?.(cancellation.obligations[0]?.task_id)} className="min-h-10 shrink-0 rounded-xl bg-blue-600 px-4 text-xs font-black text-white transition hover:bg-blue-700">
                    Открыть первую задачу
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {cancellation.obligations.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-amber-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{item.description}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Ответственный: {roleLabels[item.responsible_role] || item.responsible_role}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                        {item.status === "resolved" ? "Закрыто" : "Требует решения"}
                      </span>
                    </div>
                    {item.status !== "resolved" && cancellation.cancellation_status === "settlement" && (
                      <button type="button" onClick={() => setCancellationDialog({ mode: "resolve", item })} disabled={cancellationLoading} className={`${neutralButtonClass} mt-4`}>Выбрать решение</button>
                    )}
                    {item.task_id && (
                      <button type="button" onClick={() => onOpenTask?.(item.task_id)} className={`${neutralButtonClass} mt-4 ml-2`}>
                        Открыть задачу #{item.task_id}
                      </button>
                    )}
                    {item.resolution?.decision && <div className="mt-3 text-xs font-semibold text-slate-500">Решение: {cancellationDecisionLabels[item.resolution.decision] || "Решение зафиксировано"}{item.resolution.note ? ` · ${item.resolution.note}` : ""}</div>}
                  </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {cancellationDialog && (
          <CancellationDialog
            mode={cancellationDialog.mode}
            item={cancellationDialog.item}
            loading={cancellationLoading}
            onClose={() => setCancellationDialog(null)}
            onSubmit={(payload) => cancellationDialog.mode === "request"
              ? requestCancellation(payload)
              : resolveCancellationItem(cancellationDialog.item, payload)}
          />
        )}

        {orderDetailLoading ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400">
            Загрузка заказа...
          </div>
        ) : orderDetailError ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">{orderDetailError}</div>
        ) : (
          <>
            <div className="mb-6 overflow-x-auto border-b border-slate-200">
              <div className="flex min-w-max gap-7 px-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOrderWorkspaceTab(tab.id)}
                    className={`relative flex min-h-12 items-center gap-2 text-sm font-bold transition-colors ${
                      orderWorkspaceTab === tab.id ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                    {tab.count ? (
                      <span className={`rounded-lg px-2 py-0.5 text-[11px] ${
                        tab.id === "materials" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        {tab.count}
                      </span>
                    ) : null}
                    {orderWorkspaceTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />}
                  </button>
                ))}
              </div>
            </div>

            {orderWorkspaceTab === "work" && (
              <div className="mb-6 grid grid-cols-1 gap-6">
                <div className="space-y-6">
                  {attentionItems.length > 0 ? (
                    <section className="order-attention-panel overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
                      <div className="order-attention-heading flex flex-col gap-2 border-b border-rose-100 bg-rose-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                          <h2 className="order-attention-title text-lg font-black text-rose-950">Требует внимания</h2>
                          <p className="order-attention-subtitle mt-1 text-xs font-semibold text-rose-700">Отклонения, которые могут задержать выполнение заказа</p>
                        </div>
                        <span className="order-attention-count w-fit rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-700">
                          {attentionItems.length}
                        </span>
                      </div>
                      <div className="grid grid-flow-dense grid-cols-1 md:grid-cols-2">
                        {attentionItems.map((item) => {
                          const toneClasses = item.tone === "rose"
                            ? "bg-rose-500 text-white"
                            : item.tone === "amber"
                              ? "bg-amber-400 text-amber-950"
                              : "bg-blue-500 text-white";
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={item.onClick}
                              className="order-attention-item group grid min-h-28 grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 border-b border-r border-slate-100 p-4 text-left transition hover:bg-slate-50 sm:p-5"
                            >
                              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black ${toneClasses}`}>!</span>
                              <span className="min-w-0">
                                <span className="order-attention-item-title block text-sm font-black text-slate-900">{item.title}</span>
                                <span className="order-attention-item-detail mt-1 block text-xs font-semibold leading-5 text-slate-500">{item.detail}</span>
                              </span>
                              <span className="order-attention-item-action self-center whitespace-nowrap text-xs font-black text-blue-600 transition group-hover:translate-x-0.5">
                                {item.actionLabel} →
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : (
                    <section className="order-attention-clear flex items-center gap-4 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 font-black text-white">✓</span>
                      <div>
                        <h2 className="order-attention-clear-title text-sm font-black text-emerald-950">Явных блокировок нет</h2>
                        <p className="order-attention-clear-detail mt-1 text-xs font-semibold text-emerald-700">Дефицит, просрочки, холды и задачи без исполнителя не обнаружены.</p>
                      </div>
                    </section>
                  )}

                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">Ключевые задачи</h2>
                        <p className="mt-1 text-sm text-slate-500">{activeTasks.length ? `Показаны ближайшие из ${activeTasks.length} активных задач` : "Активных задач нет"}</p>
                      </div>
                      {activeTasks.length > 4 && (
                        <button type="button" onClick={() => setOrderWorkspaceTab("tasks")} className="text-xs font-black text-blue-600 hover:text-blue-800">
                          Все задачи →
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {activeTasks.slice(0, 4).map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onOpenTask?.(task.id)}
                          className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 text-left first:pt-1 last:pb-1 sm:grid-cols-[minmax(0,1fr)_160px_120px]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900 transition group-hover:text-blue-600">{task.title}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">{task.stageTitle} · Задача #{task.id}</p>
                          </div>
                          <div className="hidden text-sm font-semibold text-slate-600 sm:block">
                            {task.assigned_user?.full_name || task.assigned_user?.username || "Не назначен"}
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-bold ${stageClassName(task.status)}`}>
                              {stageLabels[task.status] || task.status}
                            </span>
                            <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatDate(task.due_date)}</p>
                          </div>
                        </button>
                      ))}
                      {!activeTasks.length && (
                        <div className="py-8 text-center text-sm font-semibold text-slate-400">Все задачи по заказу завершены</div>
                      )}
                    </div>
                  </section>
                </div>

              </div>
            )}

            {orderWorkspaceTab === "tasks" && (
              <section className="order-task-register mb-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Задачи заказа</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Полный рабочий список, сгруппированный по производственным этапам.</p>
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    Активных {activeTasks.length} · завершено {completedTasks.length}
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {(orderDetail?.stages || []).filter((stage) => stage.tasks?.length > 0).map((stage) => (
                    <div key={stage.key} className="p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">{stage.title}</h3>
                          <p className="mt-1 text-[11px] font-semibold text-slate-400">{stage.tasks.length} задач</p>
                        </div>
                        <span className={`rounded-xl border px-2.5 py-1 text-[11px] font-bold ${stageClassName(stage.status)}`}>
                          {stageLabels[stage.status] || stage.status}
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-2xl border border-slate-100">
                        <table className="w-full min-w-[760px] text-left text-xs">
                          <tbody>
                            {stage.tasks.map((task) => (
                              <tr key={task.id} className="border-t border-slate-100 first:border-t-0 hover:bg-slate-50/70">
                                <td className="px-4 py-3">
                                  <p className="font-black text-slate-900">{task.title}</p>
                                  <p className="mt-1 text-[11px] font-semibold text-slate-400">Задача #{task.id} · {roleLabels[task.role] || task.role}</p>
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-600">
                                  {task.assigned_user?.full_name || task.assigned_user?.username || "Не назначен"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`inline-flex rounded-xl px-2.5 py-1 font-bold ${stageClassName(task.status)}`}>
                                    {stageLabels[task.status] || task.status}
                                  </span>
                                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatDate(task.due_date)}</p>
                                </td>
                                <td className="w-28 px-4 py-3 text-right">
                                  <button type="button" onClick={() => onOpenTask?.(task.id)} className="font-black text-blue-600 hover:text-blue-800">Открыть →</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {orderWorkspaceTab === "documents" && (
              <section className="order-documents-panel mb-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <h2 className="text-lg font-black text-slate-900">Документы заказа</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Счета, платёжные поручения и закрывающие документы из всех задач заказа.</p>
                </div>
                {documentEntries.length > 0 ? (
                  <div className="grid grid-flow-dense grid-cols-1 md:grid-cols-2">
                    {documentEntries.map((document) => (
                      <article key={document.key} className="border-b border-r border-slate-100 p-5">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xs font-black text-blue-700">PDF</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-slate-900">{document.label}</p>
                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{document.file.original_name || "Документ без названия"}</p>
                            <p className="mt-2 text-[11px] font-semibold text-slate-400">
                              {document.taskTitle || "Задача"}{document.createdAt ? ` · ${new Date(document.createdAt).toLocaleDateString("ru-RU")}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={() => openTaskDocument(document.file)} className={`${primaryButtonClass} min-h-9 px-3 py-2 text-xs`}>Открыть документ</button>
                          {document.taskId && (
                            <button type="button" onClick={() => onOpenTask?.(document.taskId)} className={`${neutralButtonClass} min-h-9 px-3 py-2 text-xs`}>Исходная задача</button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-sm font-black text-slate-700">Документов пока нет</p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">Они появятся здесь после загрузки в задачах закупки, оплаты и приёмки.</p>
                  </div>
                )}
              </section>
            )}

            {orderWorkspaceTab === "items" && (
            <section className="order-supply-table mb-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Изделия и обеспечение</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">План выпуска, состояние закупки комплектующих и текущий производственный этап.</p>
                </div>
                <div className="text-xs font-semibold text-slate-400">Поставка {formatDate(orderDetail.planned_delivery_date)}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-xs">
                  <thead className="bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Изделие</th>
                      <th className="px-4 py-3 text-right">План</th>
                      <th className="px-4 py-3 text-right">Дефицит</th>
                      <th className="px-4 py-3 text-right">Заказано</th>
                      <th className="px-4 py-3 text-right">Получено</th>
                      <th className="px-4 py-3 text-right">Изготовлено</th>
                      <th className="px-4 py-3">Текущий этап</th>
                      <th className="w-28 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {itemSupplyRows.map((item) => {
                      const productionPercent = Number(item.quantity || 0)
                        ? Math.round((Number(item.producedQty || 0) / Number(item.quantity)) * 100)
                        : 0;
                      return (
                        <tr key={item.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <p className="font-black text-slate-900">{item.product?.name || `Изделие ID ${item.product_id}`}</p>
                            <p className="mt-1 font-mono text-[11px] text-slate-400">{item.product?.drawing_number || item.product?.sku || "Без обозначения"}</p>
                          </td>
                          <td className="px-4 py-4 text-right font-black text-slate-900">{item.quantity} шт.</td>
                          <td className="px-4 py-4 text-right">
                            {item.shortagePositions > 0 ? (
                              <span className="font-black text-rose-700">
                                {item.shortagePositions} поз. · {Number(item.shortageQty || 0).toLocaleString("ru-RU")} комп.
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-700">Нет</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-blue-700">{Number(item.orderedQty || 0).toLocaleString("ru-RU")} комп.</td>
                          <td className="px-4 py-4 text-right font-bold text-emerald-700">{Number(item.receivedQty || 0).toLocaleString("ru-RU")} комп.</td>
                          <td className="px-4 py-4 text-right">
                            <div className="font-black text-slate-900">{Number(item.producedQty || 0).toLocaleString("ru-RU")} из {item.quantity}</div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(productionPercent, 100)}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-2.5 py-1.5 font-bold text-blue-700">{item.currentStage}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              disabled={!item.currentTaskId}
                              onClick={() => item.currentTaskId && onOpenTask?.(item.currentTaskId)}
                              className="font-black text-blue-600 transition hover:text-blue-800 disabled:text-slate-300"
                            >
                              {item.currentTaskId ? "Открыть →" : "—"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-semibold text-slate-400">
                «План» и «Изготовлено» указаны в изделиях; дефицит, заказ и приёмка — в единицах комплектующих.
              </div>
            </section>
            )}

            {orderWorkspaceTab === "items-legacy" && (
            <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]">
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400">Паспорт заказа</p>
                    <h2 className="mt-1 text-lg font-black text-slate-900">Основная информация</h2>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#3F8CFF]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-3">
                  {currentStage && (
                    <div className={`rounded-2xl border p-4 ${stageClassName(currentStage.status)}`}>
                      <p className="text-[11px] font-bold opacity-70">Текущий этап</p>
                      <p className="mt-1 text-sm font-black">{currentStage.title}</p>
                      <p className="mt-1 text-xs font-semibold opacity-75">{stageLabels[currentStage.status] || currentStage.status}</p>
                    </div>
                  )}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                    <p className="text-[11px] font-bold text-slate-400">Статус</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{statusLabels[orderDetail.status] || orderDetail.status}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                    <p className="text-[11px] font-bold text-slate-400">Заказчик</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{orderDetail.customer_name || "Не указан"}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                      <p className="text-[11px] font-bold text-slate-400">Дата создания</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {formatYekaterinburgDateTime(orderDetail.created_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                      <p className="text-[11px] font-bold text-slate-400">Плановая поставка</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{formatDate(orderDetail.planned_delivery_date)}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-1">
                  <p className="text-[11px] font-bold text-slate-400">Состав заказа</p>
                  <h2 className="text-lg font-black text-slate-900">Изделия в заказе</h2>
                </div>
                <div className="space-y-2">
                  {orderDetail.items?.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{item.product?.name || `Изделие ID ${item.product_id}`}</p>
                        {item.product?.drawing_number && <p className="mt-1 truncate font-mono text-xs text-slate-400">{item.product.drawing_number}</p>}
                      </div>
                      <span className="w-fit shrink-0 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">{item.quantity} шт.</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            )}

            {orderWorkspaceTab === "materials" && (
            <>
            <section className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400">Комплектация</p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">Сводная комплектация</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {isMaterialsOpen ? "Комплектующие и покупные позиции по изделиям заказа." : "Список скрыт — раскройте его при необходимости."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setIsMaterialsOpen((current) => !current)}
                    className={neutralButtonClass}
                  >
                    {isMaterialsOpen ? "Скрыть" : "Показать комплектацию"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadExcel}
                    disabled={materialsLoading || requiredMaterials.length === 0}
                    className={`${neutralButtonClass} disabled:opacity-50`}
                  >
                    Скачать Excel
                  </button>
                  <button
                    type="button"
                    onClick={downloadPDF}
                    disabled={materialsLoading || requiredMaterials.length === 0}
                    className={`${neutralButtonClass} disabled:opacity-50`}
                  >
                    PDF
                  </button>
                </div>
              </div>
              {isMaterialsOpen && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  {renderMaterialsSummary(true)}
                </div>
              )}
            </section>

            <section className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className={`${isShortagesOpen ? "mb-5" : ""} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                <div>
                  <p className="text-[11px] font-bold text-slate-400">Дефицит</p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">Ведомость недостающих деталей</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {(orderDetail.shortages || []).length > 0
                      ? `Не хватает ${(orderDetail.shortages || []).length} позиций. Список скрыт по умолчанию.`
                      : "Текущего дефицита комплектующих нет."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setIsShortagesOpen((current) => !current)}
                    disabled={(orderDetail.shortages || []).length === 0}
                    className={`${neutralButtonClass} disabled:opacity-50`}
                  >
                    {isShortagesOpen ? "Скрыть" : "Показать ведомость"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadShortagesExcel}
                    disabled={(orderDetail.shortages || []).length === 0}
                    className={`${neutralButtonClass} disabled:opacity-50`}
                  >
                    Скачать Excel
                  </button>
                </div>
              </div>
              {isShortagesOpen && (orderDetail.shortages || []).length > 0 && (
                <div className="shortages-table-scroll overflow-x-auto rounded-2xl border border-rose-100 bg-white">
                  <table className="shortages-table w-full min-w-[760px] text-left text-xs">
                    <colgroup>
                      <col className="w-[38%]" />
                      <col className="w-[22%]" />
                      <col className="w-[13.33%]" />
                      <col className="w-[13.33%]" />
                      <col className="w-[13.34%]" />
                    </colgroup>
                    <thead className="bg-rose-50 text-rose-700">
                      <tr>
                        <th className="px-3 py-3 font-black">Комплектующее</th>
                        <th className="px-3 py-3 font-black">Артикул</th>
                        <th className="px-3 py-3 text-right font-black">Требуется</th>
                        <th className="px-3 py-3 text-right font-black">Доступно</th>
                        <th className="px-3 py-3 text-right font-black">Не хватает</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(orderDetail.shortages || []).map((item) => (
                        <tr key={item.component_id} className="border-t border-rose-50 text-slate-700">
                          <td className="px-3 py-3 font-semibold">{item.component_name || `Компонент ID ${item.component_id}`}</td>
                          <td className="px-3 py-3 font-mono text-slate-500">{item.part_number || "—"}</td>
                          <td className="px-3 py-3 text-right font-bold">{item.required_qty || 0}</td>
                          <td className="px-3 py-3 text-right font-bold text-amber-700">{item.available_qty || 0}</td>
                          <td className="px-3 py-3 text-right font-black text-rose-700">{item.shortage_qty || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            </>
            )}

            {orderWorkspaceTab === "history" && (
              <section className="order-history-timeline overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">История заказа</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Зафиксированные действия, результаты, исполнители и документы.</p>
                  </div>
                  <div className="text-xs font-bold text-slate-400">{historyEvents.length} событий</div>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-slate-200">
                    {historyEvents.map((event) => (
                      <article key={event.key} className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-4 pb-6 last:pb-0">
                        <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl border-4 border-white text-xs font-black ${
                          event.type === "created" ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                        }`}>
                          {event.type === "created" ? "+" : "✓"}
                        </span>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-blue-100 hover:bg-white">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{event.stage}</p>
                              <h3 className="mt-1 text-sm font-black text-slate-900">{event.title}</h3>
                              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{event.result}</p>
                            </div>
                            <div className="shrink-0 text-left sm:text-right">
                              <p className="text-xs font-black text-slate-700">{event.actor}</p>
                              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                {event.date ? formatYekaterinburgDateTime(event.date) : "Дата не указана"}
                              </p>
                            </div>
                          </div>
                          {(event.task || event.documents.length > 0) && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                              {event.task && (
                                <button type="button" onClick={() => onOpenTask?.(event.task.id)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-blue-600 transition hover:border-blue-200">
                                  Задача #{event.task.id}
                                </button>
                              )}
                              {event.documents.map((document) => (
                                <button key={document.key} type="button" onClick={() => openTaskDocument(document.file)} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-black text-blue-700 transition hover:bg-blue-100">
                                  {document.label}: {document.file.original_name || "открыть"}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                    {!historyEvents.length && <div className="py-8 text-center text-sm font-semibold text-slate-400">Событий пока нет</div>}
                  </div>
                </div>
              </section>
            )}

            {orderWorkspaceTab === "work" && (
            <section className="order-route rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Маршрут заказа</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Завершено {routeDoneCount} из {routeStages.length} этапов. Нажмите на этап, чтобы раскрыть задачи.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenOrder(activeOrder, { background: true, preserveScroll: true })}
                  disabled={orderDetailLoading}
                  className={neutralButtonClass}
                >
                  Обновить
                </button>
              </div>

              <div className="order-route-steps overflow-x-auto pb-2">
                <div className="flex min-w-max items-start md:min-w-0">
                  {routeStages.map((stage, index) => {
                    const isSelected = selectedRouteStage?.key === stage.key;
                    const isDone = stage.status === "done";
                    const isProblem = ["hold", "waiting_delivery"].includes(stage.status);
                    const isActive = ["in_progress", "assigned", "open"].includes(stage.status);
                    return (
                      <button
                        key={stage.key}
                        type="button"
                        onClick={() => setSelectedRouteStageKey(stage.key)}
                        className={`group relative w-36 shrink-0 rounded-2xl px-2 py-3 text-center transition md:min-w-0 md:flex-1 ${
                          isSelected ? "bg-blue-50 ring-2 ring-blue-500/20" : "hover:bg-slate-50"
                        }`}
                      >
                        {index < routeStages.length - 1 && (
                          <span className={`pointer-events-none absolute left-1/2 top-8 h-0.5 w-full ${
                            isDone ? "bg-emerald-400" : "bg-slate-200"
                          }`} />
                        )}
                        <span className={`relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black transition ${
                            isDone
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : isProblem
                                ? "border-amber-500 bg-amber-50 text-amber-700"
                                : isActive
                                  ? "border-blue-500 bg-blue-500 text-white shadow-[0_0_0_5px_rgba(59,130,246,0.12)]"
                                  : "border-slate-200 bg-white text-slate-400"
                        }`}>
                          {isDone ? "✓" : index + 1}
                        </span>
                        <span className={`mt-3 flex min-h-8 items-start justify-center text-xs font-black leading-4 ${
                          isSelected ? "text-blue-700" : "text-slate-700"
                        }`}>
                          {stage.title}
                        </span>
                        <span className="mt-1 block text-[10px] font-bold text-slate-400">
                          {stageLabels[stage.status] || stage.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="order-route-detail mt-5">
                {routeStages.filter((stage) => stage.key === selectedRouteStage?.key).map((stage, index) => (
                  <div key={stage.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-xs font-black ${stageClassName(stage.status)}`}>
                        {(routeStages.findIndex((item) => item.key === stage.key) || index) + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900">{stage.title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{stage.description}</p>
                        <span className={`mt-3 inline-flex rounded-xl border px-2 py-1 text-[11px] font-bold ${stageClassName(stage.status)}`}>
                          {stageLabels[stage.status] || stage.status}
                        </span>
                      </div>
                    </div>

                    {stage.tasks?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {stage.tasks.map((task) => (
                          <div key={task.id} className="rounded-2xl border border-white/80 bg-white/85 p-3 text-slate-700 shadow-sm">
                            <p className="text-xs font-bold text-slate-900">{task.title}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-400">
                              {roleLabels[task.role] || task.role} · {stageLabels[task.status] || task.status}
                            </p>
                            <p className="mt-2 text-[11px] text-slate-500">
                              Исполнитель: <span className="font-bold text-slate-700">{task.assigned_user?.full_name || task.assigned_user?.username || "не назначен"}</span>
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Дедлайн: <span className="font-bold text-slate-700">{formatDate(task.due_date)}</span>
                            </p>
                            {task.completed_at && (
                              <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                                Выполнено: {formatYekaterinburgDateTime(task.completed_at)}
                              </p>
                            )}
                            {task.status !== "done" && (
                              <div className="mt-3 grid grid-cols-1 gap-2">
                                <div className="relative">
                                  <select
                                    value={task.assigned_user_id || ""}
                                    disabled={assigningTaskId === task.id}
                                    onChange={(e) => assignTask(task, e.target.value)}
                                    className={`${compactFieldClass} appearance-none pr-8`}
                                  >
                                    <option value="">Назначить сотрудника</option>
                                    {(taskUsersByRole[task.role] || []).map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.full_name || user.username}
                                      </option>
                                    ))}
                                  </select>
                                  <SelectChevron />
                                </div>
                                <CalendarField
                                  value={inputDate(task.due_date)}
                                  disabled={assigningTaskId === task.id}
                                  onChange={(value) => setTaskDeadline(task, value)}
                                  compact
                                />
                                {["assigned", "open"].includes(task.status) && (
                                  <button
                                    type="button"
                                    disabled={assigningTaskId === task.id}
                                    onClick={() => takeTask(task)}
                                    className={`${primaryButtonClass} min-h-9 px-3 py-2 text-xs`}
                                  >
                                    Взять в работу
                                  </button>
                                )}
                              </div>
                            )}
                            {onOpenTask && (
                              <button
                                type="button"
                                onClick={() => onOpenTask(task.id)}
                                className={`${neutralButtonClass} mt-3 min-h-9 w-full px-3 py-2 text-xs`}
                              >
                                Открыть задачу
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="workspace-page manufacturing-page relative w-full max-w-none p-4 sm:p-6 lg:p-8">
      <section className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.11),transparent_42%)] p-5 sm:p-7 lg:col-span-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-4xl">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">Производство</h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  Заказы, сроки, комплектация и фактический выпуск в одном рабочем пространстве.
                </p>
              </div>
              <button onClick={() => { fetchOrders(); fetchOrderStats(); }} className={neutralButtonClass}>Обновить</button>
            </div>
          </div>
          <aside className="flex flex-col justify-between bg-slate-950 p-5 text-white sm:p-7 lg:col-span-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Реестр заказов</p>
              <p className="mt-3 text-3xl font-black">{ordersTotal.toLocaleString("ru-RU")}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">заказов с учётом архива и отменённых</p>
            </div>
            <button onClick={openCreateOrderPanel} className="mt-6 min-h-11 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-500">
              Создать заявку
            </button>
          </aside>
        </div>
        <div className="grid grid-flow-dense grid-cols-2 border-t border-slate-100 md:grid-cols-4">
          {[
            ["Всего", ordersTotal],
            ["Активные", activeOrdersCount],
            ["Отменённые", cancelledOrdersCount],
            ["Показано", filteredOrders.length],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-r border-slate-100 px-5 py-4 last:border-r-0 md:border-b-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {errorText && <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{errorText}</div>}

      <section className="manufacturing-attention mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Требует внимания</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Проблемы рассчитаны по всему реестру, а не только по текущей странице.</p>
          </div>
          {attentionFilter && (
            <button type="button" onClick={() => { setAttentionFilter(""); setOrdersPage(1); }} className="text-xs font-black text-blue-600 hover:text-blue-800">
              Сбросить фильтр
            </button>
          )}
        </div>
        <div className="grid grid-flow-dense grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { key: "overdue", label: "Просроченные", value: attentionSummary.overdue, detail: "Нарушен срок активной задачи", tone: "rose" },
            { key: "shortages", label: "Требуется закупка", value: attentionSummary.shortages, detail: "Есть открытый дефицит", tone: "amber" },
            { key: "hold", label: "Приостановлены", value: attentionSummary.hold, detail: "Есть задачи на холде", tone: "rose" },
            { key: "unassigned", label: "Без исполнителя", value: attentionSummary.unassigned, detail: "Активные задачи не назначены", tone: "blue" },
          ].map((item) => {
            const selected = attentionFilter === item.key;
            const toneClass = item.tone === "rose"
              ? "bg-rose-500 text-white"
              : item.tone === "amber"
                ? "bg-amber-400 text-amber-950"
                : "bg-blue-500 text-white";
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => { setAttentionFilter(selected ? "" : item.key); setOrdersPage(1); }}
                className={`group grid min-h-32 grid-cols-[44px_minmax(0,1fr)] gap-3 border-b border-r border-slate-100 p-5 text-left transition ${
                  selected ? "bg-blue-50 ring-2 ring-inset ring-blue-500/20" : "hover:bg-slate-50"
                }`}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black ${toneClass}`}>{item.value}</span>
                <span>
                  <span className="block text-sm font-black text-slate-900">{item.label}</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{item.detail}</span>
                  <span className="mt-2 block text-[11px] font-black text-blue-600">{selected ? "Фильтр применён" : "Показать заказы →"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {dailyAssembly?.rows?.length > 0 && (
        <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Выпуск за сегодня</h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">Собрано {dailyAssembly.today_total} шт. · без дневной отметки {dailyAssembly.without_report}</p>
            </div>
            <button type="button" onClick={fetchDailyAssembly} className={neutralButtonClass}>Обновить</button>
          </div>
          <div className="divide-y divide-slate-100">
            {dailyAssembly.rows.map((row) => (
              <button type="button" onClick={() => onOpenTask?.(row.task_id)} key={`${row.task_id}-${row.user_id}`} className="grid w-full grid-cols-2 gap-3 px-5 py-3 text-left transition hover:bg-slate-50 md:grid-cols-[1.2fr_1fr_repeat(4,90px)] md:items-center">
                <div><div className="text-sm font-black text-slate-900">{row.user_name}</div><div className="text-[10px] font-semibold text-slate-400">Заказ #{row.order_id}</div></div>
                <div className="truncate text-xs font-bold text-slate-600">{row.product_name}</div>
                <div className="text-xs"><span className="text-slate-400">План</span><div className="font-black text-slate-800">{row.planned_qty}</div></div>
                <div className="text-xs"><span className="text-slate-400">Сегодня</span><div className="font-black text-blue-700">{row.today_qty}</div></div>
                <div className="text-xs"><span className="text-slate-400">Всего</span><div className="font-black text-emerald-700">{row.total_qty}</div></div>
                <div className="text-xs"><span className="text-slate-400">Осталось</span><div className="font-black text-amber-700">{row.remaining_qty}</div></div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_240px]">
        <label>
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Поиск</span>
          <input value={orderSearch} onChange={(event) => { setOrderSearch(event.target.value); setOrdersPage(1); }} className={fieldClass} placeholder="Номер, заказчик или изделие" />
        </label>
        <label>
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Статус</span>
          <select value={orderStatusFilter} onChange={(event) => { setOrderStatusFilter(event.target.value); setOrdersPage(1); }} className={selectClass}>
            <option value="all">Все заказы</option>
            <option value="active">Активные</option>
            <option value="cancelled">Отменённые</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[72px_minmax(150px,1fr)_minmax(170px,1fr)_minmax(190px,1.15fr)_130px_170px_120px] items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 lg:grid">
          <span>Номер</span>
          <span>Заказчик</span>
          <span>Состав</span>
          <span>Этап и риски</span>
          <span>Срок</span>
          <span>Выполнение</span>
          <span />
        </div>
        {ordersLoading ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-400">Загрузка заказов...</div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const totalQty = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const productPreview = (order.items || []).slice(0, 2).map((item) => item.product?.name || `Изделие #${item.product_id}`).join(", ");
            const currentTask = order.progress?.active_tasks?.[0];
            const attention = order.progress?.attention || {};
            const isCancelled = ["cancelled", "cancelled_with_commitments"].includes(order.status);
            const productionPercent = Number(order.progress?.planned_qty || totalQty)
              ? Math.round((Number(order.progress?.finished_qty || 0) / Number(order.progress?.planned_qty || totalQty)) * 100)
              : 0;
            const deadline = order.planned_delivery_date ? parseDateValue(inputDate(order.planned_delivery_date)) : null;
            const isDeliveryOverdue = !isCancelled && order.status !== "completed" && deadline && deadline < parseDateValue(dateToValue(new Date()));
            return (
              <div key={order.id} className="group border-b border-slate-100 last:border-b-0">
                <div
                  className="grid w-full grid-cols-2 gap-4 bg-white px-5 py-4 text-left transition duration-200 group-hover:bg-slate-50/80 lg:grid-cols-[72px_minmax(150px,1fr)_minmax(170px,1fr)_minmax(190px,1.15fr)_130px_170px_120px] lg:items-center"
                >
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 lg:hidden">Номер</span>
                    <span className="text-sm font-black text-slate-900">#{order.id}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 lg:hidden">Заказчик</span>
                    <span className="block truncate text-sm font-bold text-slate-800">{order.customer_name || "Не указан"}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{totalQty} изделий</span>
                  </div>
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 lg:hidden">Состав</span>
                    <span className="block truncate text-sm font-semibold text-slate-700">{productPreview || "Состав не указан"}</span>
                    {(order.items || []).length > 2 && <span className="text-[10px] font-bold text-blue-600">ещё {(order.items || []).length - 2}</span>}
                  </div>
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 lg:hidden">Этап и риски</span>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${orderStatusDotClass(order.status)}`} />
                      <span className="truncate text-xs font-black text-slate-800">
                        {currentTask ? (taskStageLabels[currentTask.type] || currentTask.title) : (statusLabels[order.status] || order.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(attention.overdue || isDeliveryOverdue) && <span className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700">Просрочено</span>}
                      {attention.shortages && <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">Дефицит</span>}
                      {attention.hold && <span className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700">Холд</span>}
                      {attention.unassigned && <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">Нет исполнителя</span>}
                      {!attention.overdue && !isDeliveryOverdue && !attention.shortages && !attention.hold && !attention.unassigned && (
                        <span className="text-[10px] font-semibold text-slate-400">Без явных рисков</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 lg:hidden">Срок</span>
                    <span className={`text-sm font-black ${isDeliveryOverdue ? "text-rose-700" : "text-slate-700"}`}>{formatDate(order.planned_delivery_date)}</span>
                    {isDeliveryOverdue && <span className="mt-1 block text-[10px] font-bold text-rose-600">Срок нарушен</span>}
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-400">
                      <span>{order.progress?.finished_qty || 0} из {order.progress?.planned_qty || totalQty} изделий</span>
                      <span>{productionPercent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(productionPercent, 100)}%` }} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenOrder(order)}
                    className="col-span-2 min-h-10 rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 lg:col-span-1"
                  >
                    Открыть заказ
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          !errorText && <div className="p-12 text-center text-sm font-semibold text-slate-400">По заданным условиям заказов нет.</div>
        )}
      </div>

      {ordersTotalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">
            Страница {ordersPage} из {ordersTotalPages} · показано {orders.length} из {ordersTotal.toLocaleString("ru-RU")}
          </p>
          <div className="flex gap-2">
            <button type="button" disabled={ordersPage <= 1 || ordersLoading} onClick={() => setOrdersPage((page) => Math.max(1, page - 1))} className={`${neutralButtonClass} disabled:opacity-40`}>
              ← Назад
            </button>
            <button type="button" disabled={ordersPage >= ordersTotalPages || ordersLoading} onClick={() => setOrdersPage((page) => Math.min(ordersTotalPages, page + 1))} className={`${neutralButtonClass} disabled:opacity-40`}>
              Далее →
            </button>
          </div>
        </div>
      )}

      {/* ПАНЕЛЬ СОЗДАНИЯ ЗАКАЗА */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label="Закрыть создание заказа"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl">
            <form onSubmit={handleCreateOrder} className="flex max-h-[94vh] flex-col bg-white">
              <div className="z-10 flex flex-col gap-4 border-b border-slate-100 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_46%)] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
                <div>
                  <div className="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700">Новая заявка</div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Запустить производственный заказ</h2>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">Укажите заказчика, срок и изделия. После запуска система рассчитает потребность и создаст рабочие задачи.</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-bold text-slate-500 transition hover:bg-slate-50">
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                <div className="flex flex-col gap-5">
                  {createError && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                      {createError}
                    </div>
                  )}

                  <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                    <div className="grid grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Заказчик *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className={fieldClass}
                          placeholder="ООО Вектор"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Плановая дата поставки</label>
                        <CalendarField
                          value={plannedDeliveryDate}
                          onChange={setPlannedDeliveryDate}
                          minDate={dateToValue(new Date())}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Изделия в заказе</p>
                        <p className="mt-1 text-xs text-slate-500">Можно добавить несколько изделий в один производственный заказ.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItemRow}
                        className={`${primaryButtonClass} h-10 min-h-10 px-4`}
                      >
                        Добавить позицию
                      </button>
                    </div>

                    <div className="space-y-3">
                      {selectedItems.map((item, index) => (
                        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_40px] sm:items-end">
                            <div>
                              <label className={labelClass}>Изделие *</label>
                              <ProductOrderSelect
                                products={products}
                                value={item.product_id}
                                onChange={(productId) => handleItemChange(index, "product_id", productId)}
                              />
                            </div>

                            <div>
                              <label className={labelClass}>Кол-во *</label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                                className={`${fieldClass} text-center font-semibold`}
                              />
                            </div>

                            <button
                              type="button"
                              disabled={selectedItems.length === 1}
                              onClick={() => handleRemoveItemRow(index)}
                              className={dangerButtonClass}
                              title="Удалить позицию"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white/95 p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <p className="text-xs font-semibold text-slate-400">Задачи будут созданы автоматически после проверки материалов.</p>
                <button
                  type="submit"
                  disabled={createLoading || products.length === 0}
                  className={`${primaryButtonClass} w-full sm:w-auto sm:min-w-56`}
                >
                  {createLoading ? "Запуск заказа..." : "Запустить заказ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
