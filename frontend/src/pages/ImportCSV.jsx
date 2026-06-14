import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Navbar from "../components/Navbar";

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
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-xl font-bold mb-4">Import CSV</h2>
        <form onSubmit={handleUpload} className="flex flex-col gap-3 mb-5">
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} className="border p-2 rounded text-sm" required />
          <input type="number" placeholder="Group ID (optional)" value={groupId} onChange={(e) => setGroupId(e.target.value)} className="border p-2 rounded text-sm" />
          <button type="submit" disabled={loading} className="bg-blue-500 text-white p-2 rounded cursor-pointer">{loading ? "Uploading..." : "Upload CSV"}</button>
        </form>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="font-semibold mb-2">Import Summary</h3>
            <p className="text-sm"><strong>Job ID:</strong> {result.importJobId}</p>
            <p className="text-sm"><strong>Status:</strong> {result.status}</p>
            <p className="text-sm"><strong>Rows Processed:</strong> {result.rowsProcessed}</p>
            <p className="text-sm"><strong>Anomalies Found:</strong> {result.anomaliesFound}</p>
            <button onClick={() => navigate(`/import/${result.importJobId}/report`)} className="bg-blue-500 text-white px-4 py-2 rounded text-sm mt-3 cursor-pointer">View Full Report →</button>
          </div>
        )}
      </div>
    </>
  );
}
