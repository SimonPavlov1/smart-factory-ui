import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import GadgetsBase from "./components/GadgetsBase.jsx";
import InventoryBase from "./components/InventoryBase.jsx";
import ManufacturingPage from "./components/ManufacturingPage";
import { clearToken, getToken, installAuthFetch, setToken } from "./api";
import "./index.css";

installAuthFetch();

const ROLE_LABELS = {
  admin: "Администратор",
  warehouse: "Кладовщик",
  manager: "Менеджер",
  engineer: "Технолог",
  production: "Производство",
};

const Dashboard = ({ user }) => (
  <div className="p-10">
    <h1 className="text-3xl font-bold">Панель</h1>
    <p className="text-sm text-slate-500 mt-2">
      {user.full_name || user.username} · {ROLE_LABELS[user.role] || user.role}
    </p>
  </div>
);

const AllApplications = () => <div className="p-10"><h1 className="text-3xl font-bold">Все заявки</h1></div>;
const MyTasks = () => <div className="p-10"><h1 className="text-3xl font-bold">Мои задачи</h1></div>;

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Не удалось войти");
      }

      const data = await res.json();
      setToken(data.access_token);
      const me = await fetch("/api/auth/me");
      if (!me.ok) throw new Error("Не удалось получить профиль");
      onLogin(await me.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F5FA] flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-[28px] border border-slate-100 shadow-sm p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Вход в MES</h1>
          <p className="text-xs text-slate-400 mt-1">Введите учетные данные пользователя</p>
        </div>

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Логин</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
        </div>

        <button disabled={loading} className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold text-xs uppercase tracking-widest disabled:bg-slate-300">
          {loading ? "Вход..." : "Войти"}
        </button>

        <p className="text-[11px] text-slate-400">Первичная dev-учетка: admin / admin123, если база пользователей пустая.</p>
      </form>
    </div>
  );
}

function Personnel() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", role: "manager" });
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Не удалось создать пользователя");
      return;
    }
    setForm({ username: "", password: "", full_name: "", role: "manager" });
    fetchUsers();
  };

  const updateUser = async (user, patch) => {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, ...patch, password: undefined }),
    });
    if (res.ok) fetchUsers();
  };

  return (
    <div className="p-10 space-y-6">
      <h1 className="text-2xl font-black text-slate-900">Пользователи и роли</h1>

      <form onSubmit={createUser} className="bg-white border border-slate-100 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input required placeholder="Логин" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="p-3 border rounded-xl text-sm" />
        <input required placeholder="Пароль" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="p-3 border rounded-xl text-sm" />
        <input placeholder="Имя" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="p-3 border rounded-xl text-sm" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="p-3 border rounded-xl text-sm">
          {Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
        </select>
        <button className="bg-slate-900 text-white rounded-xl text-xs font-bold uppercase">Создать</button>
      </form>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {users.map((user) => (
          <div key={user.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-4 border-b last:border-b-0">
            <div className="font-bold text-sm">{user.username}</div>
            <div className="text-sm text-slate-500">{user.full_name || "—"}</div>
            <select value={user.role} onChange={(e) => updateUser(user, { role: e.target.value })} className="p-2 border rounded-lg text-sm">
              {Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
            </select>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={user.is_active} onChange={(e) => updateUser(user, { is_active: e.target.checked })} />
              Активен
            </label>
            <div className="text-xs text-slate-400">ID {user.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("Панель");
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const logout = () => {
    clearToken();
    setUser(null);
  };

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      if (!getToken()) {
        setBooting(false);
        return;
      }
      const res = await fetch("/api/auth/me");
      if (res.ok) setUser(await res.json());
      setBooting(false);
    };
    loadUser();
  }, []);

  const canOpen = (page) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (page === "Персонал") return false;
    if (page === "База изделий") return ["engineer", "manager", "production"].includes(user.role);
    if (page === "Склад ТМЦ") return ["warehouse", "manager", "engineer"].includes(user.role);
    if (page === "Производство") return ["warehouse", "manager", "production"].includes(user.role);
    return true;
  };

  const renderContent = () => {
    if (!canOpen(activePage)) return <Dashboard user={user} />;

    switch (activePage) {
      case "Панель": return <Dashboard user={user} />;
      case "Все заявки": return <AllApplications />;
      case "Мои задачи": return <MyTasks />;
      case "Персонал": return <Personnel />;
      case "База изделий": return <GadgetsBase />;
      case "Склад ТМЦ": return <InventoryBase />;
      case "Производство": return <ManufacturingPage />;
      default: return <Dashboard user={user} />;
    }
  };

  if (booting) return <div className="min-h-screen bg-[#F0F5FA]" />;
  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <div className="flex h-screen bg-[#F0F5FA] p-5">
      <Sidebar activePage={activePage} setActivePage={setActivePage} user={user} onLogout={logout} canOpen={canOpen} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
