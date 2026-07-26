import React, { useEffect, useState } from "react";

const Icons = {
  Device: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Assembly: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
};

export default function ProductForm({ onBack, initialData = null, panel = false }) {
  const [name, setName] = useState("");
  const [drawingNumber, setDrawingNumber] = useState("");
  const [revision, setRevision] = useState("1.0");
  const [testChecklist, setTestChecklist] = useState([]);
  const [requiresPreassemblyTest, setRequiresPreassemblyTest] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditMode = !!(initialData && initialData.id);
  const isSubAssemblyUnit = !!(initialData && (initialData.is_subassembly === true || initialData.is_final === false));
  const typeTitle = isSubAssemblyUnit ? "Сборочная единица" : "Готовое устройство";
  const typeDescription = isSubAssemblyUnit
    ? "Узел, плата, корпусная сборка или полуфабрикат, который может входить в состав устройства."
    : "Финальное изделие, которое можно запускать в производство и ставить в заказ.";
  const shellClass = panel
    ? "min-h-full w-full font-sans text-slate-800"
    : "p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto w-full font-sans text-slate-800";

  useEffect(() => {
    queueMicrotask(() => {
      if (isEditMode) {
        setName(initialData.name || "");
        setDrawingNumber(initialData.drawing_number || "");
        setRevision(initialData.revision || initialData.version || "1.0");
        setTestChecklist((initialData.test_checklist || []).map((item) => typeof item === "string" ? item : item.label || ""));
        setRequiresPreassemblyTest(!!initialData.requires_preassembly_test);
      } else {
        setName("");
        setDrawingNumber("");
        setRevision("1.0");
        setTestChecklist([]);
        setRequiresPreassemblyTest(false);
      }
    });
  }, [initialData, isEditMode]);

  const addChecklistItem = () => {
    setTestChecklist((current) => [...current, ""]);
  };

  const changeChecklistItem = (index, value) => {
    setTestChecklist((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  const removeChecklistItem = (index) => {
    setTestChecklist((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = isEditMode
        ? {
            name: name.trim(),
            drawing_number: drawingNumber.trim() || null,
            revision: revision.trim() || "1.0",
            test_checklist: testChecklist.map((item) => item.trim()).filter(Boolean),
            requires_preassembly_test: requiresPreassemblyTest,
          }
        : {
            name: name.trim(),
            drawing_number: drawingNumber.trim() || `DEV-${Date.now()}`,
            version: revision.trim() || "1.0",
            is_final: !isSubAssemblyUnit,
            test_checklist: testChecklist.map((item) => item.trim()).filter(Boolean),
            requires_preassembly_test: requiresPreassemblyTest,
            components: [],
          };

      const response = await fetch(
        isEditMode ? `/api/production/products/${initialData.id}` : "/api/production/setup-product",
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
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

  return (
    <div className={shellClass}>
      <div className={`${panel ? "sticky top-0 z-10 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6" : "mb-6"} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <button
            onClick={onBack}
            type="button"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-wider mb-3"
          >
            <Icons.ArrowLeft />
            Назад
          </button>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {isEditMode ? "Паспорт изделия" : "Новое изделие"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditMode ? "Обновите основные реквизиты карточки." : "Создайте карточку, затем добавьте состав, документы и фото."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`${panel ? "p-5 sm:p-6" : ""} grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5`}>
        <section className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm h-fit">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Тип карточки</p>
          <div className={`border rounded-2xl p-4 ${isSubAssemblyUnit ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
            <div className="w-10 h-10 rounded-2xl bg-white/80 border border-current/20 flex items-center justify-center mb-3">
              {isSubAssemblyUnit ? <Icons.Assembly /> : <Icons.Device />}
            </div>
            <h2 className="text-base font-black text-slate-900">{typeTitle}</h2>
            <p className="text-xs leading-relaxed mt-2 text-slate-600">{typeDescription}</p>
          </div>

          {!isEditMode && (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-700">После сохранения</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Откроется база изделий. Зайдите в карточку и добавьте дерево состава: сборочные единицы, покупные позиции и работы.
              </p>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <button
              type="button"
              role="switch"
              aria-checked={requiresPreassemblyTest}
              onClick={() => setRequiresPreassemblyTest((current) => !current)}
              className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors ${
                requiresPreassemblyTest
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-slate-50/70 hover:bg-slate-50"
              }`}
            >
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900">Проверять до сборки в корпус</span>
                <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500">
                  Система сначала создаст задачу тестировщику. Годные устройства попадут в пул сборки, бракованные — в ремонт.
                </span>
              </span>
              <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${requiresPreassemblyTest ? "bg-blue-600" : "bg-slate-300"}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${requiresPreassemblyTest ? "translate-x-6" : "translate-x-1"}`} />
              </span>
            </button>
          </div>

          <div className="p-5 sm:p-6 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Основные данные</p>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                  Наименование *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isSubAssemblyUnit ? "Например: Плата УТУД" : "Например: УТУД-10"}
                  className="w-full p-4 text-base border border-slate-200 rounded-2xl text-slate-900 font-bold bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px] gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                    Децимальный №
                  </label>
                  <input
                    type="text"
                    value={drawingNumber}
                    onChange={(e) => setDrawingNumber(e.target.value)}
                    placeholder="АБВГ.123456.001"
                    className="w-full p-3.5 text-sm border border-slate-200 rounded-2xl text-slate-800 font-mono bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                    Ревизия *
                  </label>
                  <input
                    type="text"
                    required
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                    placeholder="1.0"
                    className="w-full p-3.5 text-sm border border-slate-200 rounded-2xl text-slate-900 font-bold bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 border-b border-slate-100">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Чеклист тестирования</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Эти пункты попадут в задачу тестировщика для этого изделия.</p>
              </div>
              <button
                type="button"
                onClick={addChecklistItem}
                className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 px-4 text-xs font-black text-blue-700 hover:bg-blue-100"
              >
                Добавить пункт
              </button>
            </div>
            <div className="space-y-2">
              {testChecklist.length === 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400">
                  Чеклист пока не задан.
                </div>
              )}
              {testChecklist.map((item, index) => (
                <div key={index} className="grid grid-cols-[32px_minmax(0,1fr)_90px] gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-2">
                  <div className="flex h-10 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-400">{index + 1}</div>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => changeChecklistItem(index, e.target.value)}
                    placeholder="Например: проверка питания 24В"
                    className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(index)}
                    className="rounded-xl border border-red-100 bg-white text-xs font-black text-red-600 hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6 bg-slate-50 flex flex-col sm:flex-row justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className={`px-6 py-3 rounded-2xl text-white font-black uppercase text-xs tracking-wider transition-all ${
                isSubAssemblyUnit ? "bg-indigo-600 hover:bg-indigo-700" : "bg-blue-600 hover:bg-blue-700"
              } disabled:bg-slate-200 disabled:text-slate-400`}
            >
              {loading ? "Сохранение..." : isEditMode ? "Сохранить паспорт" : "Создать карточку"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
