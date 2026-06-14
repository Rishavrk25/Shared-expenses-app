import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import MainLayout from "../layouts/MainLayout";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ImportReport() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const [repRes, detRes] = await Promise.all([
          API.get(`/import/${id}/report`),
          API.get(`/import/${id}/report/details`),
        ]);
        setReport(repRes.data);
        setDetails(detRes.data.anomalies || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const severityBadge = (severity) => {
    const styles = {
      ERROR: "bg-red-100 text-red-700",
      WARNING: "bg-yellow-100 text-yellow-700",
      INFO: "bg-blue-100 text-blue-700",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[severity] || "bg-gray-100 text-gray-700"}`}>
        {severity}
      </span>
    );
  };

  if (loading) return <MainLayout><LoadingSpinner /></MainLayout>;

  return (
    <MainLayout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Import Report #{id}</h2>

      {report && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <p className="text-sm text-gray-500">📁 <strong>{report.fileName}</strong></p>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              report.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>{report.status}</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-blue-600">{report.totalRows}</p>
              <p className="text-xs text-gray-500 mt-1">Total Rows</p>
            </div>
            <div className="bg-green-50 rounded-xl p-5 text-center border-2 border-green-200">
              <p className="text-3xl font-bold text-green-600">{report.successfulRows}</p>
              <p className="text-xs text-gray-500 mt-1">Successful</p>
            </div>
            <div className="bg-red-50 rounded-xl p-5 text-center border-2 border-red-200">
              <p className="text-3xl font-bold text-red-600">{report.failedRows}</p>
              <p className="text-xs text-gray-500 mt-1">Failed</p>
            </div>
          </div>

          {/* Anomaly Counts */}
          {report.anomalies && Object.keys(report.anomalies).length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Anomaly Summary</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.anomalies).map(([type, count]) => (
                  <span key={type} className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-medium">
                    {type}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Anomaly Details Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Anomaly Details</h3>
        {details.length === 0 ? (
          <p className="text-green-500 text-sm font-medium">✅ No anomalies found — clean import!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Row</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Anomaly Type</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Severity</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Description</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Action Taken</th>
                </tr>
              </thead>
              <tbody>
                {details.map((a, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono">{a.row}</td>
                    <td className="py-3 px-3 font-medium">{a.type}</td>
                    <td className="py-3 px-3">{severityBadge(a.severity)}</td>
                    <td className="py-3 px-3 text-gray-600">{a.description}</td>
                    <td className="py-3 px-3 text-gray-500">{a.actionTaken || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
