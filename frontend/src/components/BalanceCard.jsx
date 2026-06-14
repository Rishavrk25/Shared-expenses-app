export default function BalanceCard({ balance }) {
  const isPositive = balance.balance >= 0;
  return (
    <div className={`flex items-center justify-between p-4 bg-white rounded-lg border-l-4 ${isPositive ? "border-l-green-500" : "border-l-red-500"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${isPositive ? "bg-green-500" : "bg-red-500"}`}>
          {balance.user?.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-gray-800">{balance.user}</span>
      </div>
      <span className={`text-lg font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {isPositive ? "+" : ""}₹{balance.balance}
      </span>
    </div>
  );
}
