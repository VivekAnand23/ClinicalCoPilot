-- ClinicalCoPilot Database Schema
-- Run this in your Supabase SQL editor

-- Users (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  doctor_credentials TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blood work reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'png', 'heic')),
  lab_name TEXT,
  report_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'extracting', 'analyzing', 'complete', 'failed')),
  raw_extracted_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual lab values extracted from reports
CREATE TABLE public.lab_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  biomarker_name TEXT NOT NULL,
  value NUMERIC,
  unit TEXT,
  reference_min NUMERIC,
  reference_max NUMERIC,
  status TEXT NOT NULL CHECK (status IN ('normal', 'borderline', 'abnormal')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disease risk flags per report
CREATE TABLE public.risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  disease_category TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('normal', 'borderline', 'high')),
  explanation TEXT NOT NULL,
  ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor <> patient relationships
CREATE TABLE public.doctor_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doctor_id, patient_id)
);

-- Doctor notes and flag overrides on reports
CREATE TABLE public.doctor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_text TEXT,
  flag_override TEXT CHECK (flag_override IN ('confirmed', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "users_own_profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Reports: patients can manage their own reports
CREATE POLICY "patients_own_reports" ON public.reports
  FOR ALL USING (auth.uid() = user_id);

-- Reports: doctors can view reports of linked patients
CREATE POLICY "doctors_see_patient_reports" ON public.reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.doctor_patients
      WHERE doctor_id = auth.uid() AND patient_id = reports.user_id
    )
  );

-- Lab values: accessible via report ownership
CREATE POLICY "lab_values_via_report" ON public.lab_values
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = lab_values.report_id AND reports.user_id = auth.uid()
    )
  );

-- Lab values: doctors can view via linked patients
CREATE POLICY "doctors_see_lab_values" ON public.lab_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports
      JOIN public.doctor_patients ON doctor_patients.patient_id = reports.user_id
      WHERE reports.id = lab_values.report_id AND doctor_patients.doctor_id = auth.uid()
    )
  );

-- Risk flags: accessible via report ownership
CREATE POLICY "risk_flags_via_report" ON public.risk_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = risk_flags.report_id AND reports.user_id = auth.uid()
    )
  );

-- Risk flags: doctors can view via linked patients
CREATE POLICY "doctors_see_risk_flags" ON public.risk_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports
      JOIN public.doctor_patients ON doctor_patients.patient_id = reports.user_id
      WHERE reports.id = risk_flags.report_id AND doctor_patients.doctor_id = auth.uid()
    )
  );

-- Doctor-patient links: both parties can see
CREATE POLICY "doctor_patients_visible" ON public.doctor_patients
  FOR SELECT USING (auth.uid() = doctor_id OR auth.uid() = patient_id);

-- Doctor-patient links: patients can create (share with doctor)
CREATE POLICY "patients_can_link_doctor" ON public.doctor_patients
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Doctor notes: doctors can manage their own notes
CREATE POLICY "doctors_own_notes" ON public.doctor_notes
  FOR ALL USING (auth.uid() = doctor_id);

-- Doctor notes: patients can view notes on their reports
CREATE POLICY "patients_see_notes" ON public.doctor_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = doctor_notes.report_id AND reports.user_id = auth.uid()
    )
  );

-- Create storage bucket for reports
-- Run this in Supabase dashboard or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);
