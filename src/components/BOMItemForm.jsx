import React, { useMemo, useState } from "react";

const itemTypes = [
  { id: "component", label: "Покупная позиция", hint: "Деталь или материал со склада" },
  { id: "assembly", label: "Сборочная единица", hint: "Узел внутри изделия" },
  { id: "operation", label: "Работа", hint: "Операция техпроцесса" },
];

const fieldClass = "w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10";
const selectFieldClass = `${fieldClass} appearance-none pr-10`;
const labelClass = "block text-[11px] font-bold text-slate-500 mb-2";
const primaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#3F8CFF] bg-[#3F8CFF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#1f78ff] hover:shadow-md active:translate-y-0 disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0";
const neutralButtonClass = "inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0";

function flattenTree(items = [], level = 0, result = []) {
  items.forEach((item) => {
    result.push({ ...item, level });
    if (item.children?.length) flattenTree(item.children, level + 1, result);
  });
  return result;
}

export default function BOMItemForm({ productId, productTree = [], onBack, onSuccess, panel = false }) {
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

  const shellClass = panel
    ? "flex h-full min-h-full flex-col bg-white"
    : "my-4 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm";
  const formClass = panel
    ? "flex min-h-0 flex-1 flex-col"
    : "flex flex-col gap-5 p-5 sm:p-6";
  const contentClass = panel
    ? "flex-1 overflow-y-auto p-5 sm:p-6"
    : "";
  const contentInnerClass = "flex flex-col gap-5";
  const footerClass = panel
    ? "border-t border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6"
    : "flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end";

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
    <div className={shellClass}>
      <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <p className="text-[11px] font-bold text-slate-400">Состав изделия</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Новая позиция</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Добавьте покупную позицию, сборочную единицу или работу в дерево изделия.
          </p>
        </div>
        <button onClick={onBack} type="button" className={`${neutralButtonClass} shrink-0`}>
          Закрыть
        </button>
      </div>

      <form onSubmit={handleSubmit} className={formClass}>
        <div className={contentClass}>
          <div className={contentInnerClass}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {itemTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setItemType(type.id)}
                  className={`min-h-[82px] rounded-2xl border p-4 text-left transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                    itemType === type.id
                      ? "border-[#3F8CFF] bg-blue-50 text-slate-900 shadow-sm"
                      : "border-slate-200 bg-slate-50/80 text-slate-600 hover:border-blue-100 hover:bg-white"
                  }`}
                >
                  <span className="block text-sm font-bold">{type.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{type.hint}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                <label className={labelClass}>
                  {itemType === "assembly" ? "Название сборочной единицы *" : itemType === "operation" ? "Название работы *" : "Наименование покупной позиции *"}
                </label>
                <input
                  type="text"
                  required
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  placeholder={itemType === "assembly" ? "Например: Плата УТУД" : itemType === "operation" ? "Например: Гравировка корпуса" : "Например: Антенна Fakra"}
                  className={fieldClass}
                />

                {itemType === "operation" && (
                  <div className="mt-4">
                    <label className={labelClass}>
                      Исполнительная роль или участок
                    </label>
                    <input
                      type="text"
                      value={operationRole}
                      onChange={(e) => setOperationRole(e.target.value)}
                      placeholder="Например: сборщик, маляр, оператор лазера"
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                <label className={labelClass}>
                  Родительская сборочная единица
                </label>
                <div className="relative">
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className={selectFieldClass}
                  >
                    <option value="">Верхний уровень изделия</option>
                    {parentOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {"- ".repeat(item.level)}{item.design_name || item.resource?.name || "Без названия"}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_1fr]">
              <div>
                <label className={labelClass}>Количество *</label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={`${fieldClass} font-semibold`}
                />
              </div>

              <div>
                <label className={labelClass}>Позиционные обозначения</label>
                <input
                  type="text"
                  value={designators}
                  onChange={(e) => setDesignators(e.target.value)}
                  placeholder="Например: A1 или R1, R2, R3"
                  className={`${fieldClass} font-mono`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={footerClass}>
          {!panel && (
            <button type="button" onClick={onBack} className={neutralButtonClass}>
              Отмена
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`${primaryButtonClass} ${panel ? "w-full" : ""}`}
          >
            {loading ? "Сохранение..." : "Добавить в состав"}
          </button>
        </div>
      </form>
    </div>
  );
}
