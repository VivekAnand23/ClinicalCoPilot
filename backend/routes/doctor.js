const express = require('express');
const { supabaseAdmin } = require('../db/supabaseClient');
const { authenticate, requireRole } = require('../middleware/authenticate');

const router = express.Router();

// All doctor routes require authentication and doctor role
router.use(authenticate, requireRole('doctor'));

// GET /api/doctor/patients
router.get('/patients', async (req, res) => {
  try {
    const { data: links, error } = await supabaseAdmin
      .from('doctor_patients')
      .select(`
        patient_id,
        linked_at,
        profiles:patient_id (id, email, full_name, date_of_birth, gender)
      `)
      .eq('doctor_id', req.user.id);

    if (error) throw error;

    // For each patient, get their most recent report's risk summary
    const patients = await Promise.all(
      (links || []).map(async (link) => {
        const { data: latestReport } = await supabaseAdmin
          .from('reports')
          .select(`
            id, status, report_date, created_at,
            risk_flags (disease_category, risk_level)
          `)
          .eq('user_id', link.patient_id)
          .eq('status', 'complete')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...link.profiles,
          linked_at: link.linked_at,
          latest_report: latestReport || null,
        };
      })
    );

    res.status(200).json({ success: true, data: patients });
  } catch (err) {
    console.error('List patients error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patients',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/doctor/patients/:patientId/reports
router.get('/patients/:patientId/reports', async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify doctor-patient link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('doctor_patients')
      .select('id')
      .eq('doctor_id', req.user.id)
      .eq('patient_id', patientId)
      .single();

    if (linkError || !link) {
      return res.status(403).json({
        success: false,
        error: 'You are not linked to this patient',
        code: 'FORBIDDEN',
      });
    }

    const { data: reports, error } = await supabaseAdmin
      .from('reports')
      .select(`
        *,
        lab_values (*),
        risk_flags (*),
        doctor_notes (*)
      `)
      .eq('user_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, data: reports });
  } catch (err) {
    console.error('Get patient reports error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient reports',
      code: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/doctor/notes
router.post('/notes', async (req, res) => {
  try {
    const { report_id, note_text, flag_override } = req.body;

    if (!report_id) {
      return res.status(400).json({
        success: false,
        error: 'report_id is required',
        code: 'VALIDATION_ERROR',
      });
    }

    // Verify doctor has access to this report's patient
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('user_id')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'NOT_FOUND',
      });
    }

    const { data: link } = await supabaseAdmin
      .from('doctor_patients')
      .select('id')
      .eq('doctor_id', req.user.id)
      .eq('patient_id', report.user_id)
      .single();

    if (!link) {
      return res.status(403).json({
        success: false,
        error: 'You are not linked to this patient',
        code: 'FORBIDDEN',
      });
    }

    const { data: note, error: noteError } = await supabaseAdmin
      .from('doctor_notes')
      .insert({
        report_id,
        doctor_id: req.user.id,
        note_text: note_text || null,
        flag_override: flag_override || null,
      })
      .select()
      .single();

    if (noteError) throw noteError;

    res.status(201).json({ success: true, data: note });
  } catch (err) {
    console.error('Create note error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create note',
      code: 'INTERNAL_ERROR',
    });
  }
});

// PATCH /api/doctor/notes/:noteId
router.patch('/notes/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { note_text, flag_override } = req.body;

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('doctor_notes')
      .select('id')
      .eq('id', noteId)
      .eq('doctor_id', req.user.id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
        code: 'NOT_FOUND',
      });
    }

    const updates = {};
    if (note_text !== undefined) updates.note_text = note_text;
    if (flag_override !== undefined) updates.flag_override = flag_override;

    const { data: note, error: updateError } = await supabaseAdmin
      .from('doctor_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json({ success: true, data: note });
  } catch (err) {
    console.error('Update note error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update note',
      code: 'INTERNAL_ERROR',
    });
  }
});

module.exports = router;
