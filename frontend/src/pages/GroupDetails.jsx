import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import MainLayout from "../layouts/MainLayout";
import ExpenseCard from "../components/ExpenseCard";
import BalanceCard from "../components/BalanceCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { Coins, Handshake, CheckCircle2, ReceiptText, Users, UserPlus, X } from "lucide-react";

export default function GroupDetails() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Add Member
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");

  // Expense form
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [paidBy, setPaidBy] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [splitType, setSplitType] = useState("exact");
  const [participantShares, setParticipantShares] = useState({});
  const [selectedForEqual, setSelectedForEqual] = useState({});
  const [formError, setFormError] = useState("");

  const fetchData = async () => {
    try {
      const [grpRes, expRes, balRes, setRes, memRes, usersRes] = await Promise.all([
        API.get(`/groups/${id}`),
        API.get(`/groups/${id}/expenses`),
        API.get(`/groups/${id}/balances`),
        API.get(`/settlements/groups/${id}/settlements/suggestions`),
        API.get(`/groups/${id}/members`).catch(() => ({ data: [] })),
        API.get("/auth/users").catch(() => ({ data: [] })),
      ]);
      setGroup(grpRes.data);
      setExpenses(expRes.data);
      setBalances(balRes.data);
      setSettlements(setRes.data);
      setMembers(memRes.data || []);
      setAllUsers(usersRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError(""); setMemberSuccess("");
    try {
      await API.post(`/groups/${id}/members`, { userId: Number(newMemberUserId) });
      setMemberSuccess("Member added!");
      setNewMemberUserId("");
      fetchData();
      setTimeout(() => setMemberSuccess(""), 2000);
    } catch (err) {
      setMemberError(err.response?.data?.error || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm("Remove this member from the group?")) return;
    try {
      await API.delete(`/groups/${id}/members/${userId}`);
      fetchData();
    } catch (err) {
      setMemberError(err.response?.data?.error || "Failed to remove member");
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      let parts = [];
      const totalAmount = Number(amount);
      
      if (splitType === "equal") {
        const selectedMembers = members.filter(m => selectedForEqual[m.user_id || m.id] !== false);
        if (selectedMembers.length === 0) {
          setFormError("Please select at least one participant");
          return;
        }
        
        let splitAmount = Math.floor((totalAmount / selectedMembers.length) * 100) / 100;
        let remainder = Math.round((totalAmount - (splitAmount * selectedMembers.length)) * 100) / 100;
        
        parts = selectedMembers.map((m, i) => {
          const uid = m.user_id || m.id;
          let userShare = splitAmount;
          if (i === 0) userShare = Math.round((userShare + remainder) * 100) / 100;
          return { userId: Number(uid), shareAmount: userShare };
        });
      } else if (splitType === "percentage") {
        let totalPercentage = 0;
        parts = Object.entries(participantShares)
          .filter(([_, share]) => Number(share) > 0)
          .map(([userId, share]) => {
            totalPercentage += Number(share);
            return { userId: Number(userId), shareAmount: Math.round((Number(share) / 100) * totalAmount * 100) / 100 };
          });
          
        if (Math.abs(totalPercentage - 100) > 0.01) {
          setFormError(`Total percentage must equal 100%. Current: ${totalPercentage}%`);
          return;
        }
        
        const currentSum = parts.reduce((sum, p) => sum + p.shareAmount, 0);
        const diff = Math.round((totalAmount - currentSum) * 100) / 100;
        if (parts.length > 0 && Math.abs(diff) > 0) {
           parts[0].shareAmount = Math.round((parts[0].shareAmount + diff) * 100) / 100;
        }
      } else {
        parts = Object.entries(participantShares)
          .filter(([_, share]) => Number(share) > 0)
          .map(([userId, share]) => ({ userId: Number(userId), shareAmount: Number(share) }));
      }
        
      if (parts.length === 0) {
        setFormError("Please enter a share amount for at least one participant");
        return;
      }

      await API.post("/expenses", {
        groupId: Number(id), title, amount: Number(amount), currency,
        paidBy: Number(paidBy), expenseDate, participants: parts,
      });
      setTitle(""); setAmount(""); setPaidBy(""); setExpenseDate(""); setParticipantShares({}); setSplitType("exact");
      setShowForm(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.message || "Failed to add expense");
    }
  };

  const handleRecordSettlement = async (payerId, receiverId, amount) => {
    if (!confirm(`Record settlement of ₹${amount}?`)) return;
    try {
      await API.post("/settlements", {
        groupId: Number(id),
        payerId,
        receiverId,
        amount,
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to record settlement");
    }
  };

  if (loading) return <MainLayout><LoadingSpinner /></MainLayout>;

  return (
    <MainLayout>
      {/* Group Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
            {group?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{group?.name}</h2>
            <p className="text-sm text-gray-500">
              Created by {group?.created_by_name} · {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Members section */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Users className="w-4 h-4" /> Group Members
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {members.map((m) => (
              <div key={m.user_id || m.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full text-sm group transition-all hover:bg-white hover:shadow-sm">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {(m.name || "?").charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-700">{m.name || `User #${m.user_id}`}</span>
                <button onClick={() => handleRemoveMember(m.user_id || m.id)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove member">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          
          <form onSubmit={handleAddMember} className="flex gap-2 max-w-md">
            <select value={newMemberUserId} onChange={(e) => setNewMemberUserId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm" required>
              <option value="">+ Select a user to add...</option>
              {allUsers
                .filter((u) => !members.some((m) => (m.user_id || m.id) === u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
            </select>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer shadow-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Add
            </button>
          </form>
          {memberError && <p className="text-red-500 text-sm mt-2 font-medium">{memberError}</p>}
          {memberSuccess && <p className="text-green-600 text-sm mt-2 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> {memberSuccess}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Balances */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" /> Balances
          </h3>
          {balances.length === 0 ? (
            <p className="text-gray-400 text-sm">No balances yet</p>
          ) : (
            <div className="space-y-2">
              {balances.map((b) => <BalanceCard key={b.userId} balance={b} groupId={id} />)}
            </div>
          )}
        </div>

        {/* Settlement Suggestions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Handshake className="w-5 h-5 text-blue-500" /> Settlement Suggestions
          </h3>
          {settlements.length === 0 ? (
            <p className="text-green-500 text-sm font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> All settled!
            </p>
          ) : (
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{s.from}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-gray-800">{s.to}</span>
                    <span className="ml-auto font-bold text-yellow-700">₹{s.amount}</span>
                  </div>
                  <button 
                    onClick={() => handleRecordSettlement(s.fromId, s.toId, s.amount)}
                    className="w-full mt-1 bg-yellow-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-yellow-700 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Record as Paid
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-gray-500" /> Expenses
          </h3>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer">
            {showForm ? "Cancel" : "+ Add Expense"}
          </button>
        </div>

        {/* Add Expense Form */}
        {showForm && (
          <div className="bg-gray-50 rounded-xl p-5 mb-4 border border-gray-200 shadow-inner">
            {formError && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm mb-3">{formError}</div>}
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g. Pizza" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="800" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="INR" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Paid By</label>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required>
                  <option value="">Select user...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required />
              </div>
              <div className="md:col-span-2 mt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-medium text-gray-600">Participants & Shares</label>
                  <div className="flex bg-gray-200 rounded-lg p-1">
                    <button type="button" onClick={() => setSplitType("equal")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${splitType === "equal" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>Equal</button>
                    <button type="button" onClick={() => setSplitType("percentage")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${splitType === "percentage" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>Percentage</button>
                    <button type="button" onClick={() => setSplitType("exact")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${splitType === "exact" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>Exact</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-gray-200 rounded-lg p-3 bg-white max-h-48 overflow-y-auto">
                  {members.map((m) => {
                    const uid = m.user_id || m.id;
                    return (
                      <div key={uid} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {splitType === "equal" && (
                            <input type="checkbox"
                              checked={selectedForEqual[uid] !== false}
                              onChange={(e) => setSelectedForEqual({...selectedForEqual, [uid]: e.target.checked})}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-700 truncate">{m.name || `User #${uid}`}</span>
                        </div>
                        
                        {splitType === "exact" && (
                          <div className="flex items-center gap-1 w-24 shrink-0">
                            <span className="text-xs text-gray-500">₹</span>
                            <input type="number" min="0" step="0.01"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0"
                              value={participantShares[uid] || ""}
                              onChange={(e) => setParticipantShares({...participantShares, [uid]: e.target.value})}
                            />
                          </div>
                        )}
                        
                        {splitType === "percentage" && (
                          <div className="flex items-center gap-1 w-24 shrink-0">
                            <input type="number" min="0" max="100" step="1"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0"
                              value={participantShares[uid] || ""}
                              onChange={(e) => setParticipantShares({...participantShares, [uid]: e.target.value})}
                            />
                            <span className="text-xs text-gray-500">%</span>
                          </div>
                        )}
                        
                        {splitType === "equal" && (
                          <div className="text-sm text-gray-500 font-medium shrink-0">
                            ₹{(() => {
                              const selectedCount = members.filter(m => selectedForEqual[m.user_id || m.id] !== false).length;
                              if (selectedCount === 0 || !amount) return "0.00";
                              return (Number(amount) / selectedCount).toFixed(2);
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {members.length === 0 && <p className="text-xs text-gray-400">Add members to the group first</p>}
                </div>
              </div>
              <div className="md:col-span-2 mt-2">
                <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 cursor-pointer shadow-sm transition-colors">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        )}

        {expenses.length === 0 ? (
          <div className="text-center py-8">
             <ReceiptText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
             <p className="text-gray-400 text-sm">No expenses recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((exp) => <ExpenseCard key={exp.id} expense={exp} />)}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
