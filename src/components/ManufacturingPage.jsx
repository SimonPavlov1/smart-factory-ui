import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
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

function CalendarField({ value, onChange, className = "", compact = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateValue(value);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const days = buildCalendarDays(viewDate);
  const todayValue = dateToValue(new Date());

  const selectDate = (date) => {
    onChange(dateToValue(date));
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between border border-slate-200 bg-white text-left font-semibold text-slate-800 outline-none transition-all hover:border-blue-100 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 ${compact ? "min-h-9 rounded-xl px-3 py-2 text-xs" : "min-h-11 rounded-2xl px-3.5 py-3 text-sm"}`}
      >
        <span>{selectedDate ? selectedDate.toLocaleDateString("ru-RU") : "Выберите дату"}</span>
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-full min-w-[292px] rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl">
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
              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={`flex h-9 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                    isSelected
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
      )}
    </div>
  );
}

export default function ManufacturingPage({ onOpenTask, taskChangeVersion = 0 }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

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

  const statusLabels = {
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
  };

  const fieldClass = "w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10";
  const selectClass = `${fieldClass} appearance-none pr-10 font-semibold`;
  const labelClass = "block text-[11px] font-bold text-slate-500 mb-2";
  const primaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#3F8CFF] bg-[#3F8CFF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#1f78ff] hover:shadow-md active:translate-y-0 disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0";
  const neutralButtonClass = "inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0";
  const dangerActionButtonClass = "inline-flex min-h-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition-all duration-150 hover:-translate-y-0.5 hover:bg-rose-100 hover:text-rose-700 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0";
  const dangerButtonClass = "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 transition-all duration-150 hover:-translate-y-0.5 hover:bg-rose-100 hover:text-rose-700 active:translate-y-0 disabled:opacity-30 disabled:hover:translate-y-0";
  const compactFieldClass = "w-full min-h-9 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400";

  const SelectChevron = () => (
    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );

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

  const handleOpenOrder = async (order, options = {}) => {
    const { background = false, preserveScroll = false } = options;
    const scrollY = preserveScroll ? window.scrollY : null;

    setActiveOrder(order);
    if (!background) {
      setIsMaterialsOpen(false);
      setIsShortagesOpen(false);
    }
    if (!background) setOrderDetail(null);
    setOrderDetailError("");
    if (!background) setOrderDetailLoading(true);
    if (!background) setRequiredMaterials([]);
    setMaterialsError("");
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
    setAssigningTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}/deadline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_date: dueDate || null }),
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

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Удалить заказ #${order.id}? Связанные задачи и резервы будут удалены.`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/manufacturing/orders/${order.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Не удалось удалить заказ");
        return;
      }
      if (activeOrder?.id === order.id) {
        setActiveOrder(null);
        setOrderDetail(null);
      }
      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  // ФУНКЦИЯ ГЕНЕРАЦИИ PDF
  const downloadPDF = async () => {
    if (!activeOrder || !requiredMaterials || requiredMaterials.length === 0) return;

    try {
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
      doc.autoTable({
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
    } catch (err) {
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
    fetchOrders();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (taskChangeVersion > 0 && activeOrder) {
      const timer = setTimeout(
        () => handleOpenOrder(activeOrder, { background: true, preserveScroll: true }),
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
    if (status === "Materials Issued") return "border-amber-100 bg-amber-50 text-amber-700";
    if (status === "Reserved") return "border-blue-100 bg-blue-50 text-blue-700";
    if (["In Assembly", "Quality Check", "Ready For Packing", "Finished Goods", "Ready To Ship"].includes(status)) {
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    }
    if (status === "Procurement Required" || status === "Repair Required") return "border-rose-100 bg-rose-50 text-rose-700";
    return "border-slate-100 bg-slate-50 text-slate-600";
  };

  const getCurrentStage = (detail) => {
    const stages = detail?.stages || [];
    return stages.find((stage) => ["in_progress", "assigned", "open", "waiting_delivery", "hold"].includes(stage.status)) ||
      stages.find((stage) => stage.status !== "done" && stage.status !== "not_created") ||
      stages.find((stage) => stage.status === "not_created") ||
      stages[stages.length - 1];
  };

  const MaterialsSummary = ({ compact = false }) => {
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
    return (
      <div className="relative w-full max-w-none p-4 sm:p-6 lg:p-10">
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
              <p className="text-[11px] font-bold text-slate-400">Производственный заказ</p>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                <h1 className="truncate text-2xl font-black text-slate-900 sm:text-3xl">Заказ #{activeOrder.id}</h1>
                {orderDetail && (
                  <span className={`inline-flex w-fit items-center rounded-2xl border px-3 py-1.5 text-xs font-bold ${orderStatusClass(orderDetail.status)}`}>
                    {statusLabels[orderDetail.status] || orderDetail.status}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-500">{activeOrder.customer_name || "Заказчик не указан"}</p>
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
              <button
                type="button"
                onClick={() => handleDeleteOrder(orderDetail || activeOrder)}
                disabled={loading}
                className={dangerActionButtonClass}
              >
                Удалить заказ
              </button>
            </div>
          </div>
        </div>

        {orderDetailLoading ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400">
            Загрузка заказа...
          </div>
        ) : orderDetailError ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">{orderDetailError}</div>
        ) : (
          <>
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
                  <MaterialsSummary compact />
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
                <div className="overflow-x-auto rounded-2xl border border-rose-100 bg-white">
                  <table className="w-full min-w-[760px] text-left text-xs">
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
    <div className="relative w-full max-w-none p-4 sm:p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-400">Производство</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">Производственные заказы</h1>
          <p className="mt-2 text-sm text-slate-500">Заказы клиентов, комплектация и производственная цепочка.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
            {orders.length} заказов
          </div>
          <button onClick={fetchOrders} className={neutralButtonClass}>
            Обновить
          </button>
          <button
            onClick={openCreateOrderPanel}
            className={primaryButtonClass}
          >
            Создать заказ
          </button>
        </div>
      </div>

      {errorText && <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{errorText}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {orders.length > 0 ? (
          orders.map((order) => {
            const totalQty = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenOrder(order)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenOrder(order);
                  }
                }}
                className="w-full rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">Заказ #{order.id}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${orderStatusClass(order.status)}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-700">{order.customer_name || "Заказчик не указан"}</p>
                  </div>
                  <div className="shrink-0 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                    {totalQty} шт.
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <span className="block text-[10px] font-bold text-slate-400">Плановая поставка</span>
                    <span className="font-semibold text-slate-700">{formatDate(order.planned_delivery_date)}</span>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <span className="block text-[10px] font-bold text-slate-400">Позиций</span>
                    <span className="font-semibold text-slate-700">{order.items?.length || 0}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="mb-2 text-xs font-bold text-slate-700">Состав заказа</p>
                  <div className="space-y-2">
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                        <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                          {item.product?.name || `Изделие ID: ${item.product_id}`}
                          {(item.product?.drawing_number || item.product?.sku) && (
                            <span className="mt-0.5 block truncate text-[10px] font-mono text-slate-400">
                              {item.product?.drawing_number || item.product?.sku}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-slate-700">{item.quantity} шт.</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          !errorText && <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400 xl:col-span-2">Заказов не найдено.</div>
        )}
      </div>

      {/* ПАНЕЛЬ СОЗДАНИЯ ЗАКАЗА */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Закрыть создание заказа"
            className="hidden flex-1 cursor-default md:block"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="h-full w-full max-w-2xl bg-white shadow-2xl">
            <form onSubmit={handleCreateOrder} className="flex h-full flex-col bg-white">
              <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div>
                  <p className="text-[11px] font-bold text-slate-400">Производство</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">Новый заказ</h2>
                  <p className="mt-2 text-sm text-slate-500">Заказчик, плановая поставка и изделия для запуска в производство.</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className={`${neutralButtonClass} shrink-0`}>
                  Закрыть
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="flex flex-col gap-5">
                  {createError && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                      {createError}
                    </div>
                  )}

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
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
                        <div key={index} className="rounded-2xl border border-slate-100 bg-white p-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_40px] sm:items-end">
                            <div>
                              <label className={labelClass}>Изделие *</label>
                              <div className="relative">
                                <select
                                  required
                                  value={item.product_id}
                                  onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                                  className={selectClass}
                                >
                                  {products.length === 0 ? (
                                    <option value="">База изделий пуста</option>
                                  ) : (
                                    products.map((p) => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))
                                  )}
                                </select>
                                <SelectChevron />
                              </div>
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

              <div className="border-t border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
                <button
                  type="submit"
                  disabled={createLoading || products.length === 0}
                  className={`${primaryButtonClass} w-full`}
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
