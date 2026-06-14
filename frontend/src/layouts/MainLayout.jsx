import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function MainLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
    }`;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-gray-700">
          <h1 className="text-xl font-bold">💰 SplitWise</h1>
          <p className="text-xs text-gray-400 mt-1">Shared Expense Manager</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink to="/dashboard" className={linkClass}>
            <span>📊</span> Dashboard
          </NavLink>
          <NavLink to="/groups" className={linkClass}>
            <span>👥</span> Groups
          </NavLink>
          <NavLink to="/import" className={linkClass}>
            <span>📁</span> CSV Import
          </NavLink>
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-600 hover:text-white transition-colors cursor-pointer">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Shared Expense App</h2>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 cursor-pointer">
            Logout
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
