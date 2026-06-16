import React, { useState, useEffect, useRef } from "react";

export default function InventoryForm({ onBack, onSuccess, initialData = null }) {
  const [name, setName] = useState(initialData?.name || "");
  const [partNumber, setPartNumber] = useState(initialData?.part_number || "");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialData?.category || "");
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [packageType, setPackageType] = useState(initialData?.package || "");
  const [value, setValue] = useState(initialData?.value || "");
  const [voltage, setVoltage] = useState(initialData?.voltage || "");
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
          voltage: voltage.trim() || null,
          specifications: {}
        })
      });

      if (res.ok) { onSuccess(); onBack(); }
      else { const errData = await res.json(); alert(errData.detail); }
    } catch (err) { alert("Ошибка сети"); } finally { setLoading(false); }
  };

  const inputStyle = "w-full p-4 border border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-slate-300 focus:ring-0 outline-none transition-all font-bold text-sm text-slate-900";
  const labelStyle = "block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest ml-1";

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm max-w-3xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {initialData ? "Редактирование карточки" : "Регистрация новой ТМЦ"}
          </h2>
        </div>
        <button onClick={onBack} className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">Отмена</button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label className={labelStyle}>Наименование *</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputStyle} placeholder="Например: Чип-конденсатор" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}>Артикул (MPN) *</label>
            <input type="text" required value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className={`${inputStyle} font-mono`} placeholder="Например: RC0603FR" />
          </div>

          {/* Кастомный выпадающий список */}
          <div className="relative" ref={dropdownRef}>
            <label className={labelStyle}>Категория</label>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`${inputStyle} flex justify-between items-center text-left`}
            >
              <span className="truncate">{isCreatingNewCategory ? newCategoryName || "Введите название..." : selectedCategory || "Выберите категорию"}</span>
              <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isOpen && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl py-1">
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
          <div className="animate-in fade-in duration-300">
            <label className={labelStyle}>Название новой категории *</label>
            <input type="text" required value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className={`${inputStyle} border-blue-200`} placeholder="Например: Оптопары" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelStyle}>Корпус</label>
            <input type="text" value={packageType} onChange={(e) => setPackageType(e.target.value)} className={inputStyle} placeholder="0603" />
          </div>
          <div>
            <label className={labelStyle}>Номинал</label>
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} className={inputStyle} placeholder="10 кОм" />
          </div>
          <div>
            <label className={labelStyle}>Вольтаж/Параметр</label>
            <input type="text" value={voltage} onChange={(e) => setVoltage(e.target.value)} className={inputStyle} placeholder="50V" />
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full mt-4 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
        >
          {loading ? "Сохранение..." : initialData ? "Сохранить изменения" : "Зарегистрировать"}
        </button>
      </form>
    </div>
  );
}