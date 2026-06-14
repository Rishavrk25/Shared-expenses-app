import { useState } from "react";
import API from "../services/api";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

export default function BalanceCard({ balance, groupId }) {
  const [expanded, setExpanded] = useState(false);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const isPositive = balance.balance >= 0;

  const toggleBreakdown = async () => {
    if (!expanded && !breakdown && groupId) {
      setLoading(true);
      try {
        const res = await API.get(`/groups/${groupId}/balances/${balance.userId}`);
        setBreakdown(res.data.breakdown);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className={`flex flex-col bg-white rounded-lg border-l-4 shadow-sm transition-all ${isPositive ? "border-l-green-500" : "border-l-red-500"} ${expanded ? "ring-1 ring-gray-200" : ""}`}>
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={toggleBreakdown}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${isPositive ? "bg-green-500" : "bg-red-500"}`}>
            {balance.user?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 flex items-center gap-1">
              {balance.user}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? "+" : ""}₹{balance.balance}
          </span>
          {groupId && (
            <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
               {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>
      
      {expanded && groupId && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50 text-sm">
          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Info className="w-4 h-4 text-blue-500" /> Balance Calculation
          </h4>
          {loading ? (
            <div className="py-4 text-center"><LoadingSpinner /></div>
          ) : breakdown?.length === 0 ? (
            <p className="text-gray-500 italic py-2 text-center">No transactions</p>
          ) : (
            <div className="space-y-2">
              {breakdown?.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-gray-600">
                  <span className="truncate pr-2">{item.expense}</span>
                  <span className={`font-medium whitespace-nowrap ${item.amount > 0 ? "text-green-600" : item.amount < 0 ? "text-red-600" : ""}`}>
                    {item.amount > 0 ? "+" : ""}₹{item.amount}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 font-bold text-gray-800">
                <span>Total</span>
                <span className={isPositive ? "text-green-600" : "text-red-600"}>{isPositive ? "+" : ""}₹{balance.balance}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
