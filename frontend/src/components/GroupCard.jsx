import { Link } from "react-router-dom";

export default function GroupCard({ group }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">
          {group.name?.charAt(0).toUpperCase()}
        </div>
        <h3 className="font-semibold text-gray-800">{group.name}</h3>
      </div>
      <Link to={`/groups/${group.id}`} className="text-blue-500 text-sm font-medium hover:underline">
        View Details →
      </Link>
    </div>
  );
}
