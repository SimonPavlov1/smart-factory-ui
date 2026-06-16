import React, { useState, useEffect } from "react";
import InventoryForm from "./InventoryForm";

// Иконки
const Icons = {
  Plus: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Incoming: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
};

export default function InventoryBase() {
  const [components, setComponents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [showForm, setShowForm] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [incomingCompId, setIncomingCompId] = useState(null);
  const [incomingQty, setIncomingQty] = useState("");
  const [editingQtyId, setEditingQtyId] = useState(null);
  const [tempQty, setTempQty] = useState("");

  const fetchComponents = async (searchStr = "") => {
    let url = "/api/inventory/components";
    if (searchStr.trim()) url += `?search=${encodeURIComponent(searchStr.trim())}`;
    const res = await fetch(url);
    if (res.ok) setComponents(await res.json());
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchComponents(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить позицию?")) return;
    const res = await fetch(`/api/inventory/components/${id}`, { method: "DELETE" });
    if (res.ok) fetchComponents(searchQuery);
  };

  const handleUpdateQty = async (id, val) => {
    const res = await fetch(`/api/inventory/components/${id}/quantity?new_quantity=${val}`, { method: "PATCH" });
    if (res.ok) { setEditingQtyId(null); fetchComponents(searchQuery); }
  };

  const handleIncomingSubmit = async (e, id) => {
    e.preventDefault();
    const res = await fetch(`/api/inventory/incoming?component_id=${id}&quantity=${incomingQty}`, { method: "POST" });
    if (res.ok) { setIncomingCompId(null); setIncomingQty(""); fetchComponents(searchQuery); }
  };

  const groupedComponents = components
    .filter(c => selectedCategory === "Все" || c.category === selectedCategory)
    .reduce((acc, comp) => {
      const cat = comp.category || "Без категории";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(comp);
      return acc;
    }, {});

  const categories = ["Все", ...new Set(components.map(c => c.category).filter(Boolean))];

  if (showForm) {
    return <InventoryForm initialData={editingComponent} onBack={() => { setShowForm(false); setEditingComponent(null); }} onSuccess={() => { setShowForm(false); setEditingComponent(null); fetchComponents(); }} />;
  }

  return (
    <div className="w-full px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Склад ТМЦ</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Всего номенклатуры: {components.length}</p>
        </div>
        <button onClick={() => { setEditingComponent(null); setShowForm(true); }} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all">
          <Icons.Plus /> Создать позицию
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 mb-8 flex flex-wrap gap-4 items-center">
        <input type="text" placeholder="ПОИСК..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 min-w-[200px] p-3 text-sm border-0 focus:ring-0 outline-none font-bold placeholder-slate-300" />
        <div className="flex gap-1 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedCategory === cat ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(groupedComponents).map(([category, items]) => (
        <div key={category} className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{category}</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {items.map((comp) => (
              <div key={comp.id} className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all flex flex-col justify-between group">
                <div>
                   <h4 className="font-black text-sm text-slate-900 uppercase leading-tight group-hover:text-slate-600 transition-colors">{comp.name}</h4>
                   <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">{comp.part_number}</p>
                   <div className="flex flex-wrap gap-2 mt-3">
                     {[comp.package, comp.value, comp.voltage].filter(Boolean).map((attr, i) => (
                       <span key={i} className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider">{attr}</span>
                     ))}
                   </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                  {editingQtyId === comp.id ? (
                    <input type="number" autoFocus className="w-20 p-1 text-sm font-black border-b-2 border-slate-900 outline-none" value={tempQty} onChange={(e) => setTempQty(e.target.value)} onBlur={() => handleUpdateQty(comp.id, tempQty)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateQty(comp.id, tempQty)} />
                  ) : (
                    <span onClick={() => { setEditingQtyId(comp.id); setTempQty(comp.quantity || 0); }} className={`font-black text-sm cursor-pointer hover:text-slate-900 transition-colors ${comp.quantity > 0 ? "text-slate-900" : "text-rose-500"}`} title="Нажмите для редактирования">
                      {comp.quantity || 0} шт.
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    {incomingCompId === comp.id ? (
                      <form onSubmit={(e) => handleIncomingSubmit(e, comp.id)} className="flex items-center gap-1">
                        <input type="number" className="w-12 p-1 text-[10px] border border-slate-200 rounded-lg" value={incomingQty} onChange={(e) => setIncomingQty(e.target.value)} />
                        <button type="submit" className="text-slate-900 font-black text-[10px] uppercase">OK</button>
                      </form>
                    ) : (
                      <>
                        <button onClick={() => setIncomingCompId(comp.id)} className="p-1.5 text-slate-300 hover:text-slate-900 transition-colors" title="Оприходовать"><Icons.Incoming /></button>
                        <button onClick={() => { setEditingComponent(comp); setShowForm(true); }} className="p-1.5 text-slate-300 hover:text-slate-900 transition-colors"><Icons.Edit /></button>
                        <button onClick={() => handleDelete(comp.id)} className="p-1.5 text-slate-300 hover:text-red-600 transition-colors"><Icons.Trash /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}