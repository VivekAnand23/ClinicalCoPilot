// Standard adult clinical reference ranges
// Used for validation and fallback when Claude doesn't provide ranges

const REFERENCE_RANGES = {
  // Diabetes markers
  'HbA1c': { min: 4.0, max: 5.6, unit: '%', category: 'Type 2 Diabetes' },
  'Fasting Glucose': { min: 70, max: 99, unit: 'mg/dL', category: 'Type 2 Diabetes' },
  'Insulin': { min: 2.6, max: 24.9, unit: 'uIU/mL', category: 'Type 2 Diabetes' },

  // Kidney function
  'Creatinine': { min: 0.7, max: 1.3, unit: 'mg/dL', category: 'Chronic Kidney Disease' },
  'eGFR': { min: 90, max: 120, unit: 'mL/min/1.73m2', category: 'Chronic Kidney Disease' },
  'BUN': { min: 7, max: 20, unit: 'mg/dL', category: 'Chronic Kidney Disease' },
  'Uric Acid': { min: 3.5, max: 7.2, unit: 'mg/dL', category: 'Chronic Kidney Disease' },

  // Liver function
  'ALT': { min: 7, max: 56, unit: 'U/L', category: 'Liver Disease' },
  'AST': { min: 10, max: 40, unit: 'U/L', category: 'Liver Disease' },
  'GGT': { min: 9, max: 48, unit: 'U/L', category: 'Liver Disease' },
  'Bilirubin': { min: 0.1, max: 1.2, unit: 'mg/dL', category: 'Liver Disease' },
  'Albumin': { min: 3.5, max: 5.5, unit: 'g/dL', category: 'Liver Disease' },

  // Anemia markers
  'Hemoglobin': { min: 12.0, max: 17.5, unit: 'g/dL', category: 'Anemia' },
  'Hematocrit': { min: 36, max: 51, unit: '%', category: 'Anemia' },
  'RBC': { min: 4.0, max: 5.9, unit: 'M/uL', category: 'Anemia' },
  'Ferritin': { min: 12, max: 300, unit: 'ng/mL', category: 'Anemia' },

  // Thyroid
  'TSH': { min: 0.4, max: 4.0, unit: 'mIU/L', category: 'Thyroid Disorders' },
  'Free T3': { min: 2.3, max: 4.1, unit: 'pg/mL', category: 'Thyroid Disorders' },
  'Free T4': { min: 0.8, max: 1.8, unit: 'ng/dL', category: 'Thyroid Disorders' },

  // Cardiovascular
  'LDL': { min: 0, max: 100, unit: 'mg/dL', category: 'Cardiovascular Risk' },
  'HDL': { min: 40, max: 60, unit: 'mg/dL', category: 'Cardiovascular Risk' },
  'Triglycerides': { min: 0, max: 150, unit: 'mg/dL', category: 'Cardiovascular Risk' },
  'Total Cholesterol': { min: 0, max: 200, unit: 'mg/dL', category: 'Cardiovascular Risk' },
  'hsCRP': { min: 0, max: 3.0, unit: 'mg/L', category: 'Cardiovascular Risk' },

  // Vitamins & Minerals
  'Vitamin D': { min: 30, max: 100, unit: 'ng/mL', category: 'Vitamin Deficiencies' },
  'Vitamin B12': { min: 200, max: 900, unit: 'pg/mL', category: 'Vitamin Deficiencies' },
  'Folate': { min: 2.7, max: 17.0, unit: 'ng/mL', category: 'Vitamin Deficiencies' },
  'Iron': { min: 60, max: 170, unit: 'ug/dL', category: 'Vitamin Deficiencies' },
  'Zinc': { min: 60, max: 120, unit: 'ug/dL', category: 'Vitamin Deficiencies' },
};

function getStatus(biomarkerName, value) {
  const range = REFERENCE_RANGES[biomarkerName];
  if (!range || value === null || value === undefined) return 'normal';

  if (value < range.min || value > range.max) {
    // Check if it's borderline (within 10% of boundary)
    const lowerBorder = range.min - (range.max - range.min) * 0.1;
    const upperBorder = range.max + (range.max - range.min) * 0.1;

    if (value >= lowerBorder && value < range.min) return 'borderline';
    if (value > range.max && value <= upperBorder) return 'borderline';
    return 'abnormal';
  }
  return 'normal';
}

function getReferenceRange(biomarkerName) {
  return REFERENCE_RANGES[biomarkerName] || null;
}

module.exports = { REFERENCE_RANGES, getStatus, getReferenceRange };
