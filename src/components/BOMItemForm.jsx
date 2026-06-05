import React, { useState } from "react";

export default function BOMItemForm({ productId, onBack, onSuccess }) {
  const [designName, setDesignName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [designators, setDesignators] = useState("");
  const [isAssembly, setIsAssembly] = useState(false); // Покупное или Сборочная единица
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let finalResourceId = null;
    let finalResourceType = "raw_string";
    const cleanedName = designName.trim();

    try {
      // ЕСЛИ ПОЛЬЗОВАТЕЛЬ СОЗДАЕТ СБОРOЧНУЮ ЕДИНИЦУ (УЗЕЛ)
      if (isAssembly) {
        finalResourceType = "product";

        // 1. Автоматически создаем этот узел как самостоятельное изделие в базе данных
        const createProductRes = await fetch("http://127.0.0.1:8000/production/setup-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanedName,
            drawing_number: `СПЕЦ.${Math.floor(1000 + Math.random() * 9000)}`, // Авто-номер чертежа
            version: "1.0",
            is_final: false, // Строго указываем, что это НЕ финальное изделие (т.е. узел)
            components: []
          })
        });

        if (!createProductRes.ok) {
          throw new Error("Не удалось автоматически сгенерировать сборочную единицу в базе.");
        }

        const createdProduct = await createProductRes.json();
        finalResourceId = createdProduct.id;
      }

      // 2. Формируем строку спецификации для текущего родительского устройства
      const newItem = {
        design_name: cleanedName,
        quantity: Number(quantity),
        designators: designators.trim(),
        is_assembly: isAssembly,
        resource_id: finalResourceId,
        resource_type: finalResourceType,
        is_resolved: isAssembly // Если узел только что создан, он автоматически считается разрешенным внутренним ресурсом
      };

      // Отправляем позицию в BOM текущего устройства
      const response = await fetch(`http://127.0.0.1:8000/production/process-bom/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([newItem]),
      });

      if (response.ok) {
        alert(isAssembly ? `Сборочная единица "${cleanedName}" успешно создана!` : "Покупное изделие добавлено!");
        onSuccess();
        onBack();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Ошибка бэкенда: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error(error);
      alert(`Ошибка: ${error.message || "Ошибка сети"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 max-w-xl mx-auto bg-white rounded-xl border border-slate-200 my-4 shadow-xs font-sans text-slate-800">
      <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Внедрение позиции в спецификацию
        </h3>
        <button onClick={onBack} type="button" className="text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors">
          Закрыть
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* ПЕРЕКЛЮЧАТЕЛЬ ТИПА ПОЗИЦИИ */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setIsAssembly(false)}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
              !isAssembly ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Покупное изделие
          </button>
          <button
            type="button"
            onClick={() => setIsAssembly(true)}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
              isAssembly ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Сборочная единица
          </button>
        </div>

        {/* НАИМЕНОВАНИЕ */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
            {isAssembly ? "Название новой сборочной единицы (платы, модуля) *" : "Наименование покупного изделия (для подбора) *"}
          </label>
          <input
            type="text"
            required
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            placeholder={isAssembly ? "Например: Плата дисплея ЦП" : "Например: Резистор 10 кОм 0805"}
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-medium bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
          />
        </div>

        {/* КОЛИЧЕСТВО И ОБОЗНАЧЕНИЯ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">Кол-во *</label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-semibold bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">Позиционные обозначения</label>
            <input
              type="text"
              value={designators}
              onChange={(e) => setDesignators(e.target.value)}
              placeholder="Например: A1 или R1, R2, R3"
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono bg-white focus:outline-none focus:border-blue-500 placeholder-slate-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white p-3 rounded-lg font-bold uppercase text-xs tracking-wider mt-1 transition-all ${
            isAssembly ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-900 hover:bg-slate-800"
          } disabled:bg-slate-200 disabled:text-slate-400`}
        >
          {loading ? "Создание и привязка..." : "Внедрить в устройство"}
        </button>
      </form>
    </div>
  );
}