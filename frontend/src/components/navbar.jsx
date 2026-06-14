import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-gray-800 text-white">
      <h2 className="text-lg font-bold">💰 SplitWise</h2>
      <div className="flex gap-4 items-center text-sm">
        <Link to="/dashboard" className="text-gray-300 hover:text-white">Dashboard</Link>
        <Link to="/groups" className="text-gray-300 hover:text-white">Groups</Link>
        <Link to="/import" className="text-gray-300 hover:text-white">Import CSV</Link>
        <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded text-sm cursor-pointer">Logout</button>
      </div>
    </nav>
  );
}
