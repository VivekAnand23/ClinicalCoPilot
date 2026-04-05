import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doctorAPI } from '../api/doctor';
import LabValueTable from '../components/LabValueTable';
import RiskBadge from '../components/RiskBadge';
import Disclaimer from '../components/Disclaimer';
import TrendChart from '../components/TrendChart';

export default function PatientDetail() {
  const { patientId } = useParams();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [flagOverride, setFlagOverride] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteSuccess, setNoteSuccess] = useState(false);

  useEffect(() => {
    doctorAPI.getPatientReports(patientId)
      .then((data) => {
        setReports(data);
        if (data.length > 0) {
          setSelectedReport(data[0]);
          doctorAPI.markReportViewed(data[0].id).catch(() => {});
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  const handleAddNote = async () => {
    if (!selectedReport || !noteText.trim()) return;
    setNoteSuccess(false);

    try {
      await doctorAPI.createNote(selectedReport.id, noteText, flagOverride || undefined);
      setNoteSuccess(true);
      setNoteText('');
      setFlagOverride('');
      // Refresh reports
      const updated = await doctorAPI.getPatientReports(patientId);
      setReports(updated);
      setSelectedReport(updated.find((r) => r.id === selectedReport.id) || updated[0]);
    } catch (err) {
      setError(err.message);
    }
  };

  // Build trend data for a specific biomarker across reports
  const getBiomarkerTrend = (biomarkerName) => {
    return reports
      .filter((r) => r.status === 'complete' && r.lab_values)
      .map((r) => {
        const lv = r.lab_values.find((v) => v.biomarker_name === biomarkerName);
        return lv ? { date: r.report_date || r.created_at, value: lv.value } : null;
      })
      .filter(Boolean)
      .reverse();
  };

  // Get unique biomarkers across all reports
  const allBiomarkers = [...new Set(
    reports.flatMap((r) => (r.lab_values || []).map((lv) => lv.biomarker_name))
  )];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link to="/doctor/dashboard" className="text-lg font-bold text-blue-700">ClinicalCoPilot</Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-600">Patient Detail</span>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Disclaimer />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {/* Report Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setSelectedReport(r);
                doctorAPI.markReportViewed(r.id).catch(() => {});
              }}
              className={`text-sm px-3 py-1.5 rounded-lg border transition ${
                selectedReport?.id === r.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {r.report_date ? new Date(r.report_date).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()}
            </button>
          ))}
        </div>

        {selectedReport && (
          <>
            {/* Risk Flags */}
            {selectedReport.risk_flags?.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Risk Indicators</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {selectedReport.risk_flags.map((rf, index) => (
                    <div key={rf.id || index} className="bg-white rounded-xl shadow-sm p-4 border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{rf.disease_category}</h4>
                        <RiskBadge level={rf.risk_level} />
                      </div>
                      <p className="text-sm text-gray-600">{rf.explanation}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Lab Values */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Lab Values</h3>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <LabValueTable labValues={selectedReport.lab_values} />
              </div>
            </section>

            {/* Trend Charts (if multiple reports) */}
            {reports.length > 1 && allBiomarkers.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Trends</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {allBiomarkers.slice(0, 6).map((name) => {
                    const trend = getBiomarkerTrend(name);
                    if (trend.length < 2) return null;
                    const lv = selectedReport.lab_values?.find((v) => v.biomarker_name === name);
                    return (
                      <div key={name} className="bg-white rounded-xl shadow-sm p-4 border">
                        <TrendChart
                          data={trend}
                          biomarkerName={name}
                          unit={lv?.unit}
                          referenceMin={lv?.reference_min}
                          referenceMax={lv?.reference_max}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Doctor Notes */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Clinical Notes</h3>

              {selectedReport.doctor_notes?.length > 0 && (
                <div className="space-y-3 mb-4">
                  {selectedReport.doctor_notes.map((note) => (
                    <div key={note.id} className="bg-white rounded-lg p-3 border text-sm">
                      <p className="text-gray-700">{note.note_text}</p>
                      {note.flag_override && (
                        <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {note.flag_override}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Note */}
              <div className="bg-white rounded-xl shadow-sm p-4 border">
                {noteSuccess && <p className="text-green-600 text-sm mb-2">Note saved!</p>}
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                  placeholder="Add a clinical note..."
                />
                <div className="flex items-center gap-3">
                  <select
                    value={flagOverride}
                    onChange={(e) => setFlagOverride(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Flag Override (optional)</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
