import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
// Импортируем ваш локальный ГОСТ шрифт
import { gostFontBase64 } from "./gostFont";

export default function ManufacturingPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Состояния формы нового заказа
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [selectedItems, setSelectedItems] = useState([{ product_id: "", quantity: 1 }]);
  const [createLoading, setCreateLoading] = useState(false);

  // Состояния для модального окна комплектующих (BOM)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [requiredMaterials, setRequiredMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

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

    try {
      const res = await fetch(`/api/manufacturing/orders/${order.id}/bom-summary`);
      if (res.ok) {
        const bomData = await res.json();
        setRequiredMaterials(bomData);
      } else {
        console.error("Не удалось загрузить спецификацию заказа");
      }
    } catch (err) {
      console.error("Ошибка сети при запросе BOM:", err);
    } finally {
      setMaterialsLoading(false);
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

      let statusRu = activeOrder.status === "In Progress" ? "В ожидании" :
                     activeOrder.status === "Materials Issued" ? "Компоненты выданы" : "В производстве";
      doc.text(`Текущий статус: ${statusRu}`, 14, 40);
      doc.text(`Дата генерации отчета: ${new Date().toLocaleDateString("ru-RU")}`, 14, 45);

      // --- ТАБЛИЦА ---
      doc.autoTable({
        startY: 52, // Сдвинули таблицу ниже, чтобы освободить место для шапки
        head: [["Поз. обозначение", "Наименование", "Кол.", "Примечание"]],
        body: requiredMaterials.map((mat) => [
          mat.sku || "-",
          mat.name || "-",
          mat.qty || "1",
          ""
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
          0: { cellWidth: 35, halign: "center" },
          1: { cellWidth: 100 },
          2: { cellWidth: 15, halign: "center" },
          3: { cellWidth: 30 }
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

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  return (
    <div className="p-10 relative">
      {/* Шапка */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Производственные заказы</h1>
          <p className="text-xs text-slate-400 mt-1">Управление сборкой комплексных заказов клиентов</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchOrders} className="text-xs font-bold uppercase text-slate-600 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
            Обновить
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl shadow-sm flex items-center gap-2"
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
            <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div className="space-y-2 flex-1 mr-4">
                <div className="flex items-center gap-4">
                  <p className="font-bold text-lg text-slate-900">Заказ #{order.id}</p>

                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                    order.status === "Materials Issued"
                      ? "bg-amber-50 text-amber-600 border-amber-100"
                      : order.status === "In Production"
                      ? "bg-green-50 text-green-600 border-green-100"
                      : "bg-blue-50 text-blue-600 border-blue-100"
                  }`}>
                    {order.status === "In Progress" && "В ожидании"}
                    {order.status === "Materials Issued" && "Выданы комплектующие"}
                    {order.status === "In Production" && "В производстве"}
                  </span>
                </div>

                <p className="text-sm text-slate-700 font-medium">
                  Заказчик: <span className="text-slate-900 font-bold">{order.customer_name || "Не указан"}</span>
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

              <div className="flex flex-col gap-2 shrink-0 w-52">
                <button
                  onClick={() => handleOpenDetails(order)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all text-center border border-slate-200/60"
                >
                  Сводная комплектация
                </button>

                {order.status === "In Progress" && (
                  <button
                    onClick={() => issueMaterials(order.id)}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:bg-slate-300"
                  >
                    {loading ? "Выдача..." : "Выдать материалы"}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          !errorText && <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 font-medium">Заказов не найдено.</div>
        )}
      </div>

      {/* ЗАМЕНИТЕ ВЕСЬ БЛОК МОДАЛЬНОГО ОКНА С МАТЕРИАЛАМИ НА ЭТОТ: */}

<div className="flex-1 overflow-y-auto my-4 border border-slate-100 rounded-xl bg-slate-50/50 p-4">
  {materialsLoading ? (
    <p className="text-center text-slate-400">Загрузка спецификации...</p>
  ) : (
    (() => {
      // Группировка данных на лету
      const grouped = requiredMaterials.reduce((acc, item) => {
        const { device, assembly, category } = item;
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
                        {items.map((mat, i) => (
                          <li key={i} className="text-xs text-slate-600 flex justify-between">
                            <span>{mat.name}</span>
                            <span className="font-bold">{mat.qty} шт.</span>
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