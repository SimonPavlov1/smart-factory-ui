import React, { useState, useEffect } from "react";

export default function ManufacturingPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const fetchOrders = async () => {
    try {
      setErrorText("");
      // ВАЖНО: Проверьте префикс путей. Если в main.py нет общего префикса /api,
      // замените путь на "/manufacturing/orders"
      const res = await fetch("/api/manufacturing/orders");

      if (!res.ok) {
        throw new Error(`Ошибка сервера: Статус ${res.status}`);
      }

      const data = await res.json();
      console.log("Данные производственных заказов с сервера:", data);

      // Жесткая проверка: записываем в стейт ТОЛЬКО массив
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        console.error("Сервер вернул не массив данных:", data);
        setOrders([]);
        setErrorText("Получены некорректные данные от сервера.");
      }
    } catch (err) {
      console.error("Ошибка при получении заказов:", err);
      setErrorText("Не удалось загрузить заказы. Проверьте соединение с бэкендом.");
      setOrders([]);
    }
  };

  const issueMaterials = async (orderId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manufacturing/orders/${orderId}/issue-materials`, {
        method: "POST"
      });

      if (res.ok) {
        alert("Материалы успешно выданы в производство!");
        await fetchOrders(); // Обновляем список после изменения статуса
      } else {
        const errorData = await res.json();
        alert(`Ошибка: ${errorData.detail || "Не удалось выдать материалы"}`);
      }
    } catch (err) {
      alert("Ошибка сети при попытке выдать материалы");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Производственные заказы</h1>
        <button
          onClick={fetchOrders}
          className="text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          Обновить данные
        </button>
      </div>

      {/* Вывод ошибки, если она произошла */}
      {errorText && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm">
          {errorText}
        </div>
      )}

      <div className="space-y-4">
        {Array.isArray(orders) && orders.length > 0 ? (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center animate-in fade-in duration-200"
            >
              <div>
                <p className="font-bold text-lg text-slate-900">Заказ #{order.id}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Изделие ID: <span className="font-semibold text-slate-700">{order.product_id}</span> |
                  Кол-во: <span className="font-semibold text-slate-700">{order.target_qty} шт.</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Статус:</span>
                  <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${
                    order.status === "In Production" 
                      ? "bg-green-50 text-green-600 border border-green-100" 
                      : "bg-blue-50 text-blue-600 border border-blue-100"
                  }`}>
                    {order.status === "In Progress" ? "В ожидании" : "В производстве"}
                  </span>
                </div>
              </div>

              {order.status === "In Progress" && (
                <button
                  onClick={() => issueMaterials(order.id)}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm shadow-indigo-100 disabled:bg-slate-300"
                >
                  {loading ? "Выдача..." : "Выдать материалы"}
                </button>
              )}
            </div>
          ))
        ) : (
          !errorText && (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 font-medium">
              Активных производственных заказов не найдено.
            </div>
          )
        )}
      </div>
    </div>
  );
}