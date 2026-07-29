import React, { useCallback, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const [orderWorkspaceTab, setOrderWorkspaceTab] = useState("work");
  const [cancellation, setCancellation] = useState(null);
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [cancellationDialog, setCancellationDialog] = useState(null);

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
  const filteredOrders = orders.filter((order) => {
    const query = orderSearch.trim().toLowerCase();
    if (query && !`${order.id} ${order.customer_name || ""} ${(order.items || []).map((item) => item.product?.name || "").join(" ")}`.toLowerCase().includes(query)) return false;
    if (orderStatusFilter !== "all" && order.status !== orderStatusFilter) return false;
    return true;
  });
  const activeOrdersCount = orders.filter((order) => ["planned", "in_progress", "blocked"].includes(order.status)).length;
  const cancelledOrdersCount = orders.filter((order) => ["cancelled", "cancelled_with_commitments"].includes(order.status)).length;

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

  const fetchOrders = async () => {
    try {
      setErrorText("");
      const res = await fetch("/api/manufacturing/orders");
      if (!res.ok) throw new Error(`Статус ${res.status}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setErrorText("Не удалось загрузить список производственных заказов.");
    }
  };

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
        await fetchOrders();
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
      fetchOrders();
      fetchProducts();
      fetchDailyAssembly();
    });
  }, [fetchDailyAssembly]);

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
    const createdStages = (orderDetail?.stages || []).filter((stage) => stage.status !== "not_created");
    const workingStages = createdStages.filter((stage) => ["in_progress", "ready_to_issue"].includes(stage.status));
    const waitingStages = createdStages.filter((stage) => ["assigned", "open", "waiting_delivery", "hold"].includes(stage.status));
    const tabs = [
      { id: "work", label: "Работа" },
      { id: "items", label: "Состав заказа", count: orderDetail?.items?.length || 0 },
      { id: "materials", label: "Комплектующие", count: shortagesCount || null },
      { id: "history", label: "История" },
    ];
    return (
      <div className="workspace-page manufacturing-page relative w-full max-w-none p-4 sm:p-6 lg:p-10">
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => { setActiveOrder(null); setOrderDetail(null); setOrderDetailError(""); }}
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#3F8CFF] transition-colors hover:text-[#1f78ff]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Назад к заказам
              </button>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                <h1 className="truncate text-2xl font-black text-slate-900 sm:text-3xl">Заказ #{activeOrder.id}</h1>
                {orderDetail && (
                  <span className={`inline-flex w-fit items-center rounded-2xl border px-3 py-1.5 text-xs font-bold ${orderStatusClass(orderDetail.status)}`}>
                    {statusLabels[orderDetail.status] || orderDetail.status}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {activeOrder.customer_name || "Заказчик не указан"} · поставка {formatDate(orderDetail?.planned_delivery_date)}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => handleOpenOrder(activeOrder, { background: true, preserveScroll: true })}
                disabled={orderDetailLoading}
                className={neutralButtonClass}
              >
                Обновить
              </button>
              {!["cancelled", "cancelled_with_commitments"].includes(cancellation?.cancellation_status) &&
                ["admin", "manager", "production_manager"].some((role) => currentRoles.includes(role)) && (
                <button type="button" onClick={() => setCancellationDialog({ mode: "request" })} disabled={cancellationLoading || Boolean(cancellation?.cancellation_status)} className={dangerActionButtonClass}>
                  {cancellation?.cancellation_status ? "Отмена обрабатывается" : "Запросить отмену"}
                </button>
              )}
            </div>
          </div>
        </div>

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
              <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-8">
                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-black text-slate-900">Процессы заказа</h2>
                          <p className="mt-1 text-sm text-slate-500">Каждый процесс показывает своё фактическое состояние</p>
                        </div>
                        <div className="hidden items-center gap-3 text-xs font-bold sm:flex">
                          {workingStages.length > 0 && <span className="text-blue-600">В работе: {workingStages.length}</span>}
                          {waitingStages.length > 0 && <span className="text-amber-600">Ожидают: {waitingStages.length}</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {createdStages.map((stage) => {
                          const isDone = stage.status === "done";
                          const isWorking = ["in_progress", "ready_to_issue"].includes(stage.status);
                          const isHold = stage.status === "hold";
                          const openTasks = (stage.tasks || []).filter((task) => !["done", "cancelled"].includes(task.status));
                          const taskToOpen = openTasks[0] || stage.tasks?.[stage.tasks.length - 1];
                          return (
                            <button
                              key={stage.key}
                              type="button"
                              onClick={() => taskToOpen && onOpenTask?.(taskToOpen.id)}
                              disabled={!taskToOpen}
                              className={`group flex min-h-[82px] items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                isWorking ? "border-blue-200 bg-blue-50/80 hover:border-blue-300" :
                                isHold ? "border-rose-200 bg-rose-50/70" :
                                isDone ? "border-emerald-100 bg-emerald-50/60" :
                                "border-amber-100 bg-amber-50/60 hover:border-amber-200"
                              } disabled:cursor-default`}
                            >
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                                isWorking ? "bg-blue-600 text-white" :
                                isHold ? "bg-rose-100 text-rose-700" :
                                isDone ? "bg-emerald-100 text-emerald-700" :
                                "bg-amber-100 text-amber-700"
                              }`}>
                                {isDone ? "✓" : stage.tasks?.length || 0}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-black text-slate-900">{stage.title}</span>
                                <span className={`mt-1 block text-xs font-bold ${
                                  isWorking ? "text-blue-600" : isHold ? "text-rose-600" : isDone ? "text-emerald-600" : "text-amber-600"
                                }`}>
                                  {isWorking ? `${openTasks.length} в работе` :
                                    isHold ? "Приостановлено" :
                                    isDone ? "Завершено" :
                                    `${openTasks.length} ожидают`}
                                </span>
                              </span>
                              {taskToOpen && <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500">→</span>}
                            </button>
                          );
                        })}
                        {!createdStages.length && (
                          <div className="col-span-full rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
                            Процессы по заказу ещё не созданы
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {shortagesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setOrderWorkspaceTab("materials")}
                      className="flex w-full items-center justify-between gap-4 rounded-3xl border border-rose-100 bg-rose-50/70 p-5 text-left transition hover:border-rose-200 hover:bg-rose-50"
                    >
                      <div>
                        <p className="font-black text-rose-900">Не хватает {shortagesCount} позиций</p>
                        <p className="mt-1 text-sm font-medium text-rose-700">Откройте ведомость и проверьте закупку комплектующих</p>
                      </div>
                      <span className="shrink-0 text-sm font-black text-rose-700">Проверить →</span>
                    </button>
                  )}

                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">Сейчас в работе</h2>
                        <p className="mt-1 text-sm text-slate-500">{activeTasks.length ? `${activeTasks.length} активных задач` : "Активных задач нет"}</p>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {activeTasks.map((task) => (
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

                <aside className="xl:col-span-4">
                  <div className="space-y-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:sticky xl:top-6">
                    <div>
                      <p className="text-xs font-bold text-slate-400">Срок поставки</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{formatDate(orderDetail.planned_delivery_date)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-2xl font-black text-slate-900">{orderDetail.progress?.finished_qty || 0}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">из {orderDetail.progress?.planned_qty || 0} изделий</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-2xl font-black text-slate-900">{activeTasks.length}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">активных задач</p>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                        <span>Общий прогресс</span>
                        <span>{orderDetail.progress?.percent || 0}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${orderDetail.progress?.percent || 0}%` }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!activeTasks.length}
                      onClick={() => activeTasks[0] && onOpenTask?.(activeTasks[0].id)}
                      className="min-h-11 w-full rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {activeTasks.length ? "Открыть текущую задачу" : "Работа завершена"}
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {orderWorkspaceTab === "items" && (
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
                        {orderDetail.created_at ? new Date(orderDetail.created_at).toLocaleString("ru-RU") : "—"}
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
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black text-slate-900">История выполнения</h2>
                <p className="mt-1 text-sm text-slate-500">Завершённые этапы и задачи заказа</p>
                <div className="mt-5 divide-y divide-slate-100">
                  {completedTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onOpenTask?.(task.id)}
                      className="group flex w-full items-start gap-4 py-4 text-left first:pt-0"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-600">✓</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900 transition group-hover:text-blue-600">{task.title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {task.assigned_user?.full_name || task.assigned_user?.username || "Исполнитель не указан"}
                          {task.completed_at ? ` · ${new Date(task.completed_at).toLocaleString("ru-RU")}` : ""}
                        </p>
                      </div>
                      <span className="mt-2 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500">→</span>
                    </button>
                  ))}
                  {!completedTasks.length && <div className="py-8 text-center text-sm font-semibold text-slate-400">Завершённых задач пока нет</div>}
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400">Маршрут</p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">Производственная цепочка</h2>
                  <p className="mt-1 text-sm text-slate-500">Этапы заполняются по задачам, созданным системой для этого заказа.</p>
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                {orderDetail.stages?.map((stage, index) => (
                  <div key={stage.key} className={`rounded-2xl border p-4 ${stageClassName(stage.status)}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-current bg-white/80 text-xs font-black">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black">{stage.title}</p>
                        <p className="mt-1 text-xs font-semibold opacity-75">{stage.description}</p>
                        <span className="mt-3 inline-flex rounded-xl border border-current bg-white/70 px-2 py-1 text-[11px] font-bold">
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
                                Выполнено: {new Date(task.completed_at).toLocaleString("ru-RU")}
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
          </>
        )}
      </div>
    );
  }

  return (
    <div className="workspace-page manufacturing-page relative w-full max-w-none p-4 sm:p-6 lg:p-8">
      <section className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.11),transparent_42%)] p-5 lg:flex-row lg:items-start lg:justify-between lg:p-7">
          <div className="max-w-5xl">
            <div className="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700">Заявки и заказы</div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Производственные заказы</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">Контроль сроков, комплектации и текущего этапа производства.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={fetchOrders} className={neutralButtonClass}>Обновить</button>
            <button onClick={openCreateOrderPanel} className={primaryButtonClass}>Создать заявку</button>
          </div>
        </div>
        <div className="grid grid-flow-dense grid-cols-2 border-t border-slate-100 md:grid-cols-4">
          {[
            ["Всего", orders.length],
            ["Активные", activeOrdersCount],
            ["Отменённые", cancelledOrdersCount],
            ["Найдено", filteredOrders.length],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-r border-slate-100 px-5 py-4 last:border-r-0 md:border-b-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {errorText && <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{errorText}</div>}

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
          <input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} className={fieldClass} placeholder="Номер, заказчик или изделие" />
        </label>
        <label>
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Статус</span>
          <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)} className={selectClass}>
            <option value="all">Все статусы</option>
            {[...new Set(orders.map((order) => order.status))].map((status) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[88px_minmax(180px,1.3fr)_minmax(180px,1fr)_150px_130px_170px_48px] items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 lg:grid">
          <span>Номер</span>
          <span>Заказчик</span>
          <span>Состав</span>
          <span>Срок</span>
          <span>Статус</span>
          <span>Выполнение</span>
          <span />
        </div>
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const totalQty = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const productPreview = (order.items || []).slice(0, 2).map((item) => item.product?.name || `Изделие #${item.product_id}`).join(", ");
            return (
              <div key={order.id} className="group border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => handleOpenOrder(order)}
                  className="grid w-full grid-cols-2 gap-4 bg-white px-5 py-4 text-left transition duration-200 hover:bg-slate-50/80 lg:grid-cols-[88px_minmax(180px,1.3fr)_minmax(180px,1fr)_150px_130px_170px_48px] lg:items-center"
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
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 lg:hidden">Срок</span>
                    <span className="text-sm font-semibold text-slate-700">{formatDate(order.planned_delivery_date)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 lg:hidden">Статус</span>
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${orderStatusDotClass(order.status)}`} />
                      <span>{statusLabels[order.status] || order.status}</span>
                    </span>
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-400">
                      <span>{order.progress?.tasks_done || 0} из {order.progress?.tasks_total || 0} задач</span>
                      <span>{order.progress?.percent || 0}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${order.progress?.percent || 0}%` }} />
                    </div>
                  </div>
                  <div className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition group-hover:translate-x-1 group-hover:bg-white group-hover:text-blue-600 lg:flex">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              </div>
            );
          })
        ) : (
          !errorText && <div className="p-12 text-center text-sm font-semibold text-slate-400">По заданным условиям заказов нет.</div>
        )}
      </div>

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
