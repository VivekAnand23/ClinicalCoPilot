import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { reportsAPI } from '../api/reports';
import RiskBadge from '../components/RiskBadge';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsAPI.list()
      .then((data) => setReports(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const getHighestRisk = (riskFlags) => {
    if (!riskFlags || riskFlags.length === 0) return null;
    const levels = { high: 3, borderline: 2, normal: 1 };
    return riskFlags.reduce((max, rf) => (levels[rf.risk_level] || 0) > (levels[max.risk_level] || 0) ? rf : max, riskFlags[0]);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-700">ClinicalCoPilot</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.full_name || user?.email}</span>
          <Link to="/settings" className="text-sm text-gray-500 hover:text-gray-700">Settings</Link>
          <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Reports</h2>
          <Link to="/upload" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            Upload Report
          </Link>
        </div>

        {loading && <p className="text-gray-500">Loading reports...</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {!loading && reports.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500 mb-4">No reports yet. Upload your first blood work report to get started.</p>
            <Link to="/upload" className="text-blue-600 font-medium hover:underline">Upload now</Link>
          </div>
        )}

        <div className="space-y-3">
          {reports.map((report) => {
            const highest = getHighestRisk(report.risk_flags);
            return (
              <Link
                key={report.id}
                to={report.status === 'complete' ? `/results/${report.id}` : `/processing/${report.id}`}
                className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {report.lab_name || 'Blood Work Report'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {report.report_date ? new Date(report.report_date).toLocaleDateString() : new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {report.status === 'complete' && highest && (
                      <RiskBadge level={highest.risk_level} />
                    )}
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      report.status === 'complete' ? 'bg-green-100 text-green-700' :
                      report.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
