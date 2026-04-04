const { getStatus, getReferenceRange } = require('./referenceRanges');

function parseAnalysisResponse(rawResponse) {
  try {
    // Strip any markdown code fences if present
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    return normalizeAnalysis(parsed);
  } catch (err) {
    return {
      success: false,
      error: 'Failed to parse AI response',
      raw_response: rawResponse,
      lab_values: [],
      risk_flags: [],
      requires_manual_review: true,
    };
  }
}

function normalizeAnalysis(parsed) {
  const labValues = (parsed.lab_values || []).map((lv) => {
    const ref = getReferenceRange(lv.biomarker_name);
    return {
      biomarker_name: lv.biomarker_name,
      value: parseFloat(lv.value) || null,
      unit: lv.unit || ref?.unit || '',
      reference_min: lv.reference_min ?? ref?.min ?? null,
      reference_max: lv.reference_max ?? ref?.max ?? null,
      status: validateStatus(lv.status) || (lv.value != null ? getStatus(lv.biomarker_name, lv.value) : 'normal'),
    };
  });

  const riskFlags = (parsed.risk_flags || []).map((rf) => ({
    disease_category: rf.disease_category,
    risk_level: validateRiskLevel(rf.risk_level) || 'normal',
    explanation: rf.explanation || '',
    ai_confidence: validateConfidence(rf.ai_confidence) || 'medium',
  }));

  return {
    success: true,
    lab_values: labValues,
    risk_flags: riskFlags,
    extraction_notes: parsed.extraction_notes || '',
    disclaimer: parsed.disclaimer || '',
    requires_manual_review: false,
  };
}

function validateStatus(status) {
  const valid = ['normal', 'borderline', 'abnormal'];
  return valid.includes(status) ? status : null;
}

function validateRiskLevel(level) {
  const valid = ['normal', 'borderline', 'high'];
  return valid.includes(level) ? level : null;
}

function validateConfidence(confidence) {
  const valid = ['high', 'medium', 'low'];
  return valid.includes(confidence) ? confidence : null;
}

module.exports = { parseAnalysisResponse, normalizeAnalysis };
