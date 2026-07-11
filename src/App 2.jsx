import React, { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import GadgetsBase from "./components/GadgetsBase.jsx";
import InventoryBase from "./components/InventoryBase.jsx";
import ManufacturingPage from "./components/ManufacturingPage";
import "./index.css";

// Твои заглушки страниц
const Dashboard = () => <div className="p-10"><h1 className="text-3xl font-bold">Панель</h1></div>;
const AllApplications = () => <div className="p-10"><h1 className="text-3xl font-bold">Все заявки</h1></div>;
const MyTasks = () => <div className="p-10"><h1 className="text-3xl font-bold">Мои задачи</h1></div>;
const Personnel = () => <div className="p-10"><h1 className="text-3xl font-bold">Персонал</h1></div>;

export default function App() {
  const [activePage, setActivePage] = useState("Панель");

  // Функция переключения страниц — добавили кейс для Склада
  const renderContent = () => {
    switch (activePage) {
      case 'Панель': return <Dashboard />;
      case 'Все заявки': return <AllApplications />;
      case 'Мои задачи': return <MyTasks />;
      case 'Персонал': return <Personnel />;
      case 'База изделий': return <GadgetsBase />;
      case 'Склад ТМЦ': return <InventoryBase />;
      case 'Производство': return <ManufacturingPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F0F5FA] p-5">
      {/* Передаем стейт в Sidebar, чтобы он мог переключать на "Склад ТМЦ" */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}