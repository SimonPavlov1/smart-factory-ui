import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
// Импортируем ваш локальный ГОСТ шрифт

export default function ManufacturingPage() {
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

  // Состояния для модального окна комплектующих (BOM)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState("");
  const [taskUsersByRole, setTaskUsersByRole] = useState({});
  const [assigningTaskId, setAssigningTaskId] = useState(null);
  const [requiredMaterials, setRequiredMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState("");

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

  const handleOpenDetails = async (order) => {
    setActiveOrder(order);
    setIsDetailsModalOpen(true);
    setMaterialsLoading(true);
    setRequiredMaterials([]);
    setMaterialsError("");

    try {
      const res = await fetch(`/api/manufacturing/orders/${order.id}/bom-summary`);
      if (res.ok) {
        const bomData = await res.json();
        setRequiredMaterials(bomData);
      } else {
        const err = await res.json().catch(() => ({}));
        setMaterialsError(err.detail || "Не удалось загрузить спецификацию заказа");
      }
    } catch (err) {
      console.error("Ошибка сети при запросе BOM:", err);
      setMaterialsError("Ошибка сети при запросе спецификации заказа");
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleOpenOrder = async (order) => {
    setActiveOrder(order);
    setOrderDetail(null);
    setOrderDetailError("");
    setOrderDetailLoading(true);

    try {
      const res = await fetch(`/api/manufacturing/orders/${order.id}`);
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
    } catch (err) {
      console.error(err);
      setOrderDetailError("Ошибка сети при загрузке заказа");
    } finally {
      setOrderDetailLoading(false);
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
      await handleOpenOrder(activeOrder);
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
      await handleOpenOrder(activeOrder);
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
      await handleOpenOrder(activeOrder);
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

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) return alert("Укажите наименование заказчика");
    const hasInvalidItems = selectedItems.some(item => !item.product_id);
    if (hasInvalidItems) return alert("Проверьте правильность выбора изделий");

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
        alert("Многопозиционный производственный заказ успешно создан!");
        setIsModalOpen(false);
        setCustomerName("");
        setPlannedDeliveryDate("");
        if (products.length > 0) {
          setSelectedItems([{ product_id: products[0].id, quantity: 1 }]);
        }
        await fetchOrders();
      } else {
        const errorData = await res.json();
        alert(`Ошибка: ${errorData.detail || "Не удалось создать заказ"}`);
      }
    } catch (err) {
      alert("Ошибка сети");
    } finally {
      setCreateLoading(false);
    }
  };

  const issueMaterials = async (orderId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manufacturing/orders/${orderId}/issue-materials`, { method: "POST" });
      if (res.ok) {
        alert("Материалы по всем позициям успешно выданы!");
        await fetchOrders();
      } else {
        const err = await res.json();
        alert(`Ошибка: ${err.detail}`);
      }
    } catch (err) {
      alert("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => value ? new Date(value).toLocaleDateString("ru-RU") : "—";
  const inputDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const stageClassName = (status) => {
    if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "in_progress") return "border-blue-200 bg-blue-50 text-blue-700";
    if (status === "assigned" || status === "open" || status === "waiting_delivery") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-200 bg-slate-50 text-slate-400";
  };

  const getCurrentStage = (detail) => {
    const stages = detail?.stages || [];
    return stages.find((stage) => ["in_progress", "assigned", "open", "waiting_delivery"].includes(stage.status)) ||
      stages.find((stage) => stage.status !== "done" && stage.status !== "not_created") ||
      stages.find((stage) => stage.status === "not_created") ||
      stages[stages.length - 1];
  };

  if (activeOrder && (orderDetail || orderDetailLoading || orderDetailError)) {
    const currentStage = getCurrentStage(orderDetail);
    return (
      <div className="p-10 relative">
        <div className="flex flex-col lg:flex-row justify-between gap-4 mb-8 border-b border-slate-200 pb-5">
          <div>
            <button
              onClick={() => { setActiveOrder(null); setOrderDetail(null); setOrderDetailError(""); }}
              className="text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-wider mb-2"
            >
              Назад к заказам
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Заказ #{activeOrder.id}</h1>
            <p className="text-xs text-slate-400 mt-1">{activeOrder.customer_name || "Заказчик не указан"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDeleteOrder(orderDetail || activeOrder)}
              disabled={loading}
              className="text-xs font-bold uppercase text-rose-600 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 disabled:opacity-50"
            >
              Удалить заказ
            </button>
          </div>
        </div>

        {orderDetailLoading ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 font-medium">
            Загрузка заказа...
          </div>
        ) : orderDetailError ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{orderDetailError}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 mb-8">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Паспорт заказа</p>
	                <div className="space-y-3">
                  {currentStage && (
                    <div className={`border rounded-xl p-3 ${stageClassName(currentStage.status)}`}>
                      <p className="text-[10px] uppercase font-black tracking-wider opacity-70">Текущий этап</p>
                      <p className="text-sm font-black mt-0.5">{currentStage.title}</p>
                      <p className="text-[10px] mt-1">{stageLabels[currentStage.status] || currentStage.status}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Статус</p>
                    <p className="text-sm font-bold text-slate-900">{statusLabels[orderDetail.status] || orderDetail.status}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Заказчик</p>
                    <p className="text-sm font-semibold text-slate-700">{orderDetail.customer_name || "Не указан"}</p>
                  </div>
	                  <div>
	                    <p className="text-[10px] uppercase text-slate-400 font-bold">Дата создания</p>
	                    <p className="text-sm font-semibold text-slate-700">
	                      {orderDetail.created_at ? new Date(orderDetail.created_at).toLocaleString("ru-RU") : "—"}
	                    </p>
	                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Плановая поставка</p>
                    <p className="text-sm font-semibold text-slate-700">{formatDate(orderDetail.planned_delivery_date)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Состав заказа</p>
                <div className="space-y-2">
                  {orderDetail.items?.map((item) => (
                    <div key={item.id} className="flex justify-between gap-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {item.product?.name || `Изделие ID ${item.product_id}`}
                        {item.product?.drawing_number && <span className="block text-[10px] font-mono text-slate-400 mt-0.5">{item.product.drawing_number}</span>}
                      </span>
                      <span className="text-sm font-bold text-slate-800 shrink-0">{item.quantity} шт.</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Производственная цепочка</h2>
                  <p className="text-xs text-slate-400 mt-1">Этапы заполняются по задачам, созданным системой для этого заказа</p>
                </div>
                <button
                  onClick={() => handleOpenOrder(activeOrder)}
                  className="text-xs font-bold uppercase text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200"
                >
                  Обновить
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                {orderDetail.stages?.map((stage, index) => (
                  <div key={stage.key} className={`border rounded-xl p-3 ${stageClassName(stage.status)}`}>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/80 border border-current flex items-center justify-center text-[10px] font-black shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wider">{stage.title}</p>
                        <p className="text-[10px] opacity-75 mt-0.5">{stage.description}</p>
                        <span className="inline-flex mt-2 text-[10px] font-bold uppercase bg-white/70 border border-current rounded px-1.5 py-0.5">
                          {stageLabels[stage.status] || stage.status}
                        </span>
                      </div>
                    </div>

                    {stage.tasks?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {stage.tasks.map((task) => (
                          <div key={task.id} className="bg-white/80 border border-white rounded-lg p-2 text-slate-700">
                            <p className="text-[11px] font-bold text-slate-900">{task.title}</p>
	                            <p className="text-[10px] text-slate-400 mt-0.5">
	                              {roleLabels[task.role] || task.role} · {stageLabels[task.status] || task.status}
	                            </p>
	                            <p className="text-[10px] text-slate-500 mt-1">
	                              Исполнитель: <span className="font-bold text-slate-700">{task.assigned_user?.full_name || task.assigned_user?.username || "не назначен"}</span>
	                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Дедлайн: <span className="font-bold text-slate-700">{formatDate(task.due_date)}</span>
                            </p>
                            {task.completed_at && (
                              <p className="text-[10px] text-emerald-600 mt-1">
                                Выполнено: {new Date(task.completed_at).toLocaleString("ru-RU")}
                              </p>
                            )}
                            {task.status !== "done" && (
                              <div className="mt-2 grid grid-cols-1 gap-1.5">
                                <select
                                  value={task.assigned_user_id || ""}
                                  disabled={assigningTaskId === task.id}
                                  onChange={(e) => assignTask(task, e.target.value)}
                                  className="w-full p-1.5 text-[10px] border border-slate-200 rounded-md bg-white text-slate-700 outline-none"
                                >
                                  <option value="">Назначить сотрудника</option>
                                  {(taskUsersByRole[task.role] || []).map((user) => (
                                    <option key={user.id} value={user.id}>
                                      {user.full_name || user.username}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="date"
                                  value={inputDate(task.due_date)}
                                  disabled={assigningTaskId === task.id}
                                  onChange={(e) => setTaskDeadline(task, e.target.value)}
                                  className="w-full p-1.5 text-[10px] border border-slate-200 rounded-md bg-white text-slate-700 outline-none"
                                />
                                {["assigned", "open"].includes(task.status) && (
                                  <button
                                    type="button"
                                    disabled={assigningTaskId === task.id}
                                    onClick={() => takeTask(task)}
                                    className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-md px-2 py-1.5 disabled:opacity-50"
                                  >
                                    Взять в работу
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-10 relative">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Производственные заказы</h1>
          <p className="text-xs text-slate-400 mt-1">Управление сборкой комплексных заказов клиентов</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button onClick={fetchOrders} className="flex-1 sm:flex-none text-xs font-bold uppercase text-slate-600 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
            Обновить
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none text-xs font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl shadow-sm flex items-center justify-center gap-2"
          >
            Создать комплексный заказ
          </button>
        </div>
      </div>

      {errorText && <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm">{errorText}</div>}

      {/* Список заказов */}
      <div className="space-y-4">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-bold text-lg text-slate-900">Заказ #{order.id}</p>

	                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
	                    order.status === "Materials Issued"
	                      ? "bg-amber-50 text-amber-600 border-amber-100"
	                      : order.status === "Reserved"
	                      ? "bg-blue-50 text-blue-600 border-blue-100"
	                      : ["In Assembly", "Quality Check", "Ready For Packing", "Finished Goods", "Ready To Ship"].includes(order.status)
	                      ? "bg-green-50 text-green-600 border-green-100"
	                      : order.status === "Procurement Required" || order.status === "Repair Required"
	                      ? "bg-rose-50 text-rose-600 border-rose-100"
	                      : "bg-blue-50 text-blue-600 border-blue-100"
	                  }`}>
	                    {statusLabels[order.status] || order.status}
	                  </span>
                </div>

	                <p className="text-sm text-slate-700 font-medium">
	                  Заказчик: <span className="text-slate-900 font-bold">{order.customer_name || "Не указан"}</span>
	                </p>
                <p className="text-xs text-slate-500">
                  Плановая поставка: <span className="font-bold text-slate-700">{formatDate(order.planned_delivery_date)}</span>
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1.5 max-w-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Состав заказа:</p>
                  {order.items && order.items.map((item, idx) => (
                    <div key={idx} className="text-xs text-slate-600 flex justify-between items-center gap-4 py-0.5">
                      <span className="truncate">
                        <span className="font-semibold text-slate-900">
                          {item.product?.name || `Изделие ID: ${item.product_id}`}
                        </span>
                        {item.product?.sku && (
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5 bg-slate-200/60 px-1 py-0.5 rounded">
                            {item.product.sku}
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-slate-800 shrink-0">{item.quantity} шт.</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 shrink-0 lg:w-52">
                <button
                  onClick={() => handleOpenOrder(order)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all text-center"
                >
                  Открыть заказ
                </button>

                <button
                  onClick={() => handleOpenDetails(order)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all text-center border border-slate-200/60"
                >
                  Сводная комплектация
                </button>

                {(order.status === "In Progress" || order.status === "Reserved") && (
                  <button
                    onClick={() => issueMaterials(order.id)}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:bg-slate-300"
                  >
	                    {loading ? "Выдача..." : "Выдать материалы"}
	                  </button>
	                )}

                <button
                  onClick={() => handleDeleteOrder(order)}
                  disabled={loading}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all text-center border border-rose-100 disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        ) : (
          !errorText && <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 font-medium">Заказов не найдено.</div>
        )}
      </div>

      {isDetailsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[30px] p-8 w-full max-w-3xl shadow-xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Сводная комплектация</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Заказ #{activeOrder?.id} · {activeOrder?.customer_name || "Заказчик не указан"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadPDF}
                  disabled={materialsLoading || requiredMaterials.length === 0}
                  className="text-xs font-bold uppercase text-white bg-slate-900 hover:bg-slate-800 px-4 py-3 rounded-xl disabled:bg-slate-300"
                >
                  PDF
                </button>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/50 p-4">
              {materialsLoading ? (
                <p className="text-center text-slate-400">Загрузка спецификации...</p>
              ) : materialsError ? (
                <p className="text-center text-red-600 text-sm">{materialsError}</p>
              ) : requiredMaterials.length === 0 ? (
                <p className="text-center text-slate-400">Комплектующие не найдены.</p>
              ) : (
                (() => {
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
                    <div className="space-y-4">
                      {Object.entries(grouped).map(([device, assemblies]) => (
                        <div key={device} className="border border-slate-200 rounded-xl p-4 bg-white">
                          <h3 className="font-bold text-sm text-slate-900 border-b pb-2 mb-2">Устройство: {device}</h3>
                          {Object.entries(assemblies).map(([assembly, categories]) => (
                            <div key={assembly} className="ml-4 mt-2">
                              <h4 className="font-semibold text-xs text-slate-700 italic">Сборочная единица: {assembly}</h4>
                              {Object.entries(categories).map(([category, items]) => (
                                <div key={category} className="ml-4 mt-1 mb-2">
                                  <p className="text-[10px] font-bold uppercase text-slate-400">{category}</p>
                                  <ul className="space-y-1">
                                    {items.map((mat) => (
                                      <li key={mat.id} className="text-xs text-slate-600 flex justify-between gap-4">
                                        <span className="min-w-0">
                                          <span className="font-semibold text-slate-800">{mat.name}</span>
                                          <span className="block text-[10px] text-slate-400">
                                            {mat.item_type === "purchased_product" ? "Покупное изделие/узел" :
                                             mat.item_type === "unresolved_purchase" ? "Непривязанная позиция" :
                                             "Покупной компонент"}
                                            {mat.sku && mat.sku !== "—" ? ` · ${mat.sku}` : ""}
                                            {mat.designators ? ` · ${mat.designators}` : ""}
                                          </span>
                                        </span>
                                        <span className="font-bold shrink-0">{mat.qty} шт.</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ЗАКАЗА */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[30px] p-8 w-full max-w-xl shadow-xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Новый комплексный заказ</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-6">
              {/* Форма создания заказа остается без изменений */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Наименование компании / заказчика *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3.5 text-sm border border-slate-200 rounded-xl text-slate-800 font-semibold bg-slate-50 focus:outline-none focus:border-blue-500"
                  placeholder="ООО 'Вектор' или Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Плановая дата поставки</label>
                <input
                  type="date"
                  value={plannedDeliveryDate}
                  onChange={(e) => setPlannedDeliveryDate(e.target.value)}
                  className="w-full p-3.5 text-sm border border-slate-200 rounded-xl text-slate-800 font-semibold bg-slate-50 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">Изделия в заказе *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    + Добавить позицию
                  </button>
                </div>

                {selectedItems.map((item, index) => (
                  <div key={index} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1">
                      <select
                        required
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                        className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-semibold bg-white focus:outline-none"
                      >
                        {products.length === 0 ? (
                          <option value="">Загрузка базы...</option>
                        ) : (
                          products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-semibold bg-white text-center focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={selectedItems.length === 1}
                      onClick={() => handleRemoveItemRow(index)}
                      className="text-slate-300 hover:text-red-500 disabled:opacity-30 transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={createLoading || products.length === 0}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:bg-slate-300 shadow-lg"
              >
                {createLoading ? "Обработка и резервирование..." : "Запустить комплексный заказ"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
