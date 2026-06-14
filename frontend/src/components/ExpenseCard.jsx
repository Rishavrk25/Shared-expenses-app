export default function ExpenseCard({ expense }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-gray-800">{expense.title}</h4>
          <p className="text-xs text-gray-500 mt-1">
            Paid by {expense.paid_by_name || "—"} · {expense.expense_date?.substring(0, 10)}
          </p>
        </div>
        <span className="text-lg font-bold text-gray-800">₹{expense.amount}</span>
      </div>
    </div>
  );
}
