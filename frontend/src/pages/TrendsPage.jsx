import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportsAPI } from '../api/reports';
import TrendChart from '../components/TrendChart';

export default function TrendsPage() {
  const [biomarkers, setBiomarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsAPI.trends()
      .then(setBiomarkers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="text-lg font-bold text-blue-700">ClinicalCoPilot</Link>
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Back to Dashboard</Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Biomarker Trends</h2>
          <p className="text-sm text-gray-500 mt-1">
            Historical values across all your reports. Toggle biomarkers on/off to focus on specific ones.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <TrendChart biomarkers={biomarkers} />
          </div>
        )}

        {!loading && !error && biomarkers.length > 0 && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            Showing data from {biomarkers.reduce((sum, b) => Math.max(sum, b.data_points.length), 0)} report(s) ·{' '}
            {biomarkers.length} biomarker(s) tracked
          </p>
        )}
      </main>
    </div>
  );
}
