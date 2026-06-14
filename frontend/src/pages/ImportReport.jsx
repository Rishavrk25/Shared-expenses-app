import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import Navbar from "../components/Navbar";

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

  if (loading) return <><Navbar /><div className="max-w-4xl mx-auto p-6">Loading...</div></>;

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-xl font-bold mb-4">Import Report #{id}</h2>

        {report && (
          <div className="bg-gray-50 border rounded-lg p-5 mb-5">
            <p className="text-sm mb-1"><strong>File:</strong> {report.fileName}</p>
            <p className="text-sm mb-3"><strong>Status:</strong> {report.status}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border rounded p-4 text-center">
                <span className="text-2xl font-bold text-blue-500 block">{report.totalRows}</span>
                <span className="text-xs text-gray-500">Total Rows</span>
              </div>
              <div className="bg-white border-2 border-green-300 rounded p-4 text-center">
                <span className="text-2xl font-bold text-green-500 block">{report.successfulRows}</span>
                <span className="text-xs text-gray-500">Successful</span>
              </div>
              <div className="bg-white border-2 border-red-300 rounded p-4 text-center">
                <span className="text-2xl font-bold text-red-500 block">{report.failedRows}</span>
                <span className="text-xs text-gray-500">Failed</span>
              </div>
            </div>

            {report.anomalies && Object.keys(report.anomalies).length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Anomaly Counts</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(report.anomalies).map(([type, count]) => (
                    <span key={type} className="bg-white border rounded px-3 py-1 text-xs"><strong>{type}</strong>: {count}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <h3 className="font-semibold mb-2">Anomaly Details</h3>
        {details.length === 0 ? <p className="text-gray-400 text-sm">No anomalies found.</p> : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border-b-2">Row</th>
                <th className="text-left p-2 border-b-2">Anomaly</th>
                <th className="text-left p-2 border-b-2">Severity</th>
                <th className="text-left p-2 border-b-2">Description</th>
                <th className="text-left p-2 border-b-2">Action Taken</th>
              </tr>
            </thead>
            <tbody>
              {details.map((a, i) => (
                <tr key={i}>
                  <td className="p-2 border-b">{a.row}</td>
                  <td className="p-2 border-b">{a.type}</td>
                  <td className={`p-2 border-b font-bold ${a.severity === "ERROR" ? "text-red-500" : a.severity === "WARNING" ? "text-yellow-500" : "text-blue-500"}`}>{a.severity}</td>
                  <td className="p-2 border-b">{a.description}</td>
                  <td className="p-2 border-b">{a.actionTaken || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
