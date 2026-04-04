import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../api/auth';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.getProfile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const dashboardLink = user?.role === 'doctor' ? '/doctor/dashboard' : '/dashboard';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <Link to={dashboardLink} className="text-lg font-bold text-blue-700">ClinicalCoPilot</Link>
      </nav>

      <main className="max-w-md mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : profile ? (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Name</label>
              <p className="text-gray-900">{profile.full_name || '—'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
              <p className="text-gray-900">{profile.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Role</label>
              <p className="text-gray-900 capitalize">{profile.role}</p>
            </div>
            {profile.date_of_birth && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Date of Birth</label>
                <p className="text-gray-900">{new Date(profile.date_of_birth).toLocaleDateString()}</p>
              </div>
            )}
            {profile.doctor_credentials && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Credentials</label>
                <p className="text-gray-900">{profile.doctor_credentials}</p>
              </div>
            )}
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-400">
                Account created: {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Could not load profile.</p>
        )}

        <div className="mt-6 space-y-3">
          <Link to={dashboardLink} className="block text-center text-sm text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="w-full border border-red-300 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 transition"
          >
            Log Out
          </button>
        </div>
      </main>
    </div>
  );
}
