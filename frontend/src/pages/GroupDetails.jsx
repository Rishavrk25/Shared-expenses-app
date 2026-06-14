import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import MainLayout from "../layouts/MainLayout";
import ExpenseCard from "../components/ExpenseCard";
import BalanceCard from "../components/BalanceCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function GroupDetails() {
  const { id } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Expense form
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [paidBy, setPaidBy] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [participants, setParticipants] = useState("");
  const [formError, setFormError] = useState("");

  const fetchData = async () => {
    try {
      const [expRes, balRes, setRes] = await Promise.all([
        API.get(`/groups/${id}/expenses`),
        API.get(`/groups/${id}/balances`),
        API.get(`/settlements/groups/${id}/settlements/suggestions`),
      ]);
      setExpenses(expRes.data);
      setBalances(balRes.data);
      setSettlements(setRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const parts = participants.split(",").map((p) => {
        const [userId, shareAmount] = p.trim().split(":");
        return { userId: Number(userId), shareAmount: Number(shareAmount) };
      });
      await API.post("/expenses", {
        groupId: Number(id), title, amount: Number(amount), currency,
        paidBy: Number(paidBy), expenseDate, participants: parts,
      });
      setTitle(""); setAmount(""); setPaidBy(""); setExpenseDate(""); setParticipants("");
      setShowForm(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.message || "Failed to add expense");
    }
  };

  if (loading) return <MainLayout><LoadingSpinner /></MainLayout>;

  return (
    <MainLayout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Group #{id}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Balances */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">💰 Balances</h3>
          {balances.length === 0 ? (
            <p className="text-gray-400 text-sm">No balances yet</p>
          ) : (
            <div className="space-y-2">
              {balances.map((b) => <BalanceCard key={b.userId} balance={b} />)}
            </div>
          )}
        </div>

        {/* Settlement Suggestions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🤝 Settlement Suggestions</h3>
          {settlements.length === 0 ? (
            <p className="text-green-500 text-sm font-medium">✅ All settled!</p>
          ) : (
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <span className="font-medium text-gray-800">{s.from}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-800">{s.to}</span>
                  <span className="ml-auto font-bold text-yellow-700">₹{s.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">📋 Expenses</h3>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer">
            {showForm ? "Cancel" : "+ Add Expense"}
          </button>
        </div>

        {/* Add Expense Form */}
        {showForm && (
          <div className="bg-gray-50 rounded-xl p-5 mb-4 border border-gray-200">
            {formError && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm mb-3">{formError}</div>}
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Pizza" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="800" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="INR" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Paid By (User ID)</label>
                <input type="number" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Participants (userId:share)</label>
                <input type="text" value={participants} onChange={(e) => setParticipants(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1:200,2:200,3:200" required />
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 cursor-pointer">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        )}

        {expenses.length === 0 ? (
          <p className="text-gray-400 text-sm">No expenses yet</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((exp) => <ExpenseCard key={exp.id} expense={exp} />)}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
