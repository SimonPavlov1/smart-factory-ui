import React, { useState, useEffect, useRef } from "react";

const categoryPresets = {
  "Резисторы": ["Производитель", "Точность", "Мощность"],
  "Конденсаторы": ["Производитель", "Тип диэлектрика", "Точность"],
  "Микросхемы": ["Производитель", "Интерфейс", "Диапазон питания"],
  "Разъемы": ["Производитель", "Количество контактов", "Шаг", "Монтаж", "Ориентация"],
  "Кабели": ["Длина", "Сечение", "Цвет", "Тип"],
  "Крепеж": ["Материал", "Размер", "Покрытие"],
};

function specsToRows(specifications = {}) {
  const rows = Object.entries(specifications || {}).map(([key, value]) => ({
    id: `${key}-${Math.random().toString(16).slice(2)}`,
    key,
    value: value == null ? "" : String(value),
  }));
  return rows.length ? rows : [{ id: "empty", key: "", value: "" }];
}

function normalizeVoltage(value) {
  if (value === "" || value == null) return null;
  const normalized = String(value).replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function InventoryForm({ onBack, onSuccess, initialData = null, panel = false }) {
  const [name, setName] = useState(initialData?.name || "");
  const [partNumber, setPartNumber] = useState(initialData?.part_number || "");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialData?.category || "");
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [packageType, setPackageType] = useState(initialData?.package || "");
  const [value, setValue] = useState(initialData?.value || "");
  const [voltage, setVoltage] = useState(initialData?.voltage || "");
  const [specRows, setSpecRows] = useState(() => specsToRows(initialData?.specifications));
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Состояния для кастомного выпадающего списка
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/inventory/components/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          if (!selectedCategory && data.length > 0) setSelectedCategory(data[0]);
        }
      } catch (err) { console.error(err); } finally { setCategoriesLoading(false); }
    };
    fetchCategories();
  }, []);

  // Закрытие дропдауна при клике вне его
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !partNumber.trim()) return alert("Заполните обязательные поля!");

    const finalCategory = isCreatingNewCategory ? newCategoryName.trim() : selectedCategory;
    setLoading(true);

    try {
      const url = initialData
        ? `/api/inventory/components/${initialData.id}`
        : "/api/inventory/components";

      const specifications = specRows.reduce((acc, row) => {
        const key = row.key.trim();
        const val = row.value.trim();
        if (key && val) acc[key] = val;
        return acc;
      }, {});

      const res = await fetch(url, {
        method: initialData ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          part_number: partNumber.trim(),
          category: finalCategory,
          package: packageType.trim() || null,
          value: value.trim() || null,
          value_numeric: null,
          voltage: normalizeVoltage(voltage),
          specifications
        })
      });

      if (res.ok) { onSuccess(); onBack(); }
      else { const errData = await res.json(); alert(errData.detail); }
    } catch (err) { alert("Ошибка сети"); } finally { setLoading(false); }
  };

  const inputStyle = "w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10";
  const labelStyle = "block text-[11px] font-bold text-slate-500 mb-2";
  const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#3F8CFF] bg-[#3F8CFF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#1f78ff] hover:shadow-md active:translate-y-0 disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0";
  const neutralButton = "inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0";
  const shellClass = panel
    ? "min-h-full w-full font-sans antialiased text-slate-800"
    : "p-4 sm:p-6 md:p-10 max-w-4xl mx-auto w-full font-sans antialiased text-slate-800";

  const addSpecRow = (presetKey = "") => {
    setSpecRows((current) => [...current, { id: `${Date.now()}-${Math.random()}`, key: presetKey, value: "" }]);
  };

  const updateSpecRow = (id, patch) => {
    setSpecRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  const removeSpecRow = (id) => {
    setSpecRows((current) => current.length > 1 ? current.filter((row) => row.id !== id) : [{ id: "empty", key: "", value: "" }]);
  };

  const presetKeys = categoryPresets[selectedCategory] || categoryPresets[newCategoryName] || [];
  const existingSpecKeys = new Set(specRows.map((row) => row.key.trim()).filter(Boolean));

  return (
    <div className={shellClass}>
      <div className={`${panel ? "min-h-full rounded-none border-0 shadow-none" : "overflow-hidden rounded-3xl border border-slate-100 shadow-sm"} bg-white`}>
      <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <p className="text-[11px] font-bold text-slate-400">Склад ТМЦ</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">
            {initialData ? "Редактирование позиции" : "Новая позиция"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Карточка складского компонента для учета остатков и подбора в составах изделий.</p>
        </div>
        <button onClick={onBack} type="button" className={`${neutralButton} shrink-0`}>Закрыть</button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <label className={labelStyle}>Наименование *</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputStyle} placeholder="Например: Чип-конденсатор" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
            <label className={labelStyle}>Артикул (MPN) *</label>
            <input type="text" required value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className={`${inputStyle} font-mono`} placeholder="Например: RC0603FR" />
          </div>

          {/* Кастомный выпадающий список */}
          <div className="relative rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5" ref={dropdownRef}>
            <label className={labelStyle}>Категория</label>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`${inputStyle} flex justify-between items-center text-left`}
            >
              <span className="truncate">{isCreatingNewCategory ? newCategoryName || "Введите название..." : selectedCategory || "Выберите категорию"}</span>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isOpen && (
              <div className="absolute left-4 right-4 z-10 mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-xl">
                {categories.map(cat => (
                  <button
                    key={cat} type="button"
                    onClick={() => { setSelectedCategory(cat); setIsCreatingNewCategory(false); setIsOpen(false); }}
                    className="w-full px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 text-left transition-colors"
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setIsCreatingNewCategory(true); setIsOpen(false); }}
                  className="w-full px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 text-left transition-colors border-t border-slate-50"
                >
                  + Создать новую...
                </button>
              </div>
            )}
          </div>
        </div>

        {isCreatingNewCategory && (
          <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5 animate-in fade-in duration-300">
            <label className={labelStyle}>Название новой категории *</label>
            <input type="text" required value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className={inputStyle} placeholder="Например: Оптопары" />
          </div>
        )}

        <div>
          <h3 className="text-sm font-black text-slate-900">Базовые параметры</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={labelStyle}>Корпус</label>
            <input type="text" value={packageType} onChange={(e) => setPackageType(e.target.value)} className={inputStyle} placeholder="0603" />
          </div>
          <div>
            <label className={labelStyle}>Номинал</label>
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} className={inputStyle} placeholder="10 кОм" />
          </div>
          <div>
            <label className={labelStyle}>Напряжение, В</label>
            <input type="text" value={voltage} onChange={(e) => setVoltage(e.target.value)} className={inputStyle} placeholder="50" />
          </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Характеристики</h3>
              <p className="mt-1 text-xs text-slate-500">Добавляйте только свойства, которые реально нужны для этой позиции.</p>
            </div>
            <button type="button" onClick={() => addSpecRow()} className={`${neutralButton} min-h-9 px-3 py-2 text-xs`}>
              Добавить
            </button>
          </div>

          {presetKeys.some((key) => !existingSpecKeys.has(key)) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {presetKeys.filter((key) => !existingSpecKeys.has(key)).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => addSpecRow(key)}
                  className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  {key}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {specRows.map((row) => (
              <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) => updateSpecRow(row.id, { key: e.target.value })}
                  className={inputStyle}
                  placeholder="Свойство"
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateSpecRow(row.id, { value: e.target.value })}
                  className={inputStyle}
                  placeholder="Значение"
                />
                <button
                  type="button"
                  onClick={() => removeSpecRow(row.id)}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-100"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onBack} className={neutralButton}>Отмена</button>
          <button type="submit" disabled={loading} className={primaryButton}>
            {loading ? "Сохранение..." : initialData ? "Сохранить изменения" : "Создать позицию"}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
