import React, { useState, useEffect } from "react";
import ProductForm from "./ProductForm";
import BOMItemForm from "./BOMItemForm";

// МИНИМАЛИСТИЧНЫЕ SVG-ИКОНКИ ВМЕСТО EMOJI
const Icons = {
  ChevronRight: () => (
    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  Box: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Puzzle: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Close: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx={12} cy={12} r={3} />
    </svg>
  ),
  Folder: () => (
    <svg className="w-3.5 h-3.5 mr-1 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
};

// РЕКУРСИВНАЯ СТРОКА BOM (СТРОГИЙ ДИЗАЙН, С ВОЗМОЖНОСТЬЮ ПЕРЕОПРЕДЕЛЕНИЯ И СБРОСА)
const BOMRow = ({
  item,
  productsList,
  onResolveSuccess,
  onDrillDown,
  level = 0,
  searchQuery = "",
  statusFilter = "all",
  selectedCategory = "all",
  parentSectionName = ""
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item?.design_name || "");
  const [editQty, setEditQty] = useState(item?.quantity || 1);
  const [editDesignators, setEditDesignators] = useState(item?.designators || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!item) return null;

  // Ищем данные узла в общем списке продуктов для глубокой проверки
  const subProductData = (item.resource_type === "product" || item.resource_type === "subassembly") && productsList
    ? productsList.find(p => p.id === item.resource_id)
    : null;

  const isSub = !!subProductData;

  const bomDesignName = item.design_name || item.name || "Без названия";
  const hasWarehouseLink = item.resource_id !== null && item.resource !== null;
  const warehouseName = item.resource?.name || "";
  const warehousePartNumber = item.resource?.part_number || item.resource?.drawing_number || "";

  // --- ЛОГИКА ФИЛЬТРАЦИИ ---
  const matchesSearch =
    bomDesignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.designators || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    warehouseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warehousePartNumber.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesStatus =
    statusFilter === "all" ||
    (statusFilter === "resolved" && hasWarehouseLink) ||
    (statusFilter === "unresolved" && !hasWarehouseLink);

  const matchesCategory =
    selectedCategory === "all" ||
    parentSectionName === selectedCategory;

  const currentItemMatches = matchesSearch && matchesStatus && matchesCategory;

  let hasMatchingChildren = false;
  if (isSub && subProductData.sections) {
    hasMatchingChildren = subProductData.sections.some(section =>
      section.items?.some(subItem => {
        const subHasLink = subItem.resource_id !== null && subItem.resource !== null;
        const sSearch = (subItem.design_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (subItem.designators || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (subItem.resource?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        const sStatus = statusFilter === "all" ||
                        (statusFilter === "resolved" && subHasLink) ||
                        (statusFilter === "unresolved" && !subHasLink);
        const sCat = selectedCategory === "all" || section.name === selectedCategory;
        return sSearch && sStatus && sCat;
      })
    );
  }

  if (!currentItemMatches && !hasMatchingChildren) return null;

  const handleOpenDropdown = async () => {
    if (showDropdown) { setShowDropdown(false); return; }
    try {
      const [resComponents, resProducts] = await Promise.all([
        fetch("/api/inventory/components"),
        fetch("/api/production/products")
      ]);
      if (resComponents.ok && resProducts.ok) {
        setAvailableComponents(await resComponents.json());
        setAvailableProducts(await resProducts.json());
        setShowDropdown(true);
      }
    } catch (err) { console.error(err); }
  };

  // ОБНОВЛЕННЫЙ МЕТОД: Может принимать null для resourceId (сброс привязки)
  const handleAssignResource = async (resourceId, resourceType) => {
    try {
      const res = await fetch(`/api/production/bom-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design_name: bomDesignName,
          quantity: item.quantity,
          designators: item.designators,
          resource_id: resourceId,
          resource_type: resourceType,
          is_resolved: resourceId !== null
        })
      });
      if (res.ok) {
        setShowDropdown(false);
        if (onResolveSuccess) onResolveSuccess();
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Удалить позицию "${bomDesignName}"?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/production/bom-items/${item.id}`, { method: "DELETE" });
      if (res.ok && onResolveSuccess) onResolveSuccess();
    } catch (err) { console.error(err); } finally { setIsDeleting(false); }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return alert("Наименование обязательно");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/production/bom-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design_name: editName, quantity: Number(editQty), designators: editDesignators || "" })
      });
      if (res.ok) { setIsEditing(false); if (onResolveSuccess) onResolveSuccess(); }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSaveEdit} className="bg-slate-50 p-4 rounded-xl border border-blue-500 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end w-full" style={{ paddingLeft: `16px`, marginLeft: `${level * 20}px` }}>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Наименование</label>
            <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2 text-xs border rounded-lg bg-white text-slate-800 font-medium" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Поз. обозначение</label>
            <input type="text" value={editDesignators} onChange={(e) => setEditDesignators(e.target.value)} className="w-full p-2 text-xs border rounded-lg bg-white font-mono text-slate-700" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Количество</label>
            <input type="number" min="1" required value={editQty} onChange={(e) => setEditQty(e.target.value)} className="w-full p-2 text-xs border rounded-lg bg-white font-semibold text-slate-800" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-2 text-xs font-semibold text-slate-500 border rounded-lg hover:bg-slate-100 transition-colors">Отмена</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition-colors">Сохранить</button>
        </div>
      </form>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 relative w-full ${isDeleting ? "opacity-30 pointer-events-none" : ""} ${!currentItemMatches ? "opacity-40" : ""}`}>
      <div
        className={`bg-white p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
          isSub 
            ? "border-l-4 border-l-indigo-500 bg-indigo-50/5 border-slate-200 shadow-xs" 
            : "border-slate-200 hover:border-slate-300 shadow-xs"
        }`}
        style={{ marginLeft: `${level * 20}px` }}
      >
        <div className="flex items-start sm:items-center gap-3 flex-1 w-full min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
            isSub ? "bg-indigo-50 border-indigo-100" : hasWarehouseLink ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
          }`}>
            {isSub ? <Icons.Puzzle className="w-4 h-4 text-indigo-600" /> : hasWarehouseLink ? <Icons.Check /> : <Icons.Alert />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 w-full min-w-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-semibold text-slate-900 text-xs truncate">{bomDesignName}</p>
                {parentSectionName && selectedCategory === "all" && (
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium uppercase tracking-wider shrink-0">{parentSectionName}</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Поз: {item.designators || "—"}</p>
            </div>

            {/* ИЗМЕНЕННЫЙ БЛОК: Единый контейнер управления связью */}
            <div className="flex flex-col justify-center md:border-l md:border-slate-100 md:pl-4 min-w-0">
              <div className="relative inline-block w-full">
                {hasWarehouseLink ? (
                  <div className="flex justify-between items-center w-full min-w-0 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isSub ? "text-indigo-600" : "text-emerald-700"}`}>{warehouseName}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{warehousePartNumber}</p>

                      {/* Опции изменения и сброса для уже привязанного элемента */}
                      <div className="flex gap-2.5 mt-1">
                        <button type="button" onClick={handleOpenDropdown} className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline">Изменить</button>
                        <button type="button" onClick={() => handleAssignResource(null, "raw_string")} className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold underline">Отвязать</button>
                      </div>
                    </div>
                    {isSub && (
                      <button
                        onClick={() => onDrillDown(item.resource_id)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-md transition-colors shrink-0 border border-indigo-100"
                      >
                        <Icons.Settings />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">Не привязано</span>
                    <button type="button" onClick={handleOpenDropdown} className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline">Привязать</button>
                  </div>
                )}

                {/* Универсальный выпадающий список выбора (работает и на привязку, и на переопределение) */}
                {showDropdown && (
                  <div className="absolute left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto p-1">
                    <div className="flex justify-between items-center px-2 py-1 bg-slate-50 border-b border-slate-100 mb-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Выберите позицию</span>
                      <button type="button" onClick={() => setShowDropdown(false)} className="text-slate-400 hover:text-slate-600"><Icons.Close className="w-3 h-3" /></button>
                    </div>
                    <div className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded uppercase my-1">Сборочные единицы (Узлы):</div>
                    {availableProducts.filter(p => p.id !== item.product_id).map(prod => (
                      <button key={prod.id} type="button" onClick={() => handleAssignResource(prod.id, "product")} className="w-full text-left p-2 rounded-md hover:bg-slate-50 flex flex-col">
                        <span className="text-xs font-medium text-slate-800">{prod.name}</span>
                        {prod.drawing_number && <span className="text-[9px] font-mono text-slate-400">{prod.drawing_number}</span>}
                      </button>
                    ))}
                    <div className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded uppercase my-1 mt-2">Складские компоненты:</div>
                    {availableComponents.map(comp => (
                      <button key={comp.id} type="button" onClick={() => handleAssignResource(comp.id, "component")} className="w-full text-left p-2 rounded-md hover:bg-slate-50 flex flex-col">
                        <span className="text-xs font-medium text-slate-800">{comp.name}</span>
                        {comp.part_number && <span className="text-[9px] font-mono text-slate-400">{comp.part_number}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex sm:flex-row items-center justify-between sm:justify-end gap-4 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
          <div className="text-left sm:text-right min-w-[60px]">
            <p className="font-semibold text-slate-800 text-xs">{item.quantity || 0} шт.</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-md bg-slate-50 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-colors" title="Редактировать">
              <Icons.Edit />
            </button>
            <button onClick={handleDelete} className="p-1.5 rounded-md bg-slate-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors" title="Удалить">
              <Icons.Close className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isSub && subProductData.sections && (
        <div className="flex flex-col gap-4 mt-1 border-l-2 border-dashed border-indigo-200 ml-3 pl-3 w-full">
          {subProductData.sections
            .filter(section => selectedCategory === "all" || section.name === selectedCategory)
            .map((section) => {
              const hasVisibleItems = section.items?.some(subItem => {
                const subHasLink = subItem.resource_id !== null && subItem.resource !== null;
                const sSearch = (subItem.design_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (subItem.designators || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (subItem.resource?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
                const sStatus = statusFilter === "all" ||
                                (statusFilter === "resolved" && subHasLink) ||
                                (statusFilter === "unresolved" && !subHasLink);
                return sSearch && sStatus;
              });

              if (!hasVisibleItems) return null;

              return (
                <div key={section.name} className="flex flex-col gap-1.5 w-full">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-500 flex items-center mt-1">
                    <Icons.Folder />
                    <span>{section.name} узла [{bomDesignName}]</span>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    {section.items?.map((subItem) => (
                      <BOMRow
                        key={subItem.id}
                        item={subItem}
                        productsList={productsList}
                        onResolveSuccess={onResolveSuccess}
                        onDrillDown={onDrillDown}
                        level={level + 1}
                        searchQuery={searchQuery}
                        statusFilter={statusFilter}
                        selectedCategory={selectedCategory}
                        parentSectionName={section.name}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

// ГЛАВНЫЙ КОМПОНЕНТ МОДУЛЯ ИЗДЕЛИЙ
export default function GadgetsBase() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [historyStack, setHistoryStack] = useState([]);

  const [showProductForm, setShowProductForm] = useState(false);
  const [showBOMForm, setShowBOMForm] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  const [activeTab, setActiveTab] = useState("main");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/production/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
        if (viewingProduct) {
          const updated = data.find(p => p.id === viewingProduct.id);
          if (updated) setViewingProduct(updated);
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDeleteProductFromBase = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Вы уверены, что хотите безвозвратно удалить из базы изделие "${name}"?`)) return;
    try {
      const response = await fetch(`/api/production/products/${id}`, { method: "DELETE" });
      if (response.ok) { fetchProducts(); }
    } catch (err) { console.error(err); }
  };

  const mainDevices = products.filter(p => !p.is_subassembly);
  const subAssemblies = products.filter(p => p.is_subassembly);

  const handleDrillDown = (subProductId) => {
    const targetProduct = products.find(p => p.id === subProductId);
    if (targetProduct) {
      setHistoryStack(prev => [...prev, viewingProduct]);
      setViewingProduct(targetProduct);
      setShowBOMForm(false);
    }
  };

  const handleGoBackInTree = () => {
    if (historyStack.length > 0) {
      const previous = historyStack[historyStack.length - 1];
      setHistoryStack(prev => prev.slice(0, -1));
      setViewingProduct(previous);
    } else {
      setViewingProduct(null);
      setSearchQuery("");
      setStatusFilter("all");
      setSelectedCategory("all");
    }
  };

  const handleSmartResolve = async (id) => {
    try {
      const res = await fetch(`/api/production/products/${id}/resolve-bom`, { method: "POST" });
      if (res.ok) { alert("Подбор завершен успешно"); fetchProducts(); }
    } catch (e) { console.error(e); }
  };

  // СБОР ВСЕХ ДИНАМИЧЕСКИХ КАТЕГОРИЙ
  const availableCategoriesInProduct = ["all"];
  if (viewingProduct) {
    viewingProduct.sections?.forEach(sec => {
      if (sec.name && !availableCategoriesInProduct.includes(sec.name)) {
        availableCategoriesInProduct.push(sec.name);
      }
    });
    viewingProduct.sections?.forEach(sec => {
      sec.items?.forEach(item => {
        if (item.resource_type === "product" || item.resource_type === "subassembly") {
          const matchedSub = products.find(p => p.id === item.resource_id);
          matchedSub?.sections?.forEach(subSec => {
            if (subSec.name && !availableCategoriesInProduct.includes(subSec.name)) {
              availableCategoriesInProduct.push(subSec.name);
            }
          });
        }
      });
    });
  }

  // ПРАВИЛЬНЫЙ ПРОБРОС ФЛАГА ДЛЯ ПОДДЕРЖКИ БЭКЕНДА
  if (showProductForm) {
    return (
      <ProductForm
        initialData={activeTab === "sub" ? { is_final: false } : null}
        onBack={() => { setShowProductForm(false); fetchProducts(); }}
      />
    );
  }

  if (isEditingProduct) return <ProductForm initialData={viewingProduct} onBack={() => { setIsEditingProduct(false); fetchProducts(); }} />;

  // --- ЭКРАН СОСТАВА ИЗДЕЛИЯ ---
  if (viewingProduct) {
    return (
      <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full font-sans antialiased text-slate-800">
        {/* Хлебные крошки и Шапка */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-5">
          <div>
            <button onClick={handleGoBackInTree} className="text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1 transition-colors">
              <span>&larr;</span>
              <span>{historyStack.length > 0 ? "Уровень выше" : "К списку изделий"}</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="text-slate-400">
                {viewingProduct.is_subassembly ? <Icons.Puzzle className="w-6 h-6 text-indigo-500" /> : <Icons.Box className="w-6 h-6 text-blue-500" />}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {viewingProduct.name}
              </h2>
            </div>
            {viewingProduct.drawing_number && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">Обозначение: {viewingProduct.drawing_number} (v{viewingProduct.revision || "1.0"})</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button onClick={() => handleSmartResolve(viewingProduct.id)} className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors">Автоподбор</button>
            <button onClick={() => setIsEditingProduct(true)} className="flex-1 md:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs uppercase tracking-wider rounded-lg border border-slate-200 transition-colors">Паспорт</button>
            <button onClick={() => setShowBOMForm(true)} className="flex-1 md:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors">+ Позиция</button>
          </div>
        </div>

        {/* Строгая фильтр-панель */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            {/* Живой поиск */}
            <div className="relative w-full">
              <span className="absolute left-3 top-3"><Icons.Search /></span>
              <input
                type="text"
                placeholder="Поиск детали, позиции..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white p-2 pl-9 pr-8 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <Icons.Close className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Выпадающий список категорий */}
            <div className="w-full md:col-span-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
              >
                {availableCategoriesInProduct.map(catName => (
                  <option key={catName} value={catName}>
                    {catName === "all" ? "Все категории спецификации" : `Раздел: ${catName}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Переключатели состояний */}
          <div className="border-t border-slate-200 pt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">Состояние записей:</span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${
                statusFilter === "all" ? "bg-slate-900 border-slate-900 text-white" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setStatusFilter("resolved")}
              className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${
                statusFilter === "resolved" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Привязаны
            </button>
            <button
              onClick={() => statusFilter === "unresolved" ? setStatusFilter("all") : setStatusFilter("unresolved")}
              className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${
                statusFilter === "unresolved" ? "bg-rose-50 border-rose-500 text-rose-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Требуют внимания
            </button>
          </div>
        </div>

        {showBOMForm && (
          <div className="mb-6">
            <BOMItemForm productId={viewingProduct.id} onBack={() => setShowBOMForm(false)} onSuccess={fetchProducts} />
          </div>
        )}

        {/* Вывод дерева дерева спецификации */}
        <div className="flex flex-col gap-6 w-full">
          {viewingProduct.sections && viewingProduct.sections.length > 0 ? (
            viewingProduct.sections
              .filter(section => selectedCategory === "all" || section.name === selectedCategory)
              .map((section) => {
                const isHeaderVisible = selectedCategory === "all";
                const hasVisibleItems = section.items && section.items.length > 0;

                if (!hasVisibleItems) return null;

                return (
                  <div key={section.name} className="flex flex-col gap-2 w-full">
                    {isHeaderVisible && (
                      <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                        <Icons.ChevronRight />
                        <span>{section.name}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-2 w-full">
                      {section.items?.map((item) => (
                        <BOMRow
                          key={item.id}
                          item={item}
                          productsList={products}
                          onResolveSuccess={fetchProducts}
                          onDrillDown={handleDrillDown}
                          searchQuery={searchQuery}
                          statusFilter={statusFilter}
                          selectedCategory={selectedCategory}
                          parentSectionName={section.name}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 font-medium text-sm">
              Спецификация изделия пуста.
            </div>
          )}
        </div>
      </div>
    );
  }

  const visibleProducts = activeTab === "main" ? mainDevices : subAssemblies;

  // --- ГЛАВНЫЙ ЭКРАН МОДУЛЯ (БАЗА ИЗДЕЛИЙ) ---
  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full font-sans antialiased text-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">База изделий</h1>
          <p className="text-xs text-slate-400 mt-1">Реестр спецификаций, узлов и приборов производства</p>
        </div>
        <button
          onClick={() => setShowProductForm(true)}
          className={`w-full sm:w-auto text-white px-5 py-2.5 rounded-lg font-semibold text-xs uppercase tracking-wider shadow-xs transition-colors ${
            activeTab === "sub" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {activeTab === "sub" ? "+ Новая сборочная единица" : "+ Новое изделие"}
        </button>
      </div>

      {/* Переключатели вкладок */}
      <div className="flex gap-4 mb-6 border-b border-slate-200 pb-px">
        <button onClick={() => setActiveTab("main")} className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "main" ? "border-blue-600 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
          <Icons.Box className="w-4 h-4" />
          <span>Изделие ({mainDevices.length})</span>
        </button>
        <button onClick={() => setActiveTab("sub")} className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "sub" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
          <Icons.Puzzle className="w-4 h-4" />
          <span>Сборочные единицы ({subAssemblies.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm font-medium text-slate-400">Загрузка данных...</div>
      ) : (
        /* Адаптивная Grid-сетка карточек */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {visibleProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => { setViewingProduct(product); setHistoryStack([]); }}
              className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all relative cursor-pointer group min-w-0"
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteProductFromBase(product.id, product.name, e); }}
                className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                title="Удалить из базы"
              >
                <Icons.Close className="w-4 h-4" />
              </button>

              <div className="min-w-0 pr-6">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border mb-3 ${product.is_subassembly ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-blue-50 border-blue-100 text-blue-600"}`}>
                  {product.is_subassembly ? <Icons.Puzzle className="w-4 h-4" /> : <Icons.Box className="w-4 h-4" />}
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase truncate mb-1 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                {product.drawing_number && (
                  <p className="text-[11px] font-mono text-slate-400 truncate">Чертеж: {product.drawing_number}</p>
                )}
              </div>

              <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
                <span>Групп в составе: {product.sections?.length || 0}</span>
                <span className="text-blue-600 group-hover:translate-x-0.5 transition-transform">Открыть состав &rarr;</span>
              </div>
            </div>
          ))}
          {visibleProducts.length === 0 && (
            <div className="col-span-full text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 font-medium text-sm">
              В данном разделе нет записей.
            </div>
          )}
        </div>
      )}
    </div>
  );
}