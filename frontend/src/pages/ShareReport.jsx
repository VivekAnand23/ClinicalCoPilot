import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsAPI } from '../api/reports';

export default function ShareReport() {
  const { reportId } = useParams();
  const [doctorEmail, setDoctorEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await reportsAPI.share(reportId, doctorEmail);
      setSuccess(true);
      setDoctorEmail('');
    } catch (err) {
      setError(err.message || 'Failed to share report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <Link to="/dashboard" className="text-lg font-bold text-blue-700">ClinicalCoPilot</Link>
      </nav>

      <main className="max-w-md mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Report</h2>
        <p className="text-sm text-gray-500 mb-6">
          Enter your doctor's email to give them access to this report and all future reports.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg" role="alert">{error}</div>}
          {success && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg">Report shared successfully!</div>}

          <div>
            <label htmlFor="doctorEmail" className="block text-sm font-medium text-gray-700 mb-1">Doctor's Email</label>
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

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? 'Sharing...' : 'Share Report'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to={`/results/${reportId}`} className="text-sm text-blue-600 hover:underline">Back to Results</Link>
        </div>
      </main>
    </div>
  );
}
