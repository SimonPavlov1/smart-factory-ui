import React, { useState, useEffect } from "react";

export default function ProductForm({ onBack, initialData = null }) {
  const [name, setName] = useState("");
  const [drawingNumber, setDrawingNumber] = useState("");
  const [revision, setRevision] = useState("1.0");
  const [loading, setLoading] = useState(false);

  // Определяем, действительно ли это режим редактирования существующего объекта
  const isEditMode = !!(initialData && initialData.id);

  // Заполняем стейты при редактировании
  useEffect(() => {
    if (isEditMode) {
      setName(initialData.name || "");
      setDrawingNumber(initialData.drawing_number || "");
      // На бэкенде поле может называться revision, проверяем оба варианта для надежности
      setRevision(initialData.revision || initialData.version || "1.0");
    }
  }, [initialData, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let url = "";
      let method = "";
      let payload = {};

      // Проверяем, какой тип изделия создается/редактируется (прибор или узел)
      // Если is_subassembly === true ИЛИ is_final === false — это узел (сборочная единица)
      const isSubAssembly = !!(initialData && (initialData.is_subassembly === true || initialData.is_final === false));

      if (isEditMode) {
        // --- РЕЖИМ РЕДАКТИРОВАНИЯ СУЩЕСТВУЮЩЕГО ИЗДЕЛИЯ (PUT) ---
        url = `/api/production/products/${initialData.id}`;
        method = "PUT";
        payload = {
          name: name.trim(),
          drawing_number: drawingNumber.trim() || null,
          revision: revision.trim() || "1.0"
        };
      } else {
        // --- РЕЖИМ СОЗДАНИЯ НОВОГО ОБЪЕКТА (POST) ---
        url = "/api/production/setup-product";
        method = "POST";

        payload = {
          name: name.trim(),
          drawing_number: drawingNumber.trim() || `DEV-${Date.now()}`,
          version: revision.trim() || "1.0", // Бэкенд ждет "version" в ProductCreateSchema
          is_final: !isSubAssembly, // Если узел, то is_final = false
          components: []
        };
      }

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(isEditMode ? "Данные изделия успешно изменены!" : "Успешно сохранено!");
        onBack();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`Ошибка бэкенда (${response.status}): ${errData.detail || JSON.stringify(errData)}`);
      }
    } catch (error) {
      console.error(error);
      alert("Ошибка сети.");
    } finally {
      setLoading(false);
    }
  };

  // Определяем, работаем ли мы сейчас со сборочной единицей для настройки цвета интерфейса
  const isSubAssemblyUnit = !!(initialData && (initialData.is_subassembly === true || initialData.is_final === false));

  return (
    <div className="p-6 sm:p-10 max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 my-6 shadow-xs font-sans text-slate-800">
      <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900">
          {isEditMode
            ? `✏️ Редактирование паспорта ${isSubAssemblyUnit ? "(узла)" : "(изделия)"}`
            : isSubAssemblyUnit
              ? "🧩 Создание сборочной единицы (узла)"
              : "📦 Создание нового изделия"}
        </h2>
        <button onClick={onBack} type="button" className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-wider transition-colors">
          Отмена
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* НАИМЕНОВАНИЕ */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
            Название устройства / Изделия *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isSubAssemblyUnit ? "Например: Плата управления индикацией" : "Например: Центральный процессорный блок (ЦПБ)"}
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-medium bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
          />
        </div>

        {/* НОМЕР ЧЕРТЕЖА И РЕВИЗИЯ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
              Децимальный номер (Номер чертежа)
            </label>
            <input
              type="text"
              value={drawingNumber}
              onChange={(e) => setDrawingNumber(e.target.value)}
              placeholder="АБВГ.123456.001"
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono bg-white focus:outline-none focus:border-blue-500 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
              Ревизия / Версия *
            </label>
            <input
              type="text"
              required
              value={revision}
              onChange={(e) => setRevision(e.target.value)}
              placeholder="1.0"
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-semibold bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white p-3 rounded-lg font-bold uppercase text-xs tracking-wider mt-4 transition-all ${
            isSubAssemblyUnit ? "bg-indigo-600 hover:bg-indigo-700" : "bg-blue-600 hover:bg-blue-700"
          } disabled:bg-slate-200 disabled:text-slate-400`}
        >
          {loading ? "Сохранение..." : isEditMode ? "Сохранить изменения" : "Внести в базу данных"}
        </button>
      </form>
    </div>
  );
}