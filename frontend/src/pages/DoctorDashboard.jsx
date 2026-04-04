import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { doctorAPI } from '../api/doctor';
import RiskBadge from '../components/RiskBadge';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    doctorAPI.getPatients()
      .then(setPatients)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Patients</h2>

        {loading && <p className="text-gray-500">Loading patients...</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {!loading && patients.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">No patients have shared reports with you yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {patients.map((patient) => {
            const highest = patient.latest_report ? getHighestRisk(patient.latest_report) : null;
            return (
              <Link
                key={patient.id}
                to={`/doctor/patient/${patient.id}`}
                className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{patient.full_name || patient.email}</p>
                    <p className="text-sm text-gray-500">
                      {patient.date_of_birth ? `DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}` : ''}{' '}
                      {patient.gender ? `• ${patient.gender}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {highest && <RiskBadge level={highest.risk_level} />}
                    {patient.latest_report && (
                      <span className="text-xs text-gray-400">
                        Last: {new Date(patient.latest_report.created_at).toLocaleDateString()}
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
