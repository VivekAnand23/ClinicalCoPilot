const express = require('express');
const multer = require('multer');
const { supabaseAdmin } = require('../db/supabaseClient');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

// Multer config — memory storage for processing before upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
});

const ALLOWED_MIME_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images

// Multer error handler wrapper
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds the 20MB limit',
          code: 'FILE_TOO_LARGE',
        });
      }
      return res.status(400).json({
        success: false,
        error: 'File upload error',
        code: 'VALIDATION_ERROR',
      });
    }
    next();
  });
}

// POST /api/reports/upload
router.post('/upload', authenticate, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
        code: 'VALIDATION_ERROR',
      });
    }

    const mimeType = req.file.mimetype;
    const fileType = ALLOWED_MIME_TYPES[mimeType];

    if (!fileType) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file type. Allowed: PDF, JPG, PNG, HEIC',
        code: 'INVALID_FILE_TYPE',
      });
    }

    if (fileType !== 'pdf' && req.file.size > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        success: false,
        error: 'Image files must be under 10MB',
        code: 'FILE_TOO_LARGE',
      });
    }

    // Create report record
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .insert({
        user_id: req.user.id,
        file_url: '', // Will update after upload
        file_type: fileType,
        lab_name: req.body.lab_name || null,
        report_date: req.body.report_date || null,
        status: 'pending',
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // Upload to Supabase Storage
    const filePath = `${req.user.id}/${report.id}/${req.file.originalname}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('reports')
      .upload(filePath, req.file.buffer, {
        contentType: mimeType,
      });

    if (uploadError) throw uploadError;

    // Update report with file URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('reports')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabaseAdmin
      .from('reports')
      .update({ file_url: filePath })
      .eq('id', report.id);

    if (updateError) throw updateError;

    res.status(201).json({
      success: true,
      data: { ...report, file_url: filePath },
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({
      success: false,
      error: 'File upload failed. Please try again.',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/reports/doctors — list all doctors linked to the current patient
router.get('/doctors', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('doctor_patients')
      .select('id, linked_at, is_active, removed_at, profiles:doctor_id (id, email, full_name, doctor_credentials)')
      .eq('patient_id', req.user.id)
      .order('linked_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, data: data || [] });
  } catch (err) {
    console.error('List doctors error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch doctors', code: 'INTERNAL_ERROR' });
  }
});

// DELETE /api/reports/doctors/:doctorId — remove a doctor's access (soft deactivate)
router.delete('/doctors/:doctorId', authenticate, async (req, res) => {
  try {
    const { data: link, error: fetchError } = await supabaseAdmin
      .from('doctor_patients')
      .select('id')
      .eq('patient_id', req.user.id)
      .eq('doctor_id', req.params.doctorId)
      .eq('is_active', true)
      .single();

    if (fetchError || !link) {
      return res.status(404).json({ success: false, error: 'Doctor link not found', code: 'NOT_FOUND' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('doctor_patients')
      .update({ is_active: false, removed_at: new Date().toISOString() })
      .eq('id', link.id);

    if (updateError) throw updateError;

    res.status(200).json({ success: true, data: { message: 'Doctor access removed' } });
  } catch (err) {
    console.error('Remove doctor error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to remove doctor', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/reports/trends
router.get('/trends', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('lab_values')
      .select('biomarker_name, value, unit, reference_min, reference_max, status, reports!inner(user_id, report_date, created_at, id)')
      .eq('reports.user_id', req.user.id)
      .not('value', 'is', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by biomarker
    const grouped = {};
    for (const row of data || []) {
      const name = row.biomarker_name;
      if (!grouped[name]) {
        grouped[name] = {
          biomarker_name: name,
          unit: row.unit,
          reference_min: row.reference_min,
          reference_max: row.reference_max,
          data_points: [],
        };
      }
      grouped[name].data_points.push({
        value: parseFloat(row.value),
        status: row.status,
        date: row.reports.report_date || row.reports.created_at,
        report_id: row.reports.id,
      });
    }

    // Sort data points by date within each biomarker
    for (const name of Object.keys(grouped)) {
      grouped[name].data_points.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    res.status(200).json({ success: true, data: Object.values(grouped) });
  } catch (err) {
    console.error('Trends error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trend data',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/reports
router.get('/', authenticate, async (req, res) => {
  try {
    const { data: reports, error } = await supabaseAdmin
      .from('reports')
      .select(`
        *,
        risk_flags (disease_category, risk_level)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, data: reports });
  } catch (err) {
    console.error('List reports error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/reports/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .select(`
        *,
        lab_values (*),
        risk_flags (*),
        doctor_notes (*)
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'NOT_FOUND',
      });
    }

    res.status(200).json({ success: true, data: report });
  } catch (err) {
    console.error('Get report error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report',
      code: 'INTERNAL_ERROR',
    });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Verify ownership
    const { data: report, error: fetchError } = await supabaseAdmin
      .from('reports')
      .select('id, file_url, user_id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'NOT_FOUND',
      });
    }

    // Delete file from storage
    if (report.file_url) {
      await supabaseAdmin.storage.from('reports').remove([report.file_url]);
    }

    // Delete report (cascades to lab_values, risk_flags, doctor_notes)
    const { error: deleteError } = await supabaseAdmin
      .from('reports')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    res.status(200).json({ success: true, data: { message: 'Report deleted' } });
  } catch (err) {
    console.error('Delete report error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report',
      code: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/reports/:id/share
router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const { doctor_email } = req.body;
    if (!doctor_email) {
      return res.status(400).json({
        success: false,
        error: 'Doctor email is required',
        code: 'VALIDATION_ERROR',
      });
    }

    // Verify report ownership
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (reportError || !report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'NOT_FOUND',
      });
    }

    // Find doctor by email
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', doctor_email)
      .eq('role', 'doctor')
      .single();

    if (doctorError || !doctor) {
      return res.status(404).json({
        success: false,
        error: 'No doctor found with that email',
        code: 'NOT_FOUND',
      });
    }

    // Create doctor-patient link (upsert to avoid duplicates)
    const { error: linkError } = await supabaseAdmin
      .from('doctor_patients')
      .upsert(
        { doctor_id: doctor.id, patient_id: req.user.id },
        { onConflict: 'doctor_id,patient_id' }
      );

    if (linkError) throw linkError;

    res.status(200).json({
      success: true,
      data: { message: 'Report shared with doctor successfully' },
    });
  } catch (err) {
    console.error('Share report error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to share report',
      code: 'INTERNAL_ERROR',
    });
  }
});

module.exports = router;
