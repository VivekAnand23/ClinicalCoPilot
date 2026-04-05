import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';

const LINE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
];

const STATUS_DOT_COLOR = {
  normal: '#10b981',
  borderline: '#f59e0b',
  abnormal: '#ef4444',
};

// Stable color assignment keyed by original index (before sorting/filtering)
function useColorMap(biomarkers) {
  return useMemo(() => {
    const map = {};
    (biomarkers || []).forEach((b, i) => {
      map[b.biomarker_name] = LINE_COLORS[i % LINE_COLORS.length];
    });
    return map;
  }, [biomarkers]);
}

function CustomDot({ cx, cy, payload, dataKey }) {
  const status = payload[`${dataKey}_status`];
  const color = STATUS_DOT_COLOR[status] || '#3b82f6';
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => {
        const status = entry.payload[`${entry.dataKey}_status`];
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-0.5">
            <span style={{ color: entry.color }} className="font-medium">{entry.name}:</span>
            <span className="text-gray-800">{entry.value}</span>
            {status && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium
                ${status === 'normal' ? 'bg-green-100 text-green-700' :
                  status === 'borderline' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'}`}>
                {status}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Interactive multi-biomarker trend chart.
 * Props:
 *   biomarkers: Array<{ biomarker_name, unit, reference_min, reference_max, has_concern, data_points }>
 *   showConcernSummary: boolean — show amber callout for doctor view
 */
export default function TrendChart({ biomarkers, showConcernSummary = false }) {
  const [active, setActive] = useState(() => {
    const initial = {};
    (biomarkers || []).forEach((b) => { initial[b.biomarker_name] = true; });
    return initial;
  });
  const [highlighted, setHighlighted] = useState(null);
  const [search, setSearch] = useState('');

  const colorMap = useColorMap(biomarkers);

  // Sorted alphabetically; concerns visually distinguished but not reordered
  const sortedBiomarkers = useMemo(
    () => [...(biomarkers || [])].sort((a, b) => a.biomarker_name.localeCompare(b.biomarker_name)),
    [biomarkers]
  );

  const filteredBiomarkers = useMemo(
    () => sortedBiomarkers.filter((b) =>
      b.biomarker_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.unit || '').toLowerCase().includes(search.toLowerCase())
    ),
    [sortedBiomarkers, search]
  );

  const selected = useMemo(
    () => (biomarkers || []).filter((b) => active[b.biomarker_name]),
    [biomarkers, active]
  );

  const chartData = useMemo(() => {
    const dateMap = {};
    for (const b of selected) {
      for (const pt of b.data_points) {
        const label = new Date(pt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
        if (!dateMap[label]) dateMap[label] = { date: label };
        dateMap[label][b.biomarker_name] = pt.value;
        dateMap[label][`${b.biomarker_name}_status`] = pt.status;
      }
    }
    return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selected]);

  const toggleAll = (val) => {
    const next = {};
    (biomarkers || []).forEach((b) => { next[b.biomarker_name] = val; });
    setActive(next);
  };

  const toggleFiltered = (val) => {
    const next = { ...active };
    filteredBiomarkers.forEach((b) => { next[b.biomarker_name] = val; });
    setActive(next);
  };

  const concernedBiomarkers = useMemo(
    () => (biomarkers || []).filter((b) => b.has_concern),
    [biomarkers]
  );

  const showRefLines = selected.length === 1 && selected[0];

  if (!biomarkers || biomarkers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No trend data available yet.</p>
        <p className="text-sm mt-1">Upload more reports to see trends over time.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Concern summary callout */}
      {showConcernSummary && concernedBiomarkers.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {concernedBiomarkers.length} biomarker{concernedBiomarkers.length > 1 ? 's' : ''} require attention
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                {concernedBiomarkers.map((b) => b.biomarker_name).join(', ')} — borderline, abnormal, or worsening trend.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Biomarker table — left panel */}
        <div className="lg:w-60 flex-shrink-0">
          {/* Search */}
          <div className="relative mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search biomarkers..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          {/* All / None controls */}
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              {filteredBiomarkers.length} biomarker{filteredBiomarkers.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button onClick={() => toggleFiltered(true)} className="text-[10px] text-blue-600 hover:underline">All</button>
              <span className="text-gray-300 text-[10px]">|</span>
              <button onClick={() => toggleFiltered(false)} className="text-[10px] text-blue-600 hover:underline">None</button>
            </div>
          </div>

          {/* Scrollable table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-2 py-1.5 text-gray-500 font-medium w-6"></th>
                    <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Biomarker</th>
                    <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBiomarkers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-gray-400">No matches</td>
                    </tr>
                  )}
                  {filteredBiomarkers.map((b) => {
                    const isOn = active[b.biomarker_name];
                    const color = colorMap[b.biomarker_name];
                    const isHovered = highlighted === b.biomarker_name;
                    return (
                      <tr
                        key={b.biomarker_name}
                        onClick={() => setActive((prev) => ({ ...prev, [b.biomarker_name]: !prev[b.biomarker_name] }))}
                        onMouseEnter={() => setHighlighted(b.biomarker_name)}
                        onMouseLeave={() => setHighlighted(null)}
                        className={`cursor-pointer border-t border-gray-100 transition-colors
                          ${b.has_concern ? 'bg-amber-50 hover:bg-amber-100' : isHovered ? 'bg-blue-50' : 'hover:bg-gray-50'}
                          ${!isOn ? 'opacity-40' : ''}`}
                      >
                        {/* Color swatch / checkbox */}
                        <td className="px-2 py-2">
                          <span
                            className="block w-3 h-3 rounded-sm border"
                            style={{
                              backgroundColor: isOn ? color : 'transparent',
                              borderColor: color,
                            }}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <span className={`${b.has_concern ? 'text-amber-800 font-medium' : 'text-gray-700'}`}>
                              {b.biomarker_name}
                            </span>
                            {b.has_concern && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-amber-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-gray-400">{b.unit || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 mt-1.5 px-0.5">Click a row to toggle. Hover to highlight.</p>
        </div>

        {/* Chart — right panel */}
        <div className="flex-1 min-w-0">
          {selected.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Select at least one biomarker from the list.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#d1d5db" />
                <YAxis tick={{ fontSize: 11 }} stroke="#d1d5db" width={40} />
                <Tooltip content={<CustomTooltip />} />

                {showRefLines && (
                  <>
                    {showRefLines.reference_min != null && (
                      <ReferenceLine
                        y={showRefLines.reference_min}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        label={{ value: `Min ${showRefLines.reference_min}`, fontSize: 10, fill: '#f59e0b' }}
                      />
                    )}
                    {showRefLines.reference_max != null && (
                      <ReferenceLine
                        y={showRefLines.reference_max}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        label={{ value: `Max ${showRefLines.reference_max}`, fontSize: 10, fill: '#f59e0b' }}
                      />
                    )}
                  </>
                )}

                {selected.map((b) => {
                  const color = colorMap[b.biomarker_name];
                  const isHighlighted = highlighted === b.biomarker_name;
                  return (
                    <Line
                      key={b.biomarker_name}
                      type="monotone"
                      dataKey={b.biomarker_name}
                      name={b.biomarker_name}
                      stroke={color}
                      strokeWidth={isHighlighted ? 3 : 1.5}
                      strokeOpacity={highlighted && !isHighlighted ? 0.2 : 1}
                      dot={(props) => <CustomDot {...props} dataKey={b.biomarker_name} />}
                      activeDot={{ r: 7 }}
                      connectNulls={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}

          <p className="text-xs text-gray-400 mt-1">
            Dots: <span className="text-green-600">normal</span> · <span className="text-yellow-600">borderline</span> · <span className="text-red-600">abnormal</span>.
            {showRefLines ? ' Reference range shown for single selected biomarker.' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
