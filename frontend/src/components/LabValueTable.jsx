import RiskBadge from './RiskBadge';

export default function LabValueTable({ labValues }) {
  if (!labValues || labValues.length === 0) {
    return (
      <p className="text-gray-500 text-center py-4">No lab values found.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">Biomarker</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Unit</th>
            <th className="px-4 py-3">Reference Range</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {labValues.map((lv, index) => (
            <tr key={lv.id || index} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{lv.biomarker_name}</td>
              <td className="px-4 py-3">{lv.value != null ? lv.value : '—'}</td>
              <td className="px-4 py-3 text-gray-500">{lv.unit || '—'}</td>
              <td className="px-4 py-3 text-gray-500">
                {lv.reference_min != null && lv.reference_max != null
                  ? `${lv.reference_min} – ${lv.reference_max}`
                  : '—'}
              </td>
              <td className="px-4 py-3">
                <RiskBadge level={lv.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
