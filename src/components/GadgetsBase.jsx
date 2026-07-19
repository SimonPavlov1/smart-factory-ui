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
  ChevronDown: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
  ),
  File: () => (
    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Photo: () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
};

const buttonBase = "inline-flex items-center justify-center gap-2 rounded-xl text-[12px] font-semibold border transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0";
const buttonStyles = {
  primary: `${buttonBase} bg-[#3F8CFF] hover:bg-[#1f78ff] text-white border-[#3F8CFF] shadow-sm hover:shadow-md`,
  success: `${buttonBase} bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm hover:shadow-md`,
  danger: `${buttonBase} bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100 hover:border-rose-200`,
  neutral: `${buttonBase} bg-white hover:bg-slate-50 text-slate-600 border-slate-200`,
  ghost: "inline-flex items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0",
  iconNeutral: "inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-500 hover:text-[#3F8CFF] border border-slate-200 hover:border-blue-200 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0",
  iconDanger: "inline-flex items-center justify-center w-8 h-8 rounded-xl bg-rose-50 text-rose-500 hover:text-rose-700 border border-rose-100 hover:border-rose-200 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0",
};

const ProductFilesPanel = ({ product, onChanged }) => {
  const [uploading, setUploading] = useState("");
  const attachments = product.attachments || [];

  const upload = async (file, endpoint) => {
    if (!file) return;
    setUploading(endpoint);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/production/products/${product.id}/${endpoint}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Не удалось загрузить файл");
        return;
      }
      onChanged();
    } finally {
      setUploading("");
    }
  };

  const download = async (file) => {
    const res = await fetch(`/api/production${file.url}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.original_name || "file";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const openFile = async (file) => {
    const res = await fetch(`/api/production${file.url}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => window.URL.revokeObjectURL(url), 60 * 1000);
  };

  const removeAttachment = async (file) => {
    if (!window.confirm(`Удалить файл "${file.original_name}"?`)) return;
    const res = await fetch(`/api/production/products/${product.id}/attachments/${encodeURIComponent(file.stored_name)}`, {
      method: "DELETE",
    });
    if (res.ok) onChanged();
  };

  return (
    <div className="mb-6">
      <div className="border border-slate-100 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xl font-black text-slate-900">Файлы изделия</h3>
            <p className="text-sm text-slate-500 mt-2">Сборочные чертежи, КД, составы, инструкции и прочие документы.</p>
          </div>
          <label className={`${buttonStyles.primary} h-9 px-4 cursor-pointer`}>
            {uploading === "attachments" ? "Загрузка..." : "+ Документ"}
            <input type="file" className="hidden" onChange={(e) => upload(e.target.files?.[0], "attachments")} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {attachments.length === 0 && (
            <div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg p-4 bg-slate-50">
              Документы еще не прикреплены.
            </div>
          )}
          {attachments.map((file) => (
            <div key={file.stored_name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
              <button type="button" onClick={() => openFile(file)} className="flex items-center gap-2 min-w-0 text-left">
                <Icons.File />
                <span className="text-xs font-medium text-blue-600 hover:text-blue-700 truncate">{file.original_name}</span>
              </button>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button type="button" onClick={() => openFile(file)} className={`${buttonStyles.ghost} text-[#3F8CFF] hover:text-[#1f78ff]`}>
                  Открыть
                </button>
                <button type="button" onClick={() => download(file)} className={`${buttonStyles.ghost} text-slate-500 hover:text-slate-700`}>
                  Скачать
                </button>
                <button type="button" onClick={() => removeAttachment(file)} className={`${buttonStyles.ghost} text-rose-500 hover:text-rose-700`}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
  const [matchCandidates, setMatchCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [alternativeSearch, setAlternativeSearch] = useState("");
  const [alternativeResults, setAlternativeResults] = useState([]);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item?.design_name || "");
  const [editQty, setEditQty] = useState(item?.quantity || 1);
  const [editDesignators, setEditDesignators] = useState(item?.designators || "");
  const [isSaving, setIsSaving] = useState(false);
  const bomDesignName = item?.design_name || item?.name || "Без названия";

  if (!item) return null;

  // Ищем данные узла в общем списке продуктов для глубокой проверки
  const subProductData = (item.resource_type === "product" || item.resource_type === "subassembly") && productsList
    ? productsList.find(p => p.id === item.resource_id)
    : null;

  const itemType = item.item_type || ((item.resource_type === "product" || item.resource_type === "subassembly") ? "assembly" : "component");
  const isOperation = itemType === "operation";
  const isSub = itemType === "assembly" || !!subProductData;
  const directChildren = item.children || [];
  const hasNestedContent = isSub && (
    directChildren.length > 0 ||
    subProductData?.sections?.some((section) => section.items?.length)
  );
  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== "all" || selectedCategory !== "all";
  const shouldShowNestedContent = isExpanded || hasActiveFilters;

  const hasWarehouseLink = isOperation || (item.resource_id !== null && item.resource !== null);
  const warehouseName = isOperation ? (item.operation_role || "Работа / операция") : (item.resource?.name || "");
  const warehousePartNumber = item.resource?.part_number || item.resource?.drawing_number || "";
  const alternatives = Array.isArray(item.alternatives) ? item.alternatives : [];
  const alternativesQty = alternatives.reduce((sum, alternative) => sum + Number(alternative.quantity || 0), 0);
  const filteredProducts = availableProducts
    .filter((product) => product.id !== item.product_id)
    .filter((product) => {
      const query = warehouseSearch.trim().toLowerCase();
      if (!query) return true;
      return (
        (product.name || "").toLowerCase().includes(query) ||
        (product.drawing_number || "").toLowerCase().includes(query)
      );
    });

  useEffect(() => {
    if (!showDropdown || isSub || matchCandidates.length > 0) return;

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: warehouseSearch || bomDesignName,
          limit: "25"
        });
        const res = await fetch(`/api/inventory/components/search?${params.toString()}`);
        if (res.ok) setAvailableComponents(await res.json());
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [showDropdown, warehouseSearch, matchCandidates.length, bomDesignName, isSub]);

  useEffect(() => {
    if (!isEditing || isOperation || isSub) return;

    const timer = setTimeout(async () => {
      try {
        setAlternativesLoading(true);
        const params = new URLSearchParams({
          q: alternativeSearch || bomDesignName,
          limit: "20"
        });
        const res = await fetch(`/api/inventory/components/search?${params.toString()}`);
        if (res.ok) setAlternativeResults(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setAlternativesLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isEditing, alternativeSearch, bomDesignName, isOperation, isSub]);

  // --- ЛОГИКА ФИЛЬТРАЦИИ ---
  const matchesSearch =
    bomDesignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.designators || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    warehouseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warehousePartNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alternatives.some((alternative) =>
      (alternative.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alternative.part_number || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

  const matchesStatus =
    statusFilter === "all" ||
    (statusFilter === "resolved" && hasWarehouseLink) ||
    (statusFilter === "unresolved" && !hasWarehouseLink);

  const matchesCategory =
    selectedCategory === "all" ||
    parentSectionName === selectedCategory;

  const currentItemMatches = matchesSearch && matchesStatus && matchesCategory;

  const treeNodeMatches = (subItem) => {
    const subType = subItem.item_type || ((subItem.resource_type === "product" || subItem.resource_type === "subassembly") ? "assembly" : "component");
    const subHasLink = subType === "operation" || (subItem.resource_id !== null && subItem.resource !== null);
    const sSearch = (subItem.design_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (subItem.designators || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (subItem.resource?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (subItem.operation_role || "").toLowerCase().includes(searchQuery.toLowerCase());
    const sStatus = statusFilter === "all" ||
                    (statusFilter === "resolved" && subHasLink) ||
                    (statusFilter === "unresolved" && !subHasLink);

    return (sSearch && sStatus) || subItem.children?.some(treeNodeMatches);
  };

  let hasMatchingChildren = false;
  if (directChildren.length) {
    hasMatchingChildren = directChildren.some(treeNodeMatches);
  }
  if (isSub && subProductData?.sections) {
    hasMatchingChildren = hasMatchingChildren || subProductData.sections.some(section =>
      section.items?.some(subItem => {
        const subType = subItem.item_type || ((subItem.resource_type === "product" || subItem.resource_type === "subassembly") ? "assembly" : "component");
        const subHasLink = subType === "operation" || (subItem.resource_id !== null && subItem.resource !== null);
        const sSearch = (subItem.design_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (subItem.designators || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (subItem.resource?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (subItem.operation_role || "").toLowerCase().includes(searchQuery.toLowerCase());
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
    if (isOperation) return;
    if (showDropdown) { setShowDropdown(false); return; }
    try {
      setMatchCandidates([]);
      setWarehouseSearch(bomDesignName);
      if (isSub) {
        const resProducts = await fetch("/api/production/products");
        if (!resProducts.ok) return;
        setAvailableProducts(await resProducts.json());
        setAvailableComponents([]);
        setShowDropdown(true);
      } else {
        const resComponents = await fetch(`/api/inventory/components/search?q=${encodeURIComponent(bomDesignName)}&limit=25`);
        if (!resComponents.ok) return;
        setAvailableComponents(await resComponents.json());
        setAvailableProducts([]);
        setShowDropdown(true);
      }
    } catch (err) { console.error(err); }
  };

  const handleLoadCandidates = async () => {
    if (isOperation || isSub) return;
    if (showDropdown) { setShowDropdown(false); return; }
    setCandidatesLoading(true);
    try {
      const res = await fetch(`/api/production/bom-items/${item.id}/match-candidates`);
      if (res.ok) {
        const data = await res.json();
        setMatchCandidates(Array.isArray(data.candidates) ? data.candidates : []);
        setAvailableComponents([]);
        setAvailableProducts([]);
        setShowDropdown(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCandidatesLoading(false);
    }
  };

  // ОБНОВЛЕННЫЙ МЕТОД: Может принимать null для resourceId (сброс привязки)
  const handleAssignResource = async (resourceId, resourceType) => {
    const nextItemType = resourceId === null
      ? itemType
      : (resourceType === "product" || resourceType === "subassembly" ? "assembly" : "component");

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
          item_type: nextItemType,
          parent_id: item.parent_id || null,
          operation_role: item.operation_role || null,
          sort_order: item.sort_order || 0,
          is_resolved: resourceId !== null
        })
      });
      if (res.ok) {
        setShowDropdown(false);
        if (onResolveSuccess) onResolveSuccess();
      }
    } catch (err) { console.error(err); }
  };

  const handleAddAlternative = async (componentId, isPrimary = false) => {
    try {
      const res = await fetch(`/api/production/bom-items/${item.id}/alternatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ component_id: componentId, is_primary: isPrimary })
      });
      if (res.ok) {
        setAlternativeSearch("");
        if (onResolveSuccess) onResolveSuccess();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetPrimaryAlternative = async (componentId) => {
    try {
      const res = await fetch(`/api/production/bom-items/${item.id}/alternatives/${componentId}/primary`, {
        method: "PUT"
      });
      if (res.ok && onResolveSuccess) onResolveSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveAlternative = async (componentId) => {
    if (!window.confirm("Удалить этот аналог из разрешенных замен?")) return;
    try {
      const res = await fetch(`/api/production/bom-items/${item.id}/alternatives/${componentId}`, {
        method: "DELETE"
      });
      if (res.ok && onResolveSuccess) onResolveSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRowClick = (event) => {
    if (!hasNestedContent) return;
    if (event.target.closest("button, input, select, textarea, a, label")) return;
    setIsExpanded((value) => !value);
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
	        body: JSON.stringify({
            design_name: editName,
            quantity: Number(editQty),
            designators: editDesignators || "",
            resource_id: item.resource_id,
            resource_type: item.resource_type || "raw_string",
            item_type: itemType,
            parent_id: item.parent_id || null,
            operation_role: isOperation ? item.operation_role : null,
            sort_order: item.sort_order || 0,
            is_resolved: item.is_resolved
          })
	      });
      if (res.ok) { setIsEditing(false); if (onResolveSuccess) onResolveSuccess(); }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const editPanel = isEditing && (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Закрыть редактирование позиции"
        className="hidden flex-1 cursor-default md:block"
        onClick={() => setIsEditing(false)}
      />
      <div className="h-full w-full max-w-2xl bg-white shadow-2xl">
        <form onSubmit={handleSaveEdit} className="flex h-full flex-col bg-white">
          <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400">Состав изделия</p>
              <h3 className="mt-1 text-xl font-black text-slate-900 break-words">Редактирование позиции</h3>
              <p className="mt-2 text-sm text-slate-500">{bomDesignName}</p>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className={`${buttonStyles.neutral} shrink-0 h-10 px-4`}>
              Закрыть
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                <label className="block text-[11px] font-bold text-slate-500 mb-2">Наименование *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2">Позиционные обозначения</label>
                  <input
                    type="text"
                    value={editDesignators}
                    onChange={(e) => setEditDesignators(e.target.value)}
                    className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10 font-mono"
                    placeholder="Например: R1, R2, R3"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2">Количество *</label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {!isOperation && !isSub && (
                <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">Аналоги</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {alternatives.length
                          ? `${alternatives.length} разрешено, всего на складе ${alternativesQty} шт.`
                          : "Разрешенные замены не указаны"}
                      </p>
                    </div>
                  </div>

                  {alternatives.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {alternatives.map((alternative) => (
                        <div key={alternative.component_id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-800">{alternative.name}</p>
                              {alternative.is_primary && (
                                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                  Основной
                                </span>
                              )}
                            </div>
                            <p className="mt-1 truncate text-xs font-mono text-slate-400">
                              {alternative.part_number || "Без артикула"} · остаток {alternative.quantity || 0} шт.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {!alternative.is_primary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryAlternative(alternative.component_id)}
                                className={`${buttonStyles.neutral} h-8 px-3`}
                              >
                                Основной
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveAlternative(alternative.component_id)}
                              className={`${buttonStyles.danger} h-8 px-3`}
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-3">
                    <label className="block text-[11px] font-bold text-slate-500 mb-2">Добавить аналог со склада</label>
                    <input
                      type="text"
                      value={alternativeSearch}
                      onChange={(e) => setAlternativeSearch(e.target.value)}
                      placeholder="Поиск по названию, артикулу или свойствам"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                    />
                    <div className="mt-2 max-h-56 overflow-y-auto">
                      {alternativesLoading ? (
                        <div className="px-2 py-3 text-xs text-slate-400">Поиск...</div>
                      ) : (
                        alternativeResults
                          .filter((component) => !alternatives.some((alternative) => alternative.component_id === component.id))
                          .map((component) => (
                            <button
                              key={component.id}
                              type="button"
                              onClick={() => handleAddAlternative(component.id, alternatives.length === 0)}
                              className="w-full rounded-xl p-3 text-left transition-colors hover:bg-slate-50"
                            >
                              <span className="block text-sm font-semibold text-slate-800">{component.name}</span>
                              <span className="mt-1 block text-xs font-mono text-slate-400">
                                {component.part_number || "Без артикула"} · остаток {component.quantity || 0} шт.
                              </span>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
            <button type="submit" disabled={isSaving} className={`${buttonStyles.primary} w-full h-11 px-5`}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col gap-1.5 relative w-full ${isDeleting ? "opacity-30 pointer-events-none" : ""}`}>
        <div
          onClick={handleRowClick}
	          className={`bg-white p-4 rounded-2xl border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 transition-all hover:shadow-sm ${
          isSub
            ? `border-l-4 border-l-indigo-500 bg-indigo-50/5 border-slate-200 shadow-xs ${hasNestedContent ? "cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/20" : ""}` 
            : isOperation
            ? "border-l-4 border-l-amber-500 bg-amber-50/10 border-slate-200 shadow-xs"
            : "border-slate-200 hover:border-slate-300 shadow-xs"
        }`}
        style={{ marginLeft: `${level * 18}px` }}
      >
        <div className="flex items-start sm:items-center gap-3 flex-1 w-full min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
            isSub ? "bg-indigo-50 border-indigo-100" : isOperation ? "bg-amber-50 border-amber-100 text-amber-600" : hasWarehouseLink ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
          }`}>
            {isSub ? <Icons.Puzzle className="w-4 h-4 text-indigo-600" /> : isOperation ? <Icons.Settings /> : hasWarehouseLink ? <Icons.Check /> : <Icons.Alert />}
          </div>

	          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 xl:gap-4 w-full min-w-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
	                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className="min-w-0 truncate text-left text-sm font-bold text-slate-900 transition-colors hover:text-[#3F8CFF]"
                    title="Редактировать позицию"
                  >
                    {bomDesignName}
                  </button>
                {hasNestedContent && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
                    {shouldShowNestedContent ? <Icons.ChevronDown className="w-3 h-3" /> : <Icons.ChevronRight />}
                    {shouldShowNestedContent ? "Раскрыто" : "Свернуто"}
                  </span>
                )}
                {parentSectionName && selectedCategory === "all" && (
	                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold uppercase tracking-wider shrink-0">{parentSectionName}</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Поз: {item.designators || "—"}</p>
            </div>

            {/* ИЗМЕНЕННЫЙ БЛОК: Единый контейнер управления связью */}
	            <div className="flex flex-col justify-center xl:border-l xl:border-slate-100 xl:pl-4 min-w-0">
              <div className="relative inline-block w-full">
                {hasWarehouseLink ? (
                  <div className="flex justify-between items-center w-full min-w-0 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isSub ? "text-indigo-600" : isOperation ? "text-amber-700" : "text-emerald-700"}`}>{warehouseName}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        {isOperation ? "Операция в техпроцессе" : warehousePartNumber}
                      </p>

                      {/* Опции изменения и сброса для уже привязанного элемента */}
                      {!isOperation && (
                        <div className="flex gap-2.5 mt-1">
	                        <button type="button" onClick={handleOpenDropdown} className={`${buttonStyles.ghost} text-[#3F8CFF] hover:text-[#1f78ff]`}>Изменить</button>
	                        <button type="button" onClick={() => handleAssignResource(null, "raw_string")} className={`${buttonStyles.ghost} text-slate-400 hover:text-rose-600`}>Отвязать</button>
                        </div>
                      )}
                    </div>
                    {isSub && (
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onDrillDown(item.resource_id)}
                          className={`${buttonStyles.neutral} h-8 px-2.5`}
                        >
                          <Icons.Settings />
                          <span>Открыть</span>
                        </button>
                      </div>
                    )}
                  </div>
	                ) : (
	                  <div className="flex flex-wrap items-center gap-2">
		                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-full">Не привязано</span>
                    {!isSub && (
		                      <button type="button" onClick={handleLoadCandidates} disabled={candidatesLoading} className={`${buttonStyles.ghost} text-emerald-600 hover:text-emerald-800 disabled:text-slate-400`}>
	                        {candidatesLoading ? "Подбор..." : "Подобрать"}
	                      </button>
                    )}
			                    <button type="button" onClick={handleOpenDropdown} className={`${buttonStyles.ghost} text-[#3F8CFF] hover:text-[#1f78ff]`}>Вручную</button>
	                  </div>
	                )}

                {/* Универсальный выпадающий список выбора (работает и на привязку, и на переопределение) */}
                {showDropdown && (
                  <div className="absolute left-0 right-0 lg:right-auto mt-2 w-full lg:w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl z-50">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
                      <span className="text-xs font-bold text-slate-500">Выберите позицию</span>
                      <button type="button" onClick={() => setShowDropdown(false)} className={buttonStyles.iconNeutral}>
                        <Icons.Close className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2">
	                    {matchCandidates.length > 0 && (
	                      <>
	                        <div className="px-2 py-1.5 text-xs font-bold text-emerald-600">Умный подбор</div>
	                        {matchCandidates.map(comp => (
	                          <button key={comp.id} type="button" onClick={() => handleAssignResource(comp.id, "component")} className="w-full rounded-xl p-3 text-left transition-colors hover:bg-emerald-50">
	                            <span className="block text-sm font-semibold text-slate-800">{comp.name}</span>
	                            <span className="mt-1 block text-xs font-mono text-slate-400">
	                              {comp.part_number || "Без артикула"} · {Math.round((comp.score || 0) * 100)}% · {comp.reason}
	                            </span>
	                          </button>
	                        ))}
	                      </>
	                    )}
		                    {matchCandidates.length === 0 && (isSub ? filteredProducts.length === 0 : availableComponents.length === 0) && (
		                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">Кандидаты не найдены.</div>
		                    )}
		                    {isSub && filteredProducts.length > 0 && (
		                      <>
		                        <div className="px-2 py-1.5 text-xs font-bold text-indigo-600">Сборочные единицы</div>
		                        {filteredProducts.map(prod => (
		                          <button key={prod.id} type="button" onClick={() => handleAssignResource(prod.id, "product")} className="w-full rounded-xl p-3 text-left transition-colors hover:bg-slate-50">
		                            <span className="block text-sm font-semibold text-slate-800">{prod.name}</span>
		                            {prod.drawing_number && <span className="mt-1 block text-xs font-mono text-slate-400">{prod.drawing_number}</span>}
	                          </button>
	                        ))}
	                      </>
	                    )}
	                    {matchCandidates.length === 0 && (
	                      <div className="py-2">
	                        <input
	                          type="text"
		                          value={warehouseSearch}
		                          onChange={(e) => setWarehouseSearch(e.target.value)}
		                          placeholder={isSub ? "Поиск сборочной единицы..." : "Поиск по складу..."}
		                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
		                        />
		                      </div>
		                    )}
		                    {!isSub && availableComponents.length > 0 && (
		                      <>
	                        <div className="px-2 py-1.5 text-xs font-bold text-emerald-600">Складские компоненты</div>
	                        {availableComponents.map(comp => (
	                          <button key={comp.id} type="button" onClick={() => handleAssignResource(comp.id, "component")} className="w-full rounded-xl p-3 text-left transition-colors hover:bg-slate-50">
	                            <span className="block text-sm font-semibold text-slate-800">{comp.name}</span>
	                            {comp.part_number && <span className="mt-1 block text-xs font-mono text-slate-400">{comp.part_number}</span>}
	                          </button>
	                        ))}
	                      </>
	                    )}
                    </div>
	                  </div>
	                )}
              </div>
              {!isOperation && !isSub && alternatives.length > 0 && (
                <p className="mt-2 text-[11px] font-semibold text-slate-400">
                  Аналоги: {alternatives.length} · склад {alternativesQty} шт.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-row items-center justify-between sm:justify-end gap-4 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
          <div className="text-left sm:text-right min-w-[60px]">
            <p className="font-semibold text-slate-800 text-xs">{item.quantity || 0} шт.</p>
          </div>
          <div className="flex gap-1.5">
		            <button onClick={handleDelete} className={buttonStyles.iconDanger} title="Удалить">
              <Icons.Close className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {shouldShowNestedContent && directChildren.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1 border-l-2 border-dashed border-slate-200 ml-3 pl-3 w-full">
          {directChildren.map((child) => (
            <BOMRow
              key={child.id}
              item={child}
              productsList={productsList}
              onResolveSuccess={onResolveSuccess}
              onDrillDown={onDrillDown}
              level={level + 1}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              selectedCategory={selectedCategory}
              parentSectionName={parentSectionName || "Вложенные позиции"}
            />
          ))}
        </div>
      )}

      {shouldShowNestedContent && isSub && subProductData?.sections && (
        <div className="flex flex-col gap-4 mt-1 border-l-2 border-dashed border-indigo-200 ml-3 pl-3 w-full">
          {subProductData.sections
            .filter(section => selectedCategory === "all" || section.name === selectedCategory)
            .map((section) => {
              const hasVisibleItems = section.items?.some(subItem => {
                const subType = subItem.item_type || ((subItem.resource_type === "product" || subItem.resource_type === "subassembly") ? "assembly" : "component");
                const subHasLink = subType === "operation" || (subItem.resource_id !== null && subItem.resource !== null);
                const sSearch = (subItem.design_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (subItem.designators || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (subItem.resource?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (subItem.operation_role || "").toLowerCase().includes(searchQuery.toLowerCase());
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
      {editPanel}
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

  const closeProductPanel = () => {
    setShowProductForm(false);
    setIsEditingProduct(false);
  };

  const productPanel = (showProductForm || isEditingProduct) && (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Закрыть форму изделия"
        className="hidden flex-1 cursor-default md:block"
        onClick={closeProductPanel}
      />
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
        <ProductForm
          panel
          initialData={isEditingProduct ? viewingProduct : activeTab === "sub" ? { is_final: false } : null}
          onBack={() => { closeProductPanel(); fetchProducts(); }}
        />
      </div>
    </div>
  );

  const bomPanel = showBOMForm && viewingProduct && (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Закрыть добавление позиции"
        className="hidden flex-1 cursor-default md:block"
        onClick={() => setShowBOMForm(false)}
      />
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
        <BOMItemForm
          panel
          productId={viewingProduct.id}
          productTree={viewingProduct.tree || []}
          onBack={() => setShowBOMForm(false)}
          onSuccess={fetchProducts}
        />
      </div>
    </div>
  );

  // --- ЭКРАН СОСТАВА ИЗДЕЛИЯ ---
  if (viewingProduct) {
    const bomRootsCount = viewingProduct.tree?.length || viewingProduct.sections?.reduce((sum, section) => sum + (section.items?.length || 0), 0) || 0;
    const totalBomRows = viewingProduct.tree?.length
      ? (() => {
          const countRows = (items = []) => items.reduce((sum, item) => sum + 1 + countRows(item.children || []), 0);
          return countRows(viewingProduct.tree);
        })()
      : bomRootsCount;
    const bomRows = viewingProduct.tree?.length
      ? (() => {
          const collectRows = (items = []) => items.flatMap((item) => [item, ...collectRows(item.children || [])]);
          return collectRows(viewingProduct.tree);
        })()
      : viewingProduct.sections?.flatMap((section) => section.items || []) || [];
    const linkedRowsCount = bomRows.filter((item) => item.is_resolved || item.resource_id || item.resource_type === "operation").length;
    const attentionRowsCount = Math.max(totalBomRows - linkedRowsCount, 0);

    return (
      <div className="w-full max-w-none p-4 font-sans text-slate-800 antialiased sm:p-6 md:p-10">
        <div className="mb-6">
          <button onClick={handleGoBackInTree} className="text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-1 transition-colors">
            <span>&larr;</span>
            <span>{historyStack.length > 0 ? "Уровень выше" : "К списку изделий"}</span>
          </button>

          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                      viewingProduct.is_subassembly
                        ? "border-indigo-100 bg-indigo-50 text-indigo-700"
                        : "border-blue-100 bg-blue-50 text-blue-700"
                    }`}>
                      {viewingProduct.is_subassembly ? "Сборочная единица" : "Готовое изделие"}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 break-words">
                    {viewingProduct.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(true)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#3F8CFF] bg-[#3F8CFF] px-4 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#1f78ff] hover:shadow-md active:translate-y-0 sm:w-auto"
                  title="Редактировать паспорт"
                >
                  <Icons.Edit />
                  <span>Редактировать</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <p className="text-[11px] font-bold text-slate-400">Децимальный №</p>
                  <p className="mt-1 truncate font-mono text-sm font-semibold text-slate-800">{viewingProduct.drawing_number || "не указан"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <p className="text-[11px] font-bold text-slate-400">Ревизия</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{viewingProduct.revision || "1.0"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <p className="text-[11px] font-bold text-slate-400">Строк состава</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{totalBomRows}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ProductFilesPanel product={viewingProduct} onChanged={fetchProducts} />

        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-5 sm:p-6 mb-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xl font-black text-slate-900">Состав изделия</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                  Позиции, сборочные единицы и работы, которые входят в изделие.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
                <button onClick={() => handleSmartResolve(viewingProduct.id)} className={`${buttonStyles.success} h-10 px-4`}>Автоподбор</button>
                <button onClick={() => setShowBOMForm(true)} className={`${buttonStyles.primary} h-10 px-4`}>Добавить позицию</button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <p className="text-[11px] font-bold text-slate-400">Всего позиций</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{totalBomRows}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                <p className="text-[11px] font-bold text-emerald-600">Привязано</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">{linkedRowsCount}</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3">
                <p className="text-[11px] font-bold text-rose-500">Требует внимания</p>
                <p className="mt-1 text-sm font-semibold text-rose-600">{attentionRowsCount}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                <div className="relative w-full">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2"><Icons.Search /></span>
                  <input
                    type="text"
                    placeholder="Поиск по составу"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 pl-10 pr-10 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <Icons.Close className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative w-full md:col-span-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full min-h-11 appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 py-3 pr-10 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#3F8CFF] focus:ring-4 focus:ring-blue-500/10"
                  >
                    {availableCategoriesInProduct.map(catName => (
                      <option key={catName} value={catName}>
                        {catName === "all" ? "Все разделы состава" : catName}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icons.ChevronDown />
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                    statusFilter === "all" ? "bg-[#3F8CFF] border-[#3F8CFF] text-white" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Все
                </button>
                <button
                  onClick={() => setStatusFilter("resolved")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                    statusFilter === "resolved" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Привязаны
                </button>
                <button
                  onClick={() => statusFilter === "unresolved" ? setStatusFilter("all") : setStatusFilter("unresolved")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                    statusFilter === "unresolved" ? "bg-rose-50 border-rose-500 text-rose-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Требуют внимания
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Вывод дерева спецификации */}
        <div className="flex flex-col gap-6 w-full">
          {viewingProduct.tree && viewingProduct.tree.length > 0 ? (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-col gap-2 w-full">
                {viewingProduct.tree.map((item) => (
                  <BOMRow
                    key={item.id}
                    item={item}
                    productsList={products}
                    onResolveSuccess={fetchProducts}
                    onDrillDown={handleDrillDown}
                    searchQuery={searchQuery}
                    statusFilter={statusFilter}
                    selectedCategory={selectedCategory}
                    parentSectionName=""
                  />
                ))}
              </div>
            </div>
          ) : viewingProduct.sections && viewingProduct.sections.length > 0 ? (
            viewingProduct.sections
              .filter(section => selectedCategory === "all" || section.name === selectedCategory)
              .map((section) => {
                const isHeaderVisible = selectedCategory === "all";
                const hasVisibleItems = section.items && section.items.length > 0;

                if (!hasVisibleItems) return null;

                return (
                  <div key={section.name} className="flex flex-col gap-2 w-full">
                    {isHeaderVisible && (
                      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm flex items-center gap-2">
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
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm font-medium text-slate-400">
              Состав изделия пока пуст.
            </div>
          )}
        </div>
        {productPanel}
        {bomPanel}
      </div>
    );
  }

  const visibleProducts = activeTab === "main" ? mainDevices : subAssemblies;

  // --- ГЛАВНЫЙ ЭКРАН МОДУЛЯ (БАЗА ИЗДЕЛИЙ) ---
  return (
    <div className="w-full max-w-none p-4 font-sans text-slate-800 antialiased sm:p-6 md:p-10">
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Каталог производства</p>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">База изделий</h1>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">Карточки устройств и сборочных единиц с составом, работами, документами и связью со складом.</p>
          </div>
	          <button
	            onClick={() => setShowProductForm(true)}
	            className={`${buttonStyles.primary} w-full sm:w-auto h-10 px-5`}
	          >
            {activeTab === "sub" ? "Новая сборочная единица" : "Новое изделие"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => setActiveTab("main")}
	            className={`text-left rounded-2xl border p-4 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
              activeTab === "main" ? "bg-blue-50 border-blue-100 text-blue-700 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icons.Box className="w-5 h-5" />
              <span className="text-sm font-black">Готовые устройства</span>
            </div>
            <p className="text-xs mt-2 opacity-75">{mainDevices.length} карточек для запуска в производство</p>
          </button>
          <button
            onClick={() => setActiveTab("sub")}
	            className={`text-left rounded-2xl border p-4 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
              activeTab === "sub" ? "bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icons.Puzzle className="w-5 h-5" />
              <span className="text-sm font-black">Сборочные единицы</span>
            </div>
            <p className="text-xs mt-2 opacity-75">{subAssemblies.length} узлов, плат и полуфабрикатов</p>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm font-medium text-slate-400">Загрузка данных...</div>
      ) : (
        /* Адаптивная Grid-сетка карточек */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => { setViewingProduct(product); setHistoryStack([]); }}
              className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col justify-between hover:border-blue-100 hover:shadow-sm transition-all relative cursor-pointer group min-w-0 overflow-hidden"
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteProductFromBase(product.id, product.name, e); }}
	                className={`${buttonStyles.iconDanger} absolute top-4 right-4`}
                title="Удалить из базы"
              >
                <Icons.Close className="w-4 h-4" />
              </button>

              <div className="min-w-0 pr-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border mb-4 ${product.is_subassembly ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-blue-50 border-blue-100 text-blue-600"}`}>
                  {product.is_subassembly ? <Icons.Puzzle className="w-6 h-6" /> : <Icons.Box className="w-6 h-6" />}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  {product.is_subassembly ? "Сборочная единица" : "Готовое изделие"}
                </p>
                <h3 className="text-base font-black text-slate-900 truncate mb-2 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                <div className="space-y-1 text-[11px] text-slate-400">
                  <p className="font-mono truncate">Децимальный №: {product.drawing_number || "не указан"}</p>
                  <p>Ревизия: {product.revision || "1.0"}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 mt-5 pt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
                <span>{product.tree?.length || 0} корневых позиций</span>
                <span className="text-blue-600 group-hover:translate-x-0.5 transition-transform">Открыть</span>
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
      {productPanel}
    </div>
  );
}
