import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
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
 *   biomarkers: Array<{ biomarker_name, unit, reference_min, reference_max, data_points: [{date, value, status}] }>
 */
export default function TrendChart({ biomarkers }) {
  const [active, setActive] = useState(() => {
    const initial = {};
    (biomarkers || []).forEach((b) => { initial[b.biomarker_name] = true; });
    return initial;
  });
  const [highlighted, setHighlighted] = useState(null);

  const selected = useMemo(
    () => (biomarkers || []).filter((b) => active[b.biomarker_name]),
    [biomarkers, active]
  );

  // Build unified date-keyed dataset
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

  if (!biomarkers || biomarkers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No trend data available yet.</p>
        <p className="text-sm mt-1">Upload more reports to see trends over time.</p>
      </div>
    );
  }

  // Only show reference lines when a single biomarker is selected (avoids clutter)
  const showRefLines = selected.length === 1 && selected[0];

  return (
    <div>
      {/* Biomarker toggles */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Biomarkers</p>
          <div className="flex gap-2">
            <button onClick={() => toggleAll(true)} className="text-xs text-blue-600 hover:underline">All</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => toggleAll(false)} className="text-xs text-blue-600 hover:underline">None</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(biomarkers || []).map((b, i) => {
            const color = LINE_COLORS[i % LINE_COLORS.length];
            const isOn = active[b.biomarker_name];
            return (
              <button
                key={b.biomarker_name}
                onClick={() => setActive((prev) => ({ ...prev, [b.biomarker_name]: !prev[b.biomarker_name] }))}
                onMouseEnter={() => setHighlighted(b.biomarker_name)}
                onMouseLeave={() => setHighlighted(null)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all
                  ${isOn ? 'border-transparent text-white' : 'border-gray-200 bg-white text-gray-400'}`}
                style={isOn ? { backgroundColor: color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isOn ? '#fff' : color }}
                />
                {b.biomarker_name}
                {b.unit ? ` (${b.unit})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Select at least one biomarker above.
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

            {selected.map((b, i) => {
              const color = LINE_COLORS[
                (biomarkers || []).findIndex((x) => x.biomarker_name === b.biomarker_name) % LINE_COLORS.length
              ];
              const isHighlighted = highlighted === b.biomarker_name;
              return (
                <Line
                  key={b.biomarker_name}
                  type="monotone"
                  dataKey={b.biomarker_name}
                  name={b.biomarker_name}
                  stroke={color}
                  strokeWidth={isHighlighted ? 3 : 1.5}
                  strokeOpacity={highlighted && !isHighlighted ? 0.25 : 1}
                  dot={(props) => <CustomDot {...props} dataKey={b.biomarker_name} />}
                  activeDot={{ r: 7 }}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Dots colored by status: <span className="text-green-600">normal</span> · <span className="text-yellow-600">borderline</span> · <span className="text-red-600">abnormal</span>.
        {showRefLines && ' Reference range lines shown for selected biomarker.'}
      </p>
    </div>
  );
}
