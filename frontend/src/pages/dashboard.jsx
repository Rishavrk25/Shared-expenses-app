import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import MainLayout from "../layouts/MainLayout";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [imports, setImports] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      API.get("/groups").catch(() => ({ data: [] })),
      API.get("/import").catch(() => ({ data: [] })),
      API.get("/expenses").catch(() => ({ data: [] }))
    ])
      .then(([groupsRes, importsRes, expensesRes]) => {
        setGroups(groupsRes.data || []);
        setImports(importsRes.data || []);
        setExpenses(expensesRes.data || []);
      })
      .catch((err) => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <MainLayout><LoadingSpinner /></MainLayout>;
  if (error) return <MainLayout><div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div></MainLayout>;

  return (
    <MainLayout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Total Groups</p>
          <p className="text-3xl font-bold text-blue-600">{groups.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
          <p className="text-3xl font-bold text-purple-600">{expenses.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Import Reports</p>
          <p className="text-3xl font-bold text-orange-600">{imports.length}</p>
        </div>
      </div>

      {/* Recent Groups */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Groups</h3>
      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 mb-3">No groups yet</p>
          <Link to="/groups" className="text-blue-600 font-medium hover:underline">Create your first group →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {groups.slice(0, 6).map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                  {g.name?.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-800">{g.name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
