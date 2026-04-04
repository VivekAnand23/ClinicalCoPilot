import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

export default function TrendChart({ data, biomarkerName, unit, referenceMin, referenceMax }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-sm">No trend data available.</p>;
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString(),
    value: d.value,
  }));

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        {biomarkerName} {unit ? `(${unit})` : ''}
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value) => [value, biomarkerName]}
          />
          {referenceMin != null && (
            <ReferenceLine y={referenceMin} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Min', fontSize: 10 }} />
          )}
          {referenceMax != null && (
            <ReferenceLine y={referenceMax} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Max', fontSize: 10 }} />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
