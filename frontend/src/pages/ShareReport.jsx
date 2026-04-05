import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsAPI } from '../api/reports';

export default function ShareReport() {
  const { reportId } = useParams();
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorEmail, setDoctorEmail] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const loadDoctors = () =>
    reportsAPI.getDoctors()
      .then(setDoctors)
      .catch(() => {})
      .finally(() => setLoadingDoctors(false));

  useEffect(() => { loadDoctors(); }, []);

  const handleShare = async (e) => {
    e.preventDefault();
    setShareError('');
    setShareSuccess(false);
    setSharing(true);
    try {
      await reportsAPI.share(reportId, doctorEmail);
      setShareSuccess(true);
      setDoctorEmail('');
      loadDoctors();
    } catch (err) {
      setShareError(err.message || 'Failed to share report.');
    } finally {
      setSharing(false);
    }
  };

  const handleRemove = async (doctorId) => {
    setRemovingId(doctorId);
    try {
      await reportsAPI.removeDoctor(doctorId);
      setDoctors((prev) =>
        prev.map((d) =>
          d.profiles.id === doctorId ? { ...d, is_active: false, removed_at: new Date().toISOString() } : d
        )
      );
    } catch (err) {
      alert(err.message || 'Failed to remove doctor.');
    } finally {
      setRemovingId(null);
    }
  };

  const activeDoctors = doctors.filter((d) => d.is_active);
  const inactiveDoctors = doctors.filter((d) => !d.is_active);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="text-lg font-bold text-blue-700">ClinicalCoPilot</Link>
        <Link to={`/results/${reportId}`} className="text-sm text-gray-500 hover:text-gray-700">Back to Results</Link>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Share with Doctor</h2>
          <p className="text-sm text-gray-500 mt-1">
            Doctors you share with can view all your current and future reports.
          </p>
        </div>

        {/* Active doctors */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Active Access {activeDoctors.length > 0 && `(${activeDoctors.length})`}
          </h3>
          {loadingDoctors ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            </div>
          ) : activeDoctors.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">No doctors have access yet.</p>
          ) : (
            <div className="space-y-2">
              {activeDoctors.map((d) => (
                <div key={d.profiles.id} className="bg-white rounded-xl border px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {d.profiles.full_name || d.profiles.email}
                    </p>
                    {d.profiles.full_name && (
                      <p className="text-xs text-gray-500">{d.profiles.email}</p>
                    )}
                    {d.profiles.doctor_credentials && (
                      <p className="text-xs text-gray-400">{d.profiles.doctor_credentials}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Shared {new Date(d.linked_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(d.profiles.id)}
                    disabled={removingId === d.profiles.id}
                    className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg transition disabled:opacity-40"
                  >
                    {removingId === d.profiles.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Inactive doctors */}
        {inactiveDoctors.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Removed ({inactiveDoctors.length})
            </h3>
            <div className="space-y-2">
              {inactiveDoctors.map((d) => (
                <div key={d.profiles.id} className="bg-gray-50 rounded-xl border border-dashed px-4 py-3 flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-sm text-gray-600">{d.profiles.full_name || d.profiles.email}</p>
                    <p className="text-xs text-gray-400">
                      Access removed {new Date(d.removed_at).toLocaleDateString()} · Can view reports before that date
                    </p>
                  </div>
                  <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add new doctor */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Add a Doctor</h3>
          <form onSubmit={handleShare} className="bg-white rounded-xl shadow-sm p-5 space-y-4 border">
            {shareError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg" role="alert">{shareError}</div>
            )}
            {shareSuccess && (
              <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg">Doctor added successfully!</div>
            )}
            <div>
              <label htmlFor="doctorEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Doctor's Email
              </label>
              <input
                id="doctorEmail"
                type="email"
                required
                value={doctorEmail}
                onChange={(e) => setDoctorEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="doctor@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={sharing}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {sharing ? 'Sharing...' : 'Share with Doctor'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
