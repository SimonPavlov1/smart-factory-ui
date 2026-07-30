import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import InventoryForm from "./InventoryForm";
import { formatYekaterinburgDateTime } from "../dateTime";

// Иконки
const Icons = {
  Plus: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Incoming: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Search: () => <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Close: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  ChevronDown: ({ className = "w-4 h-4" }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>,
  Box: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
};

const buttonBase = "inline-flex items-center justify-center gap-2 rounded-xl text-[12px] font-semibold border transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0";
const buttonStyles = {
  primary: `${buttonBase} bg-[#3F8CFF] hover:bg-[#1f78ff] text-white border-[#3F8CFF] shadow-sm hover:shadow-md`,
  danger: `${buttonBase} bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100 hover:border-rose-200`,
  neutral: `${buttonBase} bg-white hover:bg-slate-50 text-slate-600 border-slate-200`,
  iconNeutral: "inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-500 hover:text-[#3F8CFF] border border-slate-200 hover:border-blue-200 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0",
  iconDanger: "inline-flex items-center justify-center w-8 h-8 rounded-xl bg-rose-50 text-rose-500 hover:text-rose-700 border border-rose-100 hover:border-rose-200 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0",
};

function userHasRole(user, roles) {
  const userRoles = Array.isArray(user?.roles) && user.roles.length ? user.roles : user?.role ? [user.role] : [];
  return userRoles.some((role) => roles.includes(role));
}

export default function InventoryBase({ user }) {
  const [components, setComponents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [componentPanelTab, setComponentPanelTab] = useState("details");
  const [componentMovements, setComponentMovements] = useState([]);
  const [movementLimit, setMovementLimit] = useState(25);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [incomingCompId, setIncomingCompId] = useState(null);
  const [incomingQty, setIncomingQty] = useState("");
  const [editingQtyId, setEditingQtyId] = useState(null);
  const [tempQty, setTempQty] = useState("");
  const categoryFilterRef = useRef(null);
  const loadMoreRef = useRef(null);
  const activeRequestRef = useRef(null);
  const hasMoreRef = useRef(true);

  const fetchComponents = useCallback(async ({ reset = false, cursor = null } = {}) => {
    if (!reset && (!hasMoreRef.current || activeRequestRef.current)) return;
    if (reset && activeRequestRef.current) activeRequestRef.current.abort();

    const controller = new AbortController();
    activeRequestRef.current = controller;
    setListLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    const searchStr = appliedSearch.trim();
    if (searchStr.trim()) params.set("search", searchStr.trim());
    if (!reset && cursor) params.set("after_id", String(cursor));
    selectedCategories.forEach((category) => params.append("categories", category));

    try {
      const res = await fetch(`/api/inventory/components/page?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setComponents((current) => reset ? items : [...current, ...items]);
      setNextCursor(data.next_cursor ?? null);
      hasMoreRef.current = Boolean(data.has_more);
      setHasMore(hasMoreRef.current);
    } catch (error) {
      if (error.name !== "AbortError") console.error(error);
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setListLoading(false);
      }
    }
  }, [appliedSearch, selectedCategories]);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => fetchComponents({ reset: true }), 0);
    return () => {
      clearTimeout(timer);
      activeRequestRef.current?.abort();
    };
  }, [fetchComponents]);

  useEffect(() => {
    fetch("/api/inventory/components/categories")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedComponent?.id || componentPanelTab !== "history") {
      queueMicrotask(() => {
        setComponentMovements([]);
        setMovementsLoading(false);
      });
      return undefined;
    }
    const controller = new AbortController();
    queueMicrotask(() => setMovementsLoading(true));
    fetch(`/api/inventory/movements?component_id=${selectedComponent.id}&limit=${movementLimit}`, { signal: controller.signal })
      .then((res) => res.ok ? res.json() : { items: [] })
      .then((data) => setComponentMovements(Array.isArray(data.items) ? data.items : []))
      .catch((error) => { if (error.name !== "AbortError") console.error(error); })
      .finally(() => setMovementsLoading(false));
    return () => controller.abort();
  }, [selectedComponent?.id, componentPanelTab, movementLimit]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !listLoading && nextCursor) {
          fetchComponents({ cursor: nextCursor });
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchComponents, hasMore, listLoading, nextCursor]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(event.target)) {
        setIsCategoryFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить позицию?")) return;
    const res = await fetch(`/api/inventory/components/${id}`, { method: "DELETE" });
    if (res.ok) fetchComponents({ reset: true });
  };

  const handleUpdateQty = async (id, val) => {
    const res = await fetch(`/api/inventory/components/${id}/quantity?new_quantity=${val}`, { method: "PATCH" });
    if (res.ok) { setEditingQtyId(null); fetchComponents({ reset: true }); }
  };

  const handleIncomingSubmit = async (e, id) => {
    e.preventDefault();
    const res = await fetch(`/api/inventory/incoming?component_id=${id}&quantity=${incomingQty}`, { method: "POST" });
    if (res.ok) { setIncomingCompId(null); setIncomingQty(""); fetchComponents({ reset: true }); }
  };

  const openEditForm = (component = null) => {
    setSelectedComponent(null);
    setEditingComponent(component);
    setShowForm(true);
  };

  const closeSidePanel = () => {
    setShowForm(false);
    setEditingComponent(null);
    setSelectedComponent(null);
  };

  const groupedComponents = components
    .filter(c => selectedCategories.length === 0 || selectedCategories.includes(c.category || "Без категории"))
    .reduce((acc, comp) => {
      const cat = comp.category || "Без категории";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(comp);
      return acc;
    }, {});

  const canEditInventory = userHasRole(user, ["admin", "warehouse"]);
  const visibleCount = Object.values(groupedComponents).reduce((sum, items) => sum + items.length, 0);
  const categoryFilterLabel = selectedCategories.length === 0
    ? "Все категории"
    : selectedCategories.length === 1
      ? selectedCategories[0]
      : `Категории: ${selectedCategories.length}`;

  const toggleCategory = (category) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  return (
    <div className="workspace-page inventory-page w-full max-w-none p-4 font-sans text-slate-800 antialiased sm:p-6 md:p-10">
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-5 sm:p-6 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-slate-400">Склад</p>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">Склад ТМЦ</h1>
            <p className="text-sm text-slate-500 mt-2">
              Загружено {visibleCount} позиций{hasMore ? " — остальные подгрузятся при прокрутке" : ""}.
            </p>
          </div>
          {canEditInventory && (
            <button onClick={() => openEditForm(null)} className={`${buttonStyles.primary} w-full sm:w-auto h-10 px-5`}>
              <Icons.Plus /> Создать позицию
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-4 sm:p-5 mb-5">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr)_280px] gap-3">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2"><Icons.Search /></span>
              <input
                type="text"
                placeholder="Поиск по складу"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 pl-10 pr-10 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <Icons.Close />
                </button>
              )}
            </div>
            <div className="relative" ref={categoryFilterRef}>
              <button
                type="button"
                onClick={() => setIsCategoryFilterOpen((value) => !value)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 focus:border-[#3F8CFF] focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                <span className="truncate">{categoryFilterLabel}</span>
                <Icons.ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isCategoryFilterOpen ? "rotate-180" : ""}`} />
              </button>

              {isCategoryFilterOpen && (
                <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
                    <span className="text-xs font-bold text-slate-500">Категории</span>
                    {selectedCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategories([])}
                        className="text-xs font-semibold text-[#3F8CFF] hover:text-[#1f78ff]"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {categories.map(cat => (
                      <label
                        key={cat}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                          className="h-4 w-4 rounded border-slate-300 text-[#3F8CFF] focus:ring-[#3F8CFF]"
                        />
                        <span className="min-w-0 flex-1 truncate">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 lg:col-span-2">
                {selectedCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  {cat}
                  <Icons.Close />
                </button>
              ))}
              </div>
            )}
          </div>
      </div>

      {Object.entries(groupedComponents).map(([category, items]) => (
        <div key={category} className="mb-8">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm flex items-center justify-between gap-3 mb-3">
            <span>{category}</span>
            <span className="text-xs text-slate-400">{items.length} поз.</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((comp) => (
              <div
                key={comp.id}
                onClick={() => {
                  setComponentPanelTab("details");
                  setMovementLimit(25);
                  setSelectedComponent(comp);
                }}
                className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all flex flex-col justify-between group min-w-0 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-black text-base text-slate-900 leading-tight group-hover:text-blue-600 transition-colors truncate">{comp.name}</h4>
                      <p className="text-xs font-mono text-slate-400 mt-1 truncate">{comp.part_number || "Без артикула"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${Number(comp.quantity || 0) > 0 ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-600"}`}>
                      {comp.quantity || 0} шт.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      comp.package,
                      comp.value,
                      comp.voltage,
                      ...Object.entries(comp.specifications || {}).slice(0, 3).map(([key, val]) => `${key}: ${val}`)
                    ].filter(Boolean).map((attr, i) => (
                      <span key={i} className="bg-slate-50 text-slate-500 border border-slate-100 px-2.5 py-1 rounded-full text-[11px] font-bold">{attr}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
                  {editingQtyId === comp.id ? (
                    <input type="number" autoFocus className="w-24 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10" value={tempQty} onChange={(e) => setTempQty(e.target.value)} onBlur={() => handleUpdateQty(comp.id, tempQty)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateQty(comp.id, tempQty)} />
                  ) : (
                    <span onClick={(e) => { e.stopPropagation(); if (canEditInventory) { setEditingQtyId(comp.id); setTempQty(comp.quantity || 0); } }} className={`text-xs font-semibold ${canEditInventory ? "cursor-pointer hover:text-[#3F8CFF]" : ""} transition-colors text-slate-400`} title={canEditInventory ? "Нажмите для редактирования" : "Остаток на складе"}>
                      Изменить остаток
                    </span>
                  )}

                  {canEditInventory && <div className="flex items-center gap-1">
                    {incomingCompId === comp.id ? (
                      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => handleIncomingSubmit(e, comp.id)} className="flex items-center gap-2">
                        <input type="number" className="w-20 rounded-xl border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#3F8CFF]" value={incomingQty} onChange={(e) => setIncomingQty(e.target.value)} />
                        <button type="submit" className={`${buttonStyles.primary} h-8 px-3`}>OK</button>
                      </form>
                    ) : (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setIncomingCompId(comp.id); }} className={buttonStyles.iconNeutral} title="Оприходовать"><Icons.Incoming /></button>
                        <button onClick={(e) => { e.stopPropagation(); openEditForm(comp); }} className={buttonStyles.iconNeutral} title="Редактировать"><Icons.Edit /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(comp.id); }} className={buttonStyles.iconDanger} title="Удалить"><Icons.Trash /></button>
                      </>
                    )}
                  </div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center py-4">
        {listLoading && <span className="text-sm font-semibold text-slate-400">Загрузка позиций…</span>}
        {!listLoading && !hasMore && components.length > 0 && (
          <span className="text-sm font-semibold text-slate-300">Все позиции загружены</span>
        )}
        {!listLoading && components.length === 0 && (
          <span className="text-sm font-semibold text-slate-400">Позиции не найдены</span>
        )}
      </div>

      {selectedComponent && !showForm && createPortal((
        <div className="inventory-detail-overlay fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Закрыть карточку"
            className="hidden flex-1 cursor-default md:block"
            onClick={closeSidePanel}
          />
          <div className={`inventory-detail-panel h-full w-full bg-white shadow-2xl ${componentPanelTab === "history" ? "max-w-5xl" : "max-w-2xl"}`}>
            <div className="flex h-full flex-col bg-white">
              <div className="inventory-detail-header z-10 flex shrink-0 flex-col gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400">Карточка ТМЦ</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900 break-words">{selectedComponent.name}</h2>
                  <p className="mt-2 text-sm font-mono text-slate-400">{selectedComponent.part_number || "Без артикула"}</p>
                </div>
                <button onClick={closeSidePanel} type="button" className={`${buttonStyles.neutral} shrink-0 h-10 px-4`}>Закрыть</button>
              </div>

              <div className="inventory-detail-tabs flex shrink-0 gap-1 border-b border-slate-100 bg-white px-5 pt-3 sm:px-6">
                <button type="button" className={componentPanelTab === "details" ? "active" : ""} onClick={() => setComponentPanelTab("details")}>
                  Карточка
                </button>
                <button type="button" className={componentPanelTab === "history" ? "active" : ""} onClick={() => setComponentPanelTab("history")}>
                  История движения
                </button>
              </div>

              <div className="inventory-detail-content flex-1 overflow-y-auto p-5 sm:p-6">
                {componentPanelTab === "details" ? (
                <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-bold text-slate-400">Категория</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedComponent.category || "Без категории"}</p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${Number(selectedComponent.quantity || 0) > 0 ? "border-emerald-100 bg-emerald-50/60" : "border-rose-100 bg-rose-50/60"}`}>
                    <p className={`text-[11px] font-bold ${Number(selectedComponent.quantity || 0) > 0 ? "text-emerald-600" : "text-rose-500"}`}>Остаток</p>
                    <p className={`mt-1 text-sm font-semibold ${Number(selectedComponent.quantity || 0) > 0 ? "text-emerald-700" : "text-rose-600"}`}>{selectedComponent.quantity || 0} шт.</p>
                  </div>
                </div>

                <div className="inventory-detail-section">
                  <h3 className="text-sm font-black text-slate-900">Базовые параметры</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      ["Корпус", selectedComponent.package],
                      ["Номинал", selectedComponent.value],
                      ["Напряжение", selectedComponent.voltage ? `${selectedComponent.voltage} В` : ""],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                        <p className="text-[11px] font-bold text-slate-400">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{value || "Не указано"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="inventory-detail-section">
                  <h3 className="text-sm font-black text-slate-900">Характеристики</h3>
                  <div className="mt-3 flex flex-col gap-2">
                    {Object.entries(selectedComponent.specifications || {}).length > 0 ? (
                      Object.entries(selectedComponent.specifications || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                          <span className="text-sm font-semibold text-slate-500">{key}</span>
                          <span className="min-w-0 text-right text-sm font-semibold text-slate-900">{String(value)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                        Характеристики не заполнены.
                      </div>
                    )}
                  </div>
                </div>

                </div>
                ) : (
                <div className="inventory-detail-section">
                  <div className="mb-4">
                    <h3 className="text-sm font-black text-slate-900">История движения</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">Последние 25 операций по компоненту. История загружается только при открытии вкладки.</p>
                  </div>
                  <div className="overflow-x-auto">
                    {movementsLoading ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-400">Загрузка истории…</div>
                    ) : componentMovements.length > 0 ? (
                      <table className="inventory-movement-table w-full min-w-[760px] border-separate border-spacing-0 text-left">
                        <thead>
                          <tr>
                            <th>Дата</th>
                            <th>Операция</th>
                            <th>Количество</th>
                            <th>Остаток</th>
                            <th>Основание</th>
                            <th>Ответственный</th>
                          </tr>
                        </thead>
                        <tbody>
                          {componentMovements.map((movement) => (
                            <tr key={movement.id}>
                              <td>{formatYekaterinburgDateTime(movement.created_at)}</td>
                              <td><span className={movement.direction === "incoming" ? "incoming" : "outgoing"}>{movement.direction === "incoming" ? "Приход" : "Расход"}</span></td>
                              <td className="quantity">{movement.direction === "incoming" ? "+" : "−"}{movement.quantity} шт.</td>
                              <td>{movement.balance_after ?? "—"} шт.</td>
                              <td>{movement.order_id ? `Заказ №${movement.order_id}` : movement.task_id ? `Задача №${movement.task_id}` : movement.note || "—"}</td>
                              <td>{movement.actor_name || "Не указан"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">Движений пока нет.</div>
                    )}
                  </div>
                  {!movementsLoading && componentMovements.length >= movementLimit && (
                    <button type="button" onClick={() => setMovementLimit((current) => current + 25)} className="mt-4 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">
                      Показать ещё 25 операций
                    </button>
                  )}
                </div>
                )}
              </div>
              {canEditInventory && componentPanelTab === "details" && (
                <div className="shrink-0 border-t border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
                  <button onClick={() => openEditForm(selectedComponent)} type="button" className={`${buttonStyles.primary} w-full h-11 px-5`}>
                    <Icons.Edit /> Редактировать
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {showForm && createPortal((
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Закрыть форму"
            className="hidden flex-1 cursor-default md:block"
            onClick={closeSidePanel}
          />
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <InventoryForm
              initialData={editingComponent}
              panel
              onBack={closeSidePanel}
              onSuccess={() => { closeSidePanel(); fetchComponents({ reset: true }); }}
            />
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
