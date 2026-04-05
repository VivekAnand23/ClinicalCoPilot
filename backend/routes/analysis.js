const express = require('express');
const { supabaseAdmin } = require('../db/supabaseClient');
const { authenticate } = require('../middleware/authenticate');
const { extractText } = require('../services/extractText');
const { analyzeBloodWork } = require('../services/claudeAnalysis');
const { parseAnalysisResponse } = require('../services/parseAnalysis');
const { detectTrendRisks } = require('../services/trendAnalysis');

const router = express.Router();

// POST /api/analysis/:reportId/run
router.post('/:reportId/run', authenticate, async (req, res) => {
  const { reportId } = req.params;

  try {
    // Fetch report and verify ownership
    const { data: report, error: fetchError } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'NOT_FOUND',
      });
    }

    if (report.status === 'complete') {
      return res.status(400).json({
        success: false,
        error: 'Report has already been analyzed',
        code: 'ALREADY_ANALYZED',
      });
    }

    // Update status to extracting
    await supabaseAdmin
      .from('reports')
      .update({ status: 'extracting' })
      .eq('id', reportId);

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('reports')
      .download(report.file_url);

    if (downloadError) throw downloadError;

    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

    // Extract text
    let extractedText;
    try {
      extractedText = await extractText(fileBuffer, report.file_type);
    } catch (extractErr) {
      await supabaseAdmin
        .from('reports')
        .update({ status: 'failed' })
        .eq('id', reportId);

      return res.status(400).json({
        success: false,
        error: 'Could not extract text from the uploaded file',
        code: 'EXTRACTION_FAILED',
      });
    }

    // Save raw extracted text
    await supabaseAdmin
      .from('reports')
      .update({ status: 'analyzing', raw_extracted_text: extractedText })
      .eq('id', reportId);

    // Run Claude analysis
    let rawAnalysis;
    try {
      rawAnalysis = await analyzeBloodWork(extractedText);
    } catch (analysisErr) {
      await supabaseAdmin
        .from('reports')
        .update({ status: 'failed' })
        .eq('id', reportId);

      return res.status(500).json({
        success: false,
        error: 'AI analysis failed. Please try again later.',
        code: 'ANALYSIS_FAILED',
      });
    }

    // Parse and normalize results
    const analysis = parseAnalysisResponse(rawAnalysis);

    if (analysis.requires_manual_review) {
      await supabaseAdmin
        .from('reports')
        .update({ status: 'failed' })
        .eq('id', reportId);

      return res.status(200).json({
        success: true,
        data: {
          status: 'manual_review',
          message: 'AI response could not be parsed automatically. Manual review required.',
          raw_extracted_text: extractedText,
        },
      });
    }

    // Save lab values
    if (analysis.lab_values.length > 0) {
      const labValueRows = analysis.lab_values.map((lv) => ({
        report_id: reportId,
        biomarker_name: lv.biomarker_name,
        value: lv.value,
        unit: lv.unit,
        reference_min: lv.reference_min,
        reference_max: lv.reference_max,
        status: lv.status,
      }));

      const { error: labError } = await supabaseAdmin
        .from('lab_values')
        .insert(labValueRows);

      if (labError) throw labError;
    }

    // Save risk flags
    if (analysis.risk_flags.length > 0) {
      const riskFlagRows = analysis.risk_flags.map((rf) => ({
        report_id: reportId,
        disease_category: rf.disease_category,
        risk_level: rf.risk_level,
        explanation: rf.explanation,
        ai_confidence: rf.ai_confidence,
      }));

      const { error: riskError } = await supabaseAdmin
        .from('risk_flags')
        .insert(riskFlagRows);

      if (riskError) throw riskError;
    }

    // Detect trends across historical reports and add trend-based risk flags
    let trendFlags = [];
    try {
      trendFlags = await detectTrendRisks(req.user.id, reportId, analysis.lab_values);

      if (trendFlags.length > 0) {
        const trendFlagRows = trendFlags.map((tf) => ({
          report_id: reportId,
          disease_category: tf.disease_category,
          risk_level: tf.risk_level,
          explanation: tf.explanation,
          ai_confidence: tf.ai_confidence,
        }));

        const { error: trendError } = await supabaseAdmin
          .from('risk_flags')
          .insert(trendFlagRows);

        if (trendError) throw trendError;
      }
    } catch (trendErr) {
      // Non-fatal: log and continue without trend flags
      console.error('Trend analysis error:', trendErr.message);
    }

    // Update report status to complete
    await supabaseAdmin
      .from('reports')
      .update({ status: 'complete' })
      .eq('id', reportId);

    res.status(200).json({
      success: true,
      data: {
        status: 'complete',
        lab_values: analysis.lab_values,
        risk_flags: [...analysis.risk_flags, ...trendFlags],
        extraction_notes: analysis.extraction_notes,
      },
    });
  } catch (err) {
    console.error('Analysis error:', err.message);

    await supabaseAdmin
      .from('reports')
      .update({ status: 'failed' })
      .eq('id', reportId)
      .catch(() => {});

    res.status(500).json({
      success: false,
      error: 'Analysis failed. Please try again.',
      code: 'ANALYSIS_FAILED',
    });
  }
});

// GET /api/analysis/:reportId
router.get('/:reportId', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;

    // Verify ownership or doctor access
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('id, status, user_id')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'NOT_FOUND',
      });
    }

    // Check access: owner or linked doctor
    if (report.user_id !== req.user.id) {
      if (req.user.role === 'doctor') {
        const { data: link } = await supabaseAdmin
          .from('doctor_patients')
          .select('id')
          .eq('doctor_id', req.user.id)
          .eq('patient_id', report.user_id)
          .single();

        if (!link) {
          return res.status(403).json({
            success: false,
            error: 'You do not have access to this report',
            code: 'FORBIDDEN',
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this report',
          code: 'FORBIDDEN',
        });
      }
    }

    const { data: labValues } = await supabaseAdmin
      .from('lab_values')
      .select('*')
      .eq('report_id', reportId);

    const { data: riskFlags } = await supabaseAdmin
      .from('risk_flags')
      .select('*')
      .eq('report_id', reportId);

    res.status(200).json({
      success: true,
      data: {
        status: report.status,
        lab_values: labValues || [],
        risk_flags: riskFlags || [],
      },
    });
  } catch (err) {
    console.error('Get analysis error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis results',
      code: 'INTERNAL_ERROR',
    });
  }
});

module.exports = router;
