import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsAPI } from '../api/reports';
import LabValueTable from '../components/LabValueTable';
import RiskBadge from '../components/RiskBadge';
import Disclaimer from '../components/Disclaimer';

export default function Results() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsAPI.get(reportId)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="text-lg font-bold text-blue-700">ClinicalCoPilot</Link>
        <div className="flex gap-3">
          <Link to="/trends" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            View Trends
          </Link>
          <Link to={`/share/${reportId}`} className="text-sm text-blue-600 hover:underline">Share with Doctor</Link>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Back</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Disclaimer />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
            <p className="text-sm text-gray-500 mt-1">
              {report?.lab_name || 'Blood Work Report'} — {report?.report_date ? new Date(report.report_date).toLocaleDateString() : new Date(report?.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Risk Flags */}
        {report?.risk_flags && report.risk_flags.length > 0 && (
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Risk Indicators</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {report.risk_flags.map((rf, index) => (
                <div key={rf.id || index} className="bg-white rounded-xl shadow-sm p-4 border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{rf.disease_category}</h4>
                    <RiskBadge level={rf.risk_level} />
                  </div>
                  <p className="text-sm text-gray-600">{rf.explanation}</p>
                  {rf.ai_confidence && (
                    <p className="text-xs text-gray-400 mt-2">AI Confidence: {rf.ai_confidence}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lab Values */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Lab Values</h3>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <LabValueTable labValues={report?.lab_values} />
          </div>
        </section>

        {/* Doctor Notes */}
        {report?.doctor_notes && report.doctor_notes.length > 0 && (
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Doctor Notes</h3>
            <div className="space-y-3">
              {report.doctor_notes.map((note) => (
                <div key={note.id} className="bg-white rounded-xl shadow-sm p-4 border">
                  <p className="text-sm text-gray-700">{note.note_text}</p>
                  {note.flag_override && (
                    <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {note.flag_override}
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
