# ClinicalCoPilot — CLAUDE.md

> This file is the authoritative guide for Claude Code when building, testing, and maintaining ClinicalCoPilot.
> Read this file fully before writing any code. Re-read relevant sections before making changes.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Application Name** | ClinicalCoPilot |
| **Type** | Full-stack web application |
| **Purpose** | AI-powered blood work analysis and chronic disease risk detection |
| **Primary Users** | Patients and Doctors |
| **AI Engine** | Claude API (`claude-sonnet-4-20250514`) |
| **PRD Version** | 1.0 — April 2026 |

---

## 2. Tech Stack — Non-Negotiable

Use **only** the technologies listed below. Do not introduce alternative frameworks, ORMs, UI libraries, or services without explicit user approval.

### Frontend
- **React 18** with **Vite** as the build tool
- **TailwindCSS** for all styling — no CSS-in-JS, no styled-components
- **Recharts** for all data visualizations and trend charts
- **React Router v6** for client-side routing

### Backend
- **Node.js** runtime
- **Express.js** REST API — no GraphQL, no tRPC
- **Multer** for multipart file upload handling
- **pdf-parse** (npm) for PDF text extraction
- **Tesseract.js** (npm) for image OCR
- **jsonwebtoken** for JWT signing and verification
- **bcrypt** (min 12 rounds) for password hashing

### Database & Auth & Storage
- **Supabase** for everything: PostgreSQL database, Auth, and file Storage
- Use the **Supabase JS client** (`@supabase/supabase-js`) — no raw `pg` driver
- Row-level security (RLS) **must be enabled** on every table

### AI
- **Anthropic Claude API** — model: `claude-sonnet-4-20250514`
- All Claude API calls happen **server-side only** — never from the frontend
- Use the official `@anthropic-ai/sdk` npm package

### Testing
- **Vitest** for unit and integration tests
- **Playwright** for end-to-end tests
- Minimum 80% test coverage on all utility functions and API routes

### Deployment
- **Vercel** for hosting (frontend + backend as serverless functions)
- **GitHub** for version control — one branch per feature, merge to `main` for deployment

---

## 3. Repository Structure

Scaffold the project exactly as shown. Do not deviate from this structure.

```
clinicalcopilot/
├── CLAUDE.md                  <- this file
├── PRD.docx                   <- product requirements document
├── README.md
├── .env.example               <- template with all required env var names (no values)
├── .gitignore
│
├── frontend/                  <- React + Vite app
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/        <- reusable UI components
│   │   │   ├── RiskBadge.jsx
│   │   │   ├── LabValueTable.jsx
│   │   │   ├── TrendChart.jsx
│   │   │   ├── Disclaimer.jsx
│   │   │   └── UploadZone.jsx
│   │   ├── pages/             <- one file per route
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── PatientDashboard.jsx
│   │   │   ├── UploadReport.jsx
│   │   │   ├── Processing.jsx
│   │   │   ├── Results.jsx
│   │   │   ├── ShareReport.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   ├── PatientDetail.jsx
│   │   │   └── Settings.jsx
│   │   ├── hooks/             <- custom React hooks
│   │   ├── utils/             <- pure helper functions
│   │   └── api/               <- fetch wrappers for backend calls
│   └── tests/
│       ├── unit/
│       └── e2e/               <- Playwright tests
│
├── backend/                   <- Node.js + Express API
│   ├── server.js              <- entry point
│   ├── routes/
│   │   ├── auth.js
│   │   ├── reports.js
│   │   ├── analysis.js
│   │   └── doctor.js
│   ├── middleware/
│   │   ├── authenticate.js    <- JWT verification middleware
│   │   └── validate.js        <- request body validation
│   ├── services/
│   │   ├── extractText.js     <- pdf-parse + Tesseract.js
│   │   ├── claudeAnalysis.js  <- Claude API calls
│   │   ├── parseAnalysis.js   <- JSON response parsing + normalization
│   │   └── referenceRanges.js <- clinical reference range definitions
│   ├── db/
│   │   ├── supabaseClient.js  <- Supabase client singleton
│   │   └── schema.sql         <- full database schema with RLS policies
│   └── tests/
│       ├── unit/
│       └── integration/
│
└── package.json               <- root scripts for running both frontend and backend
```

---

## 4. Database Schema

Create all tables in Supabase with this exact schema. Include RLS policies as shown.

```sql
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

-- Patients can only see their own data
CREATE POLICY "patients_own_reports" ON public.reports
  FOR ALL USING (auth.uid() = user_id);

-- Doctors can see reports of their linked patients
CREATE POLICY "doctors_see_patient_reports" ON public.reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.doctor_patients
      WHERE doctor_id = auth.uid() AND patient_id = reports.user_id
    )
  );
```

---

## 5. Environment Variables

Never hardcode secrets. All secrets come from environment variables. Create a `.env.example` with these exact keys (no values):

```
# Claude AI
ANTHROPIC_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
JWT_SECRET=

# App
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

**Rules:**
- `ANTHROPIC_API_KEY` is **never** sent to the frontend under any circumstances
- `SUPABASE_SERVICE_ROLE_KEY` is **never** sent to the frontend under any circumstances
- Use `process.env.VARIABLE_NAME` — never use a hardcoded fallback for secrets

---

## 6. Claude API Integration

### Model
Always use: `claude-sonnet-4-20250514`

### Service file: `backend/services/claudeAnalysis.js`

Structure the Claude API call exactly like this:

```javascript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  system: MEDICAL_SYSTEM_PROMPT,
  messages: [
    {
      role: 'user',
      content: `Analyze this blood work report:\n\n${extractedText}`
    }
  ]
});
```

### System Prompt (MEDICAL_SYSTEM_PROMPT constant)

Store this as a constant in `claudeAnalysis.js`:

```
You are a medical data extraction assistant for ClinicalCoPilot.

Your task is to analyze blood work report text and extract all lab values and identify chronic disease risk indicators.

CRITICAL RULES:
1. Return ONLY valid JSON — no preamble, no markdown, no explanation outside the JSON
2. Never invent lab values that are not clearly present in the text
3. Use standard adult clinical reference ranges unless age/gender context is provided
4. Risk levels must be exactly one of: "normal", "borderline", or "high"
5. AI confidence must be exactly one of: "high", "medium", or "low"

RESPONSE FORMAT (strict JSON):
{
  "lab_values": [
    {
      "biomarker_name": "HbA1c",
      "value": 6.2,
      "unit": "%",
      "reference_min": 4.0,
      "reference_max": 5.6,
      "status": "borderline"
    }
  ],
  "risk_flags": [
    {
      "disease_category": "Type 2 Diabetes",
      "risk_level": "borderline",
      "explanation": "HbA1c of 6.2% is in the pre-diabetic range (5.7-6.4%). This warrants monitoring and lifestyle changes. Consult your physician.",
      "ai_confidence": "high",
      "contributing_biomarkers": ["HbA1c"]
    }
  ],
  "extraction_notes": "Note any values that were unclear or could not be extracted",
  "disclaimer": "This analysis is generated by AI and is not a medical diagnosis. Always consult a qualified physician before making any health decisions."
}

CHRONIC DISEASE CATEGORIES TO CHECK:
- Type 2 Diabetes: HbA1c, Fasting Glucose, Insulin
- Chronic Kidney Disease (CKD): Creatinine, eGFR, BUN, Uric Acid
- Liver Disease: ALT, AST, GGT, Bilirubin, Albumin
- Anemia: Hemoglobin, Hematocrit, RBC, Ferritin, B12
- Thyroid Disorders: TSH, Free T3, Free T4
- Cardiovascular Risk: LDL, HDL, Triglycerides, Total Cholesterol, hsCRP
- Vitamin Deficiencies: Vitamin D, B12, Folate, Iron, Zinc

Only include a risk_flag entry if there is actual evidence in the blood work. Do not flag diseases where no relevant biomarkers are present in the report.
```

### Error Handling for Claude API
- Wrap every Claude API call in try/catch
- On timeout: retry up to 3 times with a 2-second delay between retries
- On JSON parse failure: return the raw extracted text to the user with a "Manual review required" flag
- Never expose the raw Claude error message to the frontend — log it server-side, return a generic message

---

## 7. File Processing Rules

### PDF Processing (`backend/services/extractText.js`)
```javascript
const pdfParse = require('pdf-parse');
const data = await pdfParse(fileBuffer);
const text = data.text;
```

### Image OCR (`backend/services/extractText.js`)
```javascript
const Tesseract = require('tesseract.js');
const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng');
```

### File Size Limits
- PDF: max 20MB
- Images (JPG, PNG, HEIC): max 10MB
- Validate file type and size **before** uploading to Supabase Storage

### Storage Path Convention
```
Supabase Storage bucket: reports
Path pattern: {user_id}/{report_id}/{original_filename}
```

---

## 8. API Routes

### Auth Routes (`/api/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register patient or doctor |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/reset-password` | Trigger password reset email |

### Report Routes (`/api/reports`)
| Method | Path | Description |
|---|---|---|
| POST | `/api/reports/upload` | Upload blood work file |
| GET | `/api/reports` | List current user's reports |
| GET | `/api/reports/:id` | Get single report with results |
| DELETE | `/api/reports/:id` | Delete a report |
| POST | `/api/reports/:id/share` | Share report with a doctor by email |

### Analysis Routes (`/api/analysis`)
| Method | Path | Description |
|---|---|---|
| POST | `/api/analysis/:reportId/run` | Trigger AI analysis on a report |
| GET | `/api/analysis/:reportId` | Get analysis results |

### Doctor Routes (`/api/doctor`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/doctor/patients` | List linked patients |
| GET | `/api/doctor/patients/:patientId/reports` | Get patient's reports |
| POST | `/api/doctor/notes` | Add note to a report |
| PATCH | `/api/doctor/notes/:noteId` | Update note or override flag |

### All routes must:
- Require JWT authentication (except `/api/auth/register` and `/api/auth/login`)
- Return consistent JSON: `{ success: true, data: {...} }` or `{ success: false, error: "message", code: "ERROR_CODE" }`
- Return appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500)

---

## 9. Frontend Routes

```
/                          -> Landing page (public)
/login                     -> Login (public)
/register                  -> Register (public)
/dashboard                 -> Patient dashboard (protected)
/upload                    -> Upload report (protected)
/processing/:reportId      -> Processing status (protected)
/results/:reportId         -> Analysis results (protected)
/share/:reportId           -> Share report (protected)
/doctor/dashboard          -> Doctor dashboard (protected, role: doctor)
/doctor/patient/:patientId -> Patient detail (protected, role: doctor)
/settings                  -> Settings (protected)
```

Redirect unauthenticated users to `/login`. Redirect users with the wrong role to their appropriate dashboard.

---

## 10. UI Requirements

### Disclaimer Component
The `<Disclaimer />` component **must appear on every page that shows AI results**. It must be visually prominent (yellow warning box) and cannot be hidden, dismissed, or toggled off.

Required disclaimer text:
```
ClinicalCoPilot is an AI-powered tool, not a medical device.
Results are for informational purposes only and do not constitute
a medical diagnosis. Always consult a qualified physician before
making any health decisions.
```

### Risk Level Display
Always use **both** color and icon — never color alone (accessibility requirement).

| Risk Level | Color | Icon | Tailwind Classes |
|---|---|---|---|
| Normal | Green | checkmark | `bg-green-100 text-green-800 border-green-200` |
| Borderline | Yellow | warning triangle | `bg-yellow-100 text-yellow-800 border-yellow-200` |
| High | Red | filled circle | `bg-red-100 text-red-800 border-red-200` |

### Processing Status Stages
Display these labels in order as processing progresses:
1. `Uploading...`
2. `Extracting text...`
3. `Analyzing with AI...`
4. `Complete` — then auto-redirect to `/results/:reportId`

### Mobile Responsiveness
- Minimum supported width: 320px
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) throughout
- All pages must be fully usable at 375px (mobile), 768px (tablet), and 1280px (desktop)

---

## 11. Security Rules

These are absolute. Never compromise them.

1. **ANTHROPIC_API_KEY** — server-side only, never in frontend code or API responses
2. **SUPABASE_SERVICE_ROLE_KEY** — server-side only, never exposed to clients
3. **JWT tokens** — store in `httpOnly` cookies, never in `localStorage` or `sessionStorage`
4. **File uploads** — validate MIME type server-side, not just by file extension
5. **Database queries** — use Supabase client parameterized queries only, never string concatenation
6. **PHI logging** — never log patient names, report content, or lab values in production
7. **CORS** — restrict allowed origins to `FRONTEND_URL` environment variable only
8. **Rate limiting** — apply `express-rate-limit` to all `/api/analysis/*` routes (max 10 requests per user per minute)
9. **RLS** — every Supabase table must have row-level security enabled before launch

---

## 12. Testing Protocol

### Run Order (always in this sequence)
```bash
# 1. Backend unit tests
cd backend && npx vitest run tests/unit/

# 2. Frontend unit tests
cd frontend && npx vitest run tests/unit/

# 3. Integration tests (requires .env with real Supabase test project)
cd backend && npx vitest run tests/integration/

# 4. End-to-end tests (requires local dev server running on port 3000)
cd frontend && npx playwright test
```

### Autonomous Test Loop (for overnight runs)

When running autonomously, follow this loop without stopping:

```
REPEAT:
  1. Run the full test suite (unit + integration + E2E)
  2. Collect all failures
  3. For each failure:
     a. Read the error message and full stack trace
     b. Read the source file(s) involved
     c. Identify the root cause
     d. Fix the root cause — do NOT skip or comment out failing tests
     e. Do NOT move to the next failure until the current one passes
  4. Re-run the full test suite
UNTIL: zero failures across all test types

THEN:
  5. Run coverage report
  6. Identify any code paths below 80% coverage
  7. Write tests to cover those paths
  8. Re-run until all coverage targets are met
  9. Output a final summary: tests passed, coverage %, files changed
```

### Required Test Cases per Feature

**File upload:** valid PDF, valid image, oversized file, unsupported file type, empty file

**Text extraction:** digital PDF, image-based PDF (OCR), multi-page PDF, corrupted file, file with no recognizable lab values

**Claude analysis:** normal results, borderline results, high-risk results, report with no extractable values, Claude API timeout, Claude API returning malformed JSON

**Auth:** register new user, login with valid credentials, login with wrong password, expired token, missing token, wrong role access

**Doctor dashboard:** list patients, view patient report history, add note, update flag override

---

## 13. Error Handling Standards

All errors must follow this structure throughout the codebase.

Backend response format:
```javascript
// Success
res.status(200).json({ success: true, data: { ... } });

// Error
res.status(400).json({
  success: false,
  error: 'Human-readable message safe to display to users',
  code: 'MACHINE_READABLE_CODE'
});
```

Frontend handling:
```javascript
try {
  const result = await uploadReport(file);
} catch (err) {
  setError(err.message || 'Something went wrong. Please try again.');
  // Never crash the UI — always show a user-friendly fallback message
}
```

Required error codes:
- `FILE_TOO_LARGE` — file exceeds size limit
- `INVALID_FILE_TYPE` — unsupported format
- `EXTRACTION_FAILED` — could not extract text from file
- `ANALYSIS_FAILED` — Claude API error after all retries exhausted
- `UNAUTHORIZED` — missing or invalid JWT
- `FORBIDDEN` — valid JWT but insufficient role
- `NOT_FOUND` — resource does not exist or does not belong to this user

---

## 14. Development Commands

Root `package.json` scripts:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && node --watch server.js",
    "dev:frontend": "cd frontend && vite",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd backend && vitest run",
    "test:frontend": "cd frontend && vitest run",
    "test:e2e": "cd frontend && playwright test",
    "test:watch": "cd backend && vitest",
    "build": "cd frontend && vite build",
    "lint": "eslint . --ext .js,.jsx"
  }
}
```

---

## 15. Phased Build Order

Build features in this exact order. Do not skip phases or build out of sequence.

### Phase 1 — Core MVP (2 weeks)
- [ ] Project scaffold — folder structure, package.json files, .env.example, .gitignore
- [ ] Supabase project setup — run schema.sql, enable RLS, create storage bucket
- [ ] Backend: auth routes (register, login, JWT middleware)
- [ ] Frontend: register and login pages wired to backend
- [ ] Backend: file upload route + Supabase Storage integration
- [ ] Frontend: upload page with drag-and-drop zone
- [ ] Backend: PDF text extraction with pdf-parse
- [ ] Backend: image OCR with Tesseract.js
- [ ] Backend: Claude API integration with MEDICAL_SYSTEM_PROMPT
- [ ] Backend: JSON response parsing and lab value normalization
- [ ] Backend: save results to PostgreSQL (lab_values + risk_flags tables)
- [ ] Frontend: all 10 pages scaffolded with placeholder content
- [ ] Frontend: processing page with live status stages
- [ ] Frontend: results page with RiskBadge and LabValueTable components
- [ ] Frontend: Disclaimer component visible on results page
- [ ] End-to-end test: upload a sample PDF and see results
- [ ] Deploy to Vercel

### Phase 2 — Persistence & Trends (1 week)
- [ ] Query biomarker history across multiple reports for same user
- [ ] TrendChart component (Recharts line chart, date on x-axis, value on y-axis)
- [ ] Worsening trend detection — flag if last 2+ values are increasing toward abnormal
- [ ] Patient dashboard showing report list with dates and risk summaries

### Phase 3 — Doctor Dashboard (1 week)
- [ ] Doctor role enforcement in auth middleware
- [ ] Doctor registration flow with credential fields
- [ ] Share report: patient enters doctor email, creates doctor_patients link
- [ ] Doctor dashboard: patient list with most recent risk level badge
- [ ] Patient detail view: full report history for one patient
- [ ] Clinical notes editor: save to doctor_notes table
- [ ] Flag override: dropdown (confirmed / reviewed / dismissed), saved to doctor_notes

### Phase 4 — Polish & Deploy (1 week)
- [ ] Mobile responsiveness audit at 375px, 768px, 1280px
- [ ] WCAG 2.1 AA audit — keyboard navigation, color contrast, aria labels
- [ ] Full E2E test suite passing with zero failures
- [ ] Rate limiting on `/api/analysis/*` routes
- [ ] Error handling audit — every API error returns correct code and message
- [ ] Production environment variables set in Vercel dashboard
- [ ] README.md with local setup instructions and architecture overview

---

## 16. What NOT To Do

- Do not use `localStorage` or `sessionStorage` for JWT tokens — use `httpOnly` cookies
- Do not call the Claude API from frontend code — server-side only
- Do not skip writing tests to move faster — tests are required per the phased plan
- Do not log patient data, lab values, or report content in production console
- Do not hardcode reference range numbers as magic numbers in logic — keep them in `referenceRanges.js`
- Do not show raw Claude API error messages to users — log server-side, show generic message
- Do not allow file uploads without validating MIME type on the server
- Do not remove or conditionally hide the medical disclaimer from any results screen
- Do not use percentage-based widths in any document generation code — use absolute units

---

## 17. Medical Disclaimer Text (Legal)

This exact text must appear in the UI on all results screens and in any generated PDF exports:

```
ClinicalCoPilot is not a medical device and does not provide medical diagnosis.
All AI-generated analysis is for informational purposes only. Risk indicators
are based on standard clinical reference ranges and may not account for
individual health history, medications, or other factors. Always consult a
qualified physician before making any health decisions. The developers of
ClinicalCoPilot are not liable for any actions taken based on information
provided by this application.
```

---

*ClinicalCoPilot — CLAUDE.md v1.0 | April 2026*
*Paired with: MediScan_AI_PRD.docx v1.0*