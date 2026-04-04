import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { reportsAPI } from '../api/reports';

const STAGES = [
  { key: 'pending', label: 'Uploading...' },
  { key: 'extracting', label: 'Extracting text...' },
  { key: 'analyzing', label: 'Analyzing with AI...' },
  { key: 'complete', label: 'Complete' },
];

export default function Processing() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const report = await reportsAPI.get(reportId);
        if (cancelled) return;

        setStatus(report.status);

        if (report.status === 'complete') {
          setTimeout(() => navigate(`/results/${reportId}`), 1000);
          return;
        }

        if (report.status === 'failed') {
          setError('Analysis failed. Please try uploading again.');
          return;
        }

        // Poll every 3 seconds
        setTimeout(poll, 3000);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [reportId, navigate]);

  const currentStageIndex = STAGES.findIndex((s) => s.key === status);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <Link to="/dashboard" className="text-lg font-bold text-blue-700">ClinicalCoPilot</Link>
      </nav>

      <main className="max-w-md mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Processing Your Report</h2>

        {error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4" role="alert">
            <p>{error}</p>
            <Link to="/upload" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Try again</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {STAGES.map((stage, index) => {
              const isActive = index === currentStageIndex;
              const isDone = index < currentStageIndex;
              return (
                <div
                  key={stage.key}
                  className={`flex items-center gap-3 p-3 rounded-lg transition ${
                    isActive ? 'bg-blue-50 border border-blue-200' :
                    isDone ? 'bg-green-50 border border-green-200' :
                    'bg-gray-100 border border-gray-200'
                  }`}
                >
                  {isDone ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : isDone ? 'text-green-700' : 'text-gray-400'}`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
