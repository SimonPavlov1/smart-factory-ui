import React, { useMemo, useState } from "react";

const itemTypes = [
  { id: "component", label: "Покупная позиция" },
  { id: "assembly", label: "Сборочная единица" },
  { id: "operation", label: "Работа" },
];

function flattenTree(items = [], level = 0, result = []) {
  items.forEach((item) => {
    result.push({ ...item, level });
    if (item.children?.length) flattenTree(item.children, level + 1, result);
  });
  return result;
}

export default function BOMItemForm({ productId, productTree = [], onBack, onSuccess }) {
  const [designName, setDesignName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [designators, setDesignators] = useState("");
  const [itemType, setItemType] = useState("component");
  const [parentId, setParentId] = useState("");
  const [operationRole, setOperationRole] = useState("");
  const [loading, setLoading] = useState(false);

  const parentOptions = useMemo(
    () => flattenTree(productTree).filter((item) => item.item_type === "assembly"),
    [productTree]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let finalResourceId = null;
    let finalResourceType = itemType === "operation" ? "operation" : "raw_string";
    const cleanedName = designName.trim();

    try {
      if (itemType === "assembly") {
        finalResourceType = "product";

        const createProductRes = await fetch("/api/production/setup-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanedName,
            drawing_number: `СПЕЦ.${Math.floor(1000 + Math.random() * 9000)}`,
            version: "1.0",
            is_final: false,
            components: []
          })
        });

        if (!createProductRes.ok) {
          throw new Error("Не удалось создать сборочную единицу в базе.");
        }

        const createdProduct = await createProductRes.json();
        finalResourceId = createdProduct.id;
      }

      const newItem = {
        design_name: cleanedName,
        quantity: Number(quantity),
        designators: designators.trim(),
        is_assembly: itemType === "assembly",
        item_type: itemType,
        parent_id: parentId ? Number(parentId) : null,
        operation_role: itemType === "operation" ? operationRole.trim() : null,
        sort_order: 0,
        resource_id: finalResourceId,
        resource_type: finalResourceType,
        is_resolved: itemType === "assembly" || itemType === "operation"
      };

      const response = await fetch(`/api/production/process-bom/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([newItem]),
      });

      if (response.ok) {
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
    <div className="p-5 sm:p-6 max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 my-4 shadow-xs font-sans text-slate-800">
      <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Новая строка состава изделия
        </h3>
        <button onClick={onBack} type="button" className="text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors">
          Закрыть
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
          {itemTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setItemType(type.id)}
              className={`py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                itemType === type.id ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
            Родительская сборочная единица
          </label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Верхний уровень изделия</option>
            {parentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {"- ".repeat(item.level)}{item.design_name || item.resource?.name || "Без названия"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
            {itemType === "assembly" ? "Название сборочной единицы *" : itemType === "operation" ? "Название работы *" : "Наименование покупной позиции *"}
          </label>
          <input
            type="text"
            required
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            placeholder={itemType === "assembly" ? "Например: Плата УТУД" : itemType === "operation" ? "Например: Гравировка корпуса" : "Например: Антенна Fakra"}
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-medium bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
          />
        </div>

        {itemType === "operation" && (
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
              Исполнительная роль или участок
            </label>
            <input
              type="text"
              value={operationRole}
              onChange={(e) => setOperationRole(e.target.value)}
              placeholder="Например: сборщик, маляр, оператор лазера"
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:border-blue-500 placeholder-slate-400"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">Кол-во *</label>
            <input
              type="number"
              min="0.001"
              step="0.001"
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
          className="w-full text-white p-3 rounded-lg font-bold uppercase text-xs tracking-wider mt-1 transition-all bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
        >
          {loading ? "Сохранение..." : "Добавить в состав изделия"}
        </button>
      </form>
    </div>
  );
}
