export default function Disclaimer() {
  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 my-4" role="alert">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h3 className="font-semibold text-yellow-800 text-sm">Medical Disclaimer</h3>
          <p className="text-yellow-700 text-sm mt-1 leading-relaxed">
            ClinicalCoPilot is not a medical device and does not provide medical diagnosis.
            All AI-generated analysis is for informational purposes only. Risk indicators
            are based on standard clinical reference ranges and may not account for
            individual health history, medications, or other factors. Always consult a
            qualified physician before making any health decisions. The developers of
            ClinicalCoPilot are not liable for any actions taken based on information
            provided by this application.
          </p>
        </div>
      </div>
    </div>
  );
}
