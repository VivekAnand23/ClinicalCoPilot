import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import UploadZone from '../components/UploadZone';
import { reportsAPI } from '../api/reports';
import { analysisAPI } from '../api/analysis';

export default function UploadReport() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [labName, setLabName] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a file');

    setError('');
    setLoading(true);

    try {
      const report = await reportsAPI.upload(file, labName, reportDate);
      // Start analysis and navigate to processing
      analysisAPI.run(report.id).catch(() => {}); // fire and forget
      navigate(`/processing/${report.id}`);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <Link to="/dashboard" className="text-lg font-bold text-blue-700">ClinicalCoPilot</Link>
      </nav>

      <main className="max-w-xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Blood Work Report</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg" role="alert">{error}</div>
          )}

          <UploadZone onFileSelect={setFile} disabled={loading} />

          <div>
            <label htmlFor="labName" className="block text-sm font-medium text-gray-700 mb-1">Lab Name (optional)</label>
            <input id="labName" type="text" value={labName} onChange={(e) => setLabName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., Quest Diagnostics" />
          </div>

          <div>
            <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700 mb-1">Report Date (optional)</label>
            <input id="reportDate" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <button type="submit" disabled={loading || !file}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? 'Uploading...' : 'Upload & Analyze'}
          </button>
        </form>
      </main>
    </div>
  );
}
