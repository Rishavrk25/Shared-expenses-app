import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import MainLayout from "../layouts/MainLayout";

export default function ImportCSV() {
  const [file, setFile] = useState(null);
  const [groupId, setGroupId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (groupId) formData.append("groupId", groupId);
      const res = await API.post("/import", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">CSV Import</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Upload Expense CSV</h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group ID (optional)</label>
            <input type="number" value={groupId} onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="For advanced anomaly detection" />
          </div>
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
            {loading ? "Uploading..." : "📤 Upload CSV"}
          </button>
        </form>
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mt-4">{error}</div>}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl border border-green-200 p-6">
          <h3 className="font-semibold text-green-700 mb-4">✅ Import Complete</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{result.importJobId}</p>
              <p className="text-xs text-gray-500">Job ID</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{result.rowsProcessed}</p>
              <p className="text-xs text-gray-500">Rows Processed</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{result.anomaliesFound}</p>
              <p className="text-xs text-gray-500">Anomalies</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{result.status}</p>
              <p className="text-xs text-gray-500">Status</p>
            </div>
          </div>
          <button onClick={() => navigate(`/import/${result.importJobId}/report`)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 cursor-pointer">
            📊 View Full Report →
          </button>
        </div>
      )}
    </MainLayout>
  );
}
