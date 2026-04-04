const RISK_CONFIG = {
  normal: {
    classes: 'bg-green-100 text-green-800 border-green-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    label: 'Normal',
  },
  borderline: {
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    label: 'Borderline',
  },
  high: {
    classes: 'bg-red-100 text-red-800 border-red-200',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
    label: 'High',
  },
  abnormal: {
    classes: 'bg-red-100 text-red-800 border-red-200',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
    label: 'Abnormal',
  },
};

export default function RiskBadge({ level }) {
  const config = RISK_CONFIG[level] || RISK_CONFIG.normal;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.classes}`}
      role="status"
      aria-label={`Risk level: ${config.label}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
