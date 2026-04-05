import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { doctorAPI } from '../api/doctor';
import RiskBadge from '../components/RiskBadge';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    doctorAPI.getPatients(filter)
      .then(setPatients)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getHighestRisk = (report) => {
    const flags = report?.risk_flags;
    if (!flags || flags.length === 0) return null;
    const levels = { high: 3, borderline: 2, normal: 1 };
    return flags.reduce((max, rf) => (levels[rf.risk_level] || 0) > (levels[max.risk_level] || 0) ? rf : max, flags[0]);
  };

  const totalUnread = patients.reduce((sum, p) => sum + (p.unread_count || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-700">ClinicalCoPilot — Doctor</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Dr. {user?.full_name || user?.email}</span>
          <Link to="/settings" className="text-sm text-gray-500 hover:text-gray-700">Settings</Link>
          <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header + filter toggle */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Patients</h2>
            {totalUnread > 0 && (
              <p className="text-sm text-blue-600 mt-0.5 font-medium">
                {totalUnread} unread report{totalUnread > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Active / All toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 text-sm font-medium transition ${
                filter === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium border-l border-gray-200 transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {!loading && patients.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">
              {filter === 'active'
                ? 'No active patients. Switch to "All" to see removed patients.'
                : 'No patients have shared reports with you yet.'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {patients.map((patient) => {
            const highest = patient.latest_report ? getHighestRisk(patient.latest_report) : null;
            const hasUnread = (patient.unread_count || 0) > 0;
            const isInactive = !patient.is_active;

            return (
              <Link
                key={patient.id}
                to={`/doctor/patient/${patient.id}`}
                className={`block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition border-l-4 ${
                  hasUnread ? 'border-l-blue-500' : isInactive ? 'border-l-gray-200 opacity-60' : 'border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-gray-900 ${hasUnread ? 'font-bold' : 'font-medium'}`}>
                        {patient.full_name || patient.email}
                      </p>
                      {hasUnread && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                          {patient.unread_count}
                        </span>
                      )}
                      {isInactive && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {patient.date_of_birth ? `DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}` : ''}
                      {patient.gender ? ` · ${patient.gender}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {highest && <RiskBadge level={highest.risk_level} />}
                    {patient.latest_report && (
                      <span className="text-xs text-gray-400">
                        {new Date(patient.latest_report.report_date || patient.latest_report.created_at).toLocaleDateString()}
                      </span>
                    )}
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
