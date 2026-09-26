# Supabase integration contract

This application is currently a static, client-only prototype. It does **not** connect to Supabase and must not be used for real exams, real student records, or clinical assessment. The SQL file alongside this guide is a review artifact, not a migration that has been applied.

## Identity and participant access

Use Supabase Auth with Google OAuth. For student access, require a confirmed personal Gmail identity according to the institution's policy, then have a trusted server-side function read the authenticated JWT identity and compare its normalized email together with the submitted NIM against one active `prescription_exam.participants` record. Do not trust an email, participant ID, NIM match, or role asserted by a browser client. Return a generic denial when the pair does not match. Only after verification should the server create or resume an exam session.

Instructor/admin identities are separate. Provision their `staff_roles` rows through an administrative procedure that is not exposed to ordinary users. Authorize each administrative query and mutation on the server using the authenticated user ID and active role record. Visiting `/admin` is never proof of authorization.

## Data boundaries

The anticipated schema names are `participants`, `exam_sessions`, `questions`, `attempts`, `answers`, and `audit_events` under the `prescription_exam` schema. The schema outline also includes `staff_roles` to describe the separate instructor role. Enable and test RLS for every exposed table. Students may read only the published prompts for their currently valid exam session, and read/write only their own answers through bounded, ownership-checking server operations. Submission must atomically finalize the session and attempt. Audit events must be recorded append-only on the server. Grading keys, rubrics not intended for students, and clinical answer content must stay in private server-side storage and never appear in a student response or frontend bundle.

## Proposed server operations

Implement and security-test `verify_student(nim)`, `save_answer(session_id, question_id, response)`, and `submit_exam(session_id)` as carefully scoped RPCs or Edge Functions. Each operation must re-derive identity from the authenticated token, verify participant/session ownership, enforce active state and expiry, and write required audit events. Administrative operations must repeat staff-role authorization for each request. Use only the public Supabase URL and anon key in the browser; keep service credentials exclusively in trusted secret storage.

## Frontend migration

Replace the demo-auth and local-storage boundary with Supabase Auth and typed client calls only after the server routines and policies pass security testing. Use Google OAuth redirect/callback handling and explicit loading, error, and denial states. Persist drafts using the server save operation and show autosave status only after its response succeeds. Treat submission success as the server's persisted status, not a local route change. Keep local synthetic demo mode clearly distinguished or remove it before a production exam.

## Release gates

Before production deployment, verify at minimum that: (1) a matching active email/NIM pair is accepted; (2) a mismatch, non-Gmail identity, inactive participant, expired session, and unauthenticated request are denied; (3) one student cannot read another student's sessions or answers; (4) student API responses and built assets contain no answer key; (5) a student cannot grant themselves a staff role or write audit events; (6) non-staff requests to every admin operation are denied; (7) save/submit races and duplicate requests remain safe; (8) browser-only anti-cheating limitations are communicated and never described as guaranteed prevention.

## Configuration

When the integration is approved, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the deployment platform's environment/secrets interface. These are browser-visible values and provide no security without correct RLS. Never expose `SUPABASE_SERVICE_ROLE_KEY`, database passwords, or signing secrets in a frontend variable, source file, build artifact, or client response.
