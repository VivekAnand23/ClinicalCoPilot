const express = require('express');
const { supabaseAdmin } = require('../db/supabaseClient');
const { authenticate, requireRole } = require('../middleware/authenticate');

const router = express.Router();

// All doctor routes require authentication and doctor role
router.use(authenticate, requireRole('doctor'));

// GET /api/doctor/patients?filter=active|all
router.get('/patients', async (req, res) => {
  try {
    const filterActive = req.query.filter !== 'all';

    let query = supabaseAdmin
      .from('doctor_patients')
      .select(`
        patient_id,
        linked_at,
        is_active,
        removed_at,
        profiles:patient_id (id, email, full_name, date_of_birth, gender)
      `)
      .eq('doctor_id', req.user.id);

    if (filterActive) query = query.eq('is_active', true);

    const { data: links, error } = await query;
    if (error) throw error;

    // For each patient, get latest report + unread count
    const patients = await Promise.all(
      (links || []).map(async (link) => {
        // For inactive links, only consider reports before removal
        let reportQuery = supabaseAdmin
          .from('reports')
          .select('id, status, report_date, created_at, risk_flags (disease_category, risk_level)')
          .eq('user_id', link.patient_id)
          .eq('status', 'complete')
          .order('report_date', { ascending: false, nullsFirst: false });

        if (!link.is_active && link.removed_at) {
          reportQuery = reportQuery.lte('created_at', link.removed_at);
        }

        const { data: allReports } = await reportQuery;
        const latestReport = allReports?.[0] || null;

        // Count unread: reports with no view record from this doctor
        let unreadCount = 0;
        if (allReports && allReports.length > 0) {
          const reportIds = allReports.map((r) => r.id);
          const { data: views } = await supabaseAdmin
            .from('doctor_report_views')
            .select('report_id')
            .eq('doctor_id', req.user.id)
            .in('report_id', reportIds);

          const viewedIds = new Set((views || []).map((v) => v.report_id));
          unreadCount = reportIds.filter((id) => !viewedIds.has(id)).length;
        }

        return {
          ...link.profiles,
          linked_at: link.linked_at,
          is_active: link.is_active,
          removed_at: link.removed_at,
          latest_report: latestReport,
          unread_count: unreadCount,
        };
      })
    );

    // Sort by latest report date descending, patients without reports last
    patients.sort((a, b) => {
      const dateA = a.latest_report?.report_date || a.latest_report?.created_at || a.linked_at;
      const dateB = b.latest_report?.report_date || b.latest_report?.created_at || b.linked_at;
      return new Date(dateB) - new Date(dateA);
    });

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

    // Verify doctor-patient link (active or inactive — doctor can still view old reports)
    const { data: link, error: linkError } = await supabaseAdmin
      .from('doctor_patients')
      .select('id, is_active, removed_at')
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

    let reportQuery = supabaseAdmin
      .from('reports')
      .select('*, lab_values (*), risk_flags (*), doctor_notes (*)')
      .eq('user_id', patientId)
      .order('report_date', { ascending: false, nullsFirst: false });

    // If link is inactive, only show reports uploaded before removal
    if (!link.is_active && link.removed_at) {
      reportQuery = reportQuery.lte('created_at', link.removed_at);
    }

    const { data: reports, error } = await reportQuery;
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

// POST /api/doctor/reports/:reportId/view — mark a report as viewed
router.post('/reports/:reportId/view', async (req, res) => {
  try {
    const { reportId } = req.params;

    // Verify the doctor has access to this report's patient
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('user_id')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return res.status(404).json({ success: false, error: 'Report not found', code: 'NOT_FOUND' });
    }

    const { data: link } = await supabaseAdmin
      .from('doctor_patients')
      .select('id')
      .eq('doctor_id', req.user.id)
      .eq('patient_id', report.user_id)
      .single();

    if (!link) {
      return res.status(403).json({ success: false, error: 'Access denied', code: 'FORBIDDEN' });
    }

    // Upsert view record
    await supabaseAdmin
      .from('doctor_report_views')
      .upsert({ doctor_id: req.user.id, report_id: reportId, viewed_at: new Date().toISOString() }, { onConflict: 'doctor_id,report_id' });

    res.status(200).json({ success: true, data: { viewed: true } });
  } catch (err) {
    console.error('Mark viewed error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to mark report as viewed', code: 'INTERNAL_ERROR' });
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
