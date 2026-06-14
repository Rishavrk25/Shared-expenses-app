import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import Navbar from "../components/Navbar";
import ExpenseCard from "../components/ExpenseCard";
import BalanceCard from "../components/BalanceCard";

export default function GroupDetails() {
  const { id } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [paidBy, setPaidBy] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [participants, setParticipants] = useState("");
  const [error, setError] = useState("");

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
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError("");
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
      setError(err.response?.data?.error || err.response?.data?.message || "Failed");
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-xl font-bold mb-4">Group #{id}</h2>

        <h3 className="font-semibold mb-2">Balances</h3>
        {balances.length === 0 ? <p className="text-gray-400 text-sm mb-4">No balances yet</p> :
          <div className="mb-4">{balances.map((b) => <BalanceCard key={b.userId} balance={b} />)}</div>}

        <h3 className="font-semibold mb-2">Settlement Suggestions</h3>
        {settlements.length === 0 ? <p className="text-gray-400 text-sm mb-4">All settled!</p> : (
          <div className="mb-4">
            {settlements.map((s, i) => (
              <div key={i} className="p-2 bg-yellow-50 border border-yellow-200 rounded mb-1 text-sm">
                {s.from} → {s.to}: <strong>₹{s.amount}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Expenses</h3>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm cursor-pointer">
            {showForm ? "Cancel" : "+ Add Expense"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddExpense} className="flex flex-col gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="border p-2 rounded text-sm" required />
            <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="border p-2 rounded text-sm" required />
            <input type="text" placeholder="Currency (INR)" value={currency} onChange={(e) => setCurrency(e.target.value)} className="border p-2 rounded text-sm" />
            <input type="number" placeholder="Paid By (userId)" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="border p-2 rounded text-sm" required />
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="border p-2 rounded text-sm" required />
            <input type="text" placeholder="Participants (1:200,2:200)" value={participants} onChange={(e) => setParticipants(e.target.value)} className="border p-2 rounded text-sm" required />
            <button type="submit" className="bg-green-500 text-white p-2 rounded text-sm cursor-pointer">Add Expense</button>
          </form>
        )}

        {expenses.map((exp) => <ExpenseCard key={exp.id} expense={exp} />)}
        {expenses.length === 0 && <p className="text-gray-400 text-sm">No expenses yet</p>}
      </div>
    </>
  );
}
