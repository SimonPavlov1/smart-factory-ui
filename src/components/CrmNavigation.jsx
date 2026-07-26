import React, { useState } from "react";
import projectLogo from "../assets/logo.svg";
import {
  Bell,
  Boxes,
  CalendarDays,
  CheckSquare,
  CircleHelp,
  ClipboardList,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PackageCheck,
  Search,
  Settings,
  Sun,
  Users,
  Warehouse,
  X,
} from "lucide-react";

const primaryItems = [
  { id: "Панель", label: "Обзор", icon: LayoutDashboard },
  { id: "Все заявки", label: "Заявки", icon: CalendarDays },
  { id: "Все задачи", label: "Все задачи", icon: ClipboardList },
  { id: "Мои задачи", label: "Мои задачи", icon: CheckSquare },
  { id: "Персонал", label: "Команда", icon: Users },
];

const workspaceItems = [
  { id: "База изделий", label: "База изделий", icon: Boxes },
  { id: "Склад ТМЦ", label: "Склад ТМЦ", icon: Warehouse },
  { id: "Склад готовой продукции", label: "Готовая продукция", icon: PackageCheck },
  { id: "Производство", label: "Производство", icon: Factory },
];

function Logo() {
  return <img className="crm-logo" src={projectLogo} alt="" aria-hidden="true" />;
}

function initials(user) {
  const name = user?.full_name || user?.phone || "Пользователь";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function CrmSidebar({
  activePage,
  onOpenPage,
  user,
  onLogout,
  canOpen,
  open,
  onClose,
}) {
  const items = (list) => list.filter(({ id }) => canOpen(id)).map(({ id, label, icon }) => (
    <button
      type="button"
      className={activePage === id ? "active" : ""}
      onClick={() => {
        onOpenPage(id);
        onClose();
      }}
      key={id}
    >
      {React.createElement(icon, { size: 19 })}
      <span>{label}</span>
    </button>
  ));

  return (
    <>
      <button type="button" aria-label="Закрыть меню" className={`crm-sidebar-backdrop ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`crm-sidebar ${open ? "open" : ""}`}>
        <div className="crm-brand">
          <Logo />
          <span>Проекты</span>
          <button type="button" onClick={onClose} aria-label="Закрыть меню"><X size={20} /></button>
        </div>

        <nav className="crm-nav">
          <div>{items(primaryItems)}</div>
          <p>Рабочее пространство</p>
          <div>{items(workspaceItems)}</div>
        </nav>

        <div className="crm-profile">
          <span className="crm-avatar violet">{initials(user)}</span>
          <div>
            <strong>{user?.full_name || user?.phone || "Пользователь"}</strong>
            <span>{user?.role || "Сотрудник"}</span>
          </div>
          <button type="button" onClick={onLogout} aria-label="Выйти"><LogOut size={17} /></button>
        </div>
      </aside>
    </>
  );
}

export function CrmTopbar({ onMenu, onOpenPage, activePage, theme, onToggleTheme }) {
  const [query, setQuery] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (query.trim()) onOpenPage("Все задачи");
  };

  return (
    <header className="crm-topbar">
      <button type="button" className="mobile-menu" onClick={onMenu} aria-label="Открыть меню"><Menu /></button>
      <div className="crm-location">
        <span>Проекты</span>
        <strong>{primaryItems.concat(workspaceItems).find((item) => item.id === activePage)?.label || activePage}</strong>
      </div>
      <form className="crm-search" onSubmit={submit}>
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти заявку, задачу или изделие" />
        <kbd>⌘ K</kbd>
      </form>
      <div className="crm-top-actions">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
          title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        >
          {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button type="button" aria-label="Помощь"><CircleHelp size={19} /></button>
        <button type="button" className="notification" aria-label="Уведомления"><Bell size={19} /></button>
      </div>
    </header>
  );
}
