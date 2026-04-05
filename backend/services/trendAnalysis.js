const { supabaseAdmin } = require('../db/supabaseClient');
const { REFERENCE_RANGES } = require('./referenceRanges');

// Biomarkers where increasing value moves toward risk
const HIGHER_IS_WORSE = new Set([
  'HbA1c', 'Fasting Glucose', 'Insulin',
  'Creatinine', 'BUN', 'Uric Acid',
  'ALT', 'AST', 'GGT', 'Bilirubin',
  'LDL', 'Triglycerides', 'Total Cholesterol', 'hsCRP',
]);

// Biomarkers where decreasing value moves toward risk
const LOWER_IS_WORSE = new Set([
  'eGFR', 'Albumin',
  'Hemoglobin', 'Hematocrit', 'RBC', 'Ferritin',
  'HDL',
  'Vitamin D', 'Vitamin B12', 'Folate', 'Iron', 'Zinc',
]);

/**
 * Fetch all historical lab values for a user, grouped by biomarker.
 * Excludes the current report. Returns values sorted oldest → newest.
 */
async function getHistoricalValues(userId, currentReportId) {
  const { data, error } = await supabaseAdmin
    .from('lab_values')
    .select('biomarker_name, value, created_at, report_id, reports!inner(user_id, report_date, created_at)')
    .eq('reports.user_id', userId)
    .neq('report_id', currentReportId)
    .not('value', 'is', null)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Group by biomarker
  const grouped = {};
  for (const row of data || []) {
    const name = row.biomarker_name;
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push({
      value: parseFloat(row.value),
      date: row.reports.report_date || row.created_at,
    });
  }
  return grouped;
}

/**
 * Check if a sequence of values is consistently moving in one direction.
 * Requires at least 2 points. Returns 'increasing', 'decreasing', or null.
 */
function detectTrendDirection(values) {
  if (values.length < 2) return null;
  let increases = 0;
  let decreases = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) increases++;
    else if (values[i] < values[i - 1]) decreases++;
  }
  const steps = values.length - 1;
  // Consistent if all steps go the same direction
  if (increases === steps) return 'increasing';
  if (decreases === steps) return 'decreasing';
  // Or majority (≥75%) direction for 3+ points
  if (steps >= 3 && increases / steps >= 0.75) return 'increasing';
  if (steps >= 3 && decreases / steps >= 0.75) return 'decreasing';
  return null;
}

/**
 * Determine if a trend direction is moving toward the bad zone for a biomarker.
 */
function isTrendingTowardRisk(biomarkerName, direction) {
  if (HIGHER_IS_WORSE.has(biomarkerName) && direction === 'increasing') return true;
  if (LOWER_IS_WORSE.has(biomarkerName) && direction === 'decreasing') return true;
  return false;
}

/**
 * Estimate how many more steps at current rate before hitting the threshold.
 */
function stepsToThreshold(values, direction, ref) {
  const last = values[values.length - 1];
  const secondLast = values[values.length - 2];
  const avgStep = Math.abs(last - secondLast);
  if (avgStep === 0) return null;

  const threshold = direction === 'increasing' ? ref.max : ref.min;
  const gap = Math.abs(threshold - last);
  return Math.ceil(gap / avgStep);
}

/**
 * Analyze trends across all biomarkers for a user given the current report's lab values.
 * Returns an array of trend-based risk flag objects.
 */
async function detectTrendRisks(userId, currentReportId, currentLabValues) {
  const historical = await getHistoricalValues(userId, currentReportId);
  const trendFlags = [];

  for (const current of currentLabValues) {
    const name = current.biomarker_name;
    const ref = REFERENCE_RANGES[name];
    if (!ref || current.value === null) continue;

    // Build full series: historical + current
    const past = historical[name] || [];
    const series = [...past.map((p) => p.value), current.value];

    if (series.length < 3) continue; // Need at least 3 data points for a meaningful trend

    const direction = detectTrendDirection(series);
    if (!direction) continue;
    if (!isTrendingTowardRisk(name, direction)) continue;

    const currentStatus = current.status;
    // Only flag if current value isn't already flagged as abnormal (avoid duplicate flags)
    if (currentStatus === 'abnormal') continue;

    const steps = stepsToThreshold(series, direction, ref);
    const dirWord = direction === 'increasing' ? 'rising' : 'falling';
    const thresholdLabel = direction === 'increasing' ? `upper limit (${ref.max} ${ref.unit})` : `lower limit (${ref.min} ${ref.unit})`;
    const stepsMsg = steps !== null && steps <= 5
      ? ` At this rate, it could cross the ${thresholdLabel} within ${steps} more test(s).`
      : ` Monitor closely — it is approaching the ${thresholdLabel}.`;

    const riskLevel = currentStatus === 'borderline' ? 'high' : 'borderline';
    const disease = ref.category || 'General Health';

    trendFlags.push({
      disease_category: `${disease} (Trend)`,
      risk_level: riskLevel,
      explanation: `${name} has been consistently ${dirWord} across your last ${series.length} reports (current: ${current.value} ${ref.unit}).${stepsMsg} This pattern may indicate increasing risk for ${disease}. Consult your physician.`,
      ai_confidence: series.length >= 4 ? 'high' : 'medium',
      is_trend_flag: true,
    });
  }

  return trendFlags;
}

module.exports = { detectTrendRisks };
