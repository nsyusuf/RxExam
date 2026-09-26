-- Ujian Menulis Resep: integration reference only; NOT applied to any project.
-- Review against the existing Supabase project before using this as a migration.
-- This schema intentionally contains no answer key or clinical recommendation.

create schema if not exists prescription_exam;

create table if not exists prescription_exam.participants (
  id uuid primary key default gen_random_uuid(),
  nim text not null unique,
  google_email text not null unique,
  full_name text not null,
  cohort text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Staff role records are provisioned by trusted administrators, never by the client.
create table if not exists prescription_exam.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'lecturer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists prescription_exam.questions (
  id uuid primary key default gen_random_uuid(),
  exam_version text not null,
  position integer not null check (position > 0),
  title text not null,
  prompt text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (exam_version, position)
);

create table if not exists prescription_exam.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references prescription_exam.participants(id),
  exam_version text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists prescription_exam.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null unique references prescription_exam.exam_sessions(id),
  participant_id uuid not null references prescription_exam.participants(id),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists prescription_exam.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references prescription_exam.attempts(id) on delete cascade,
  question_id uuid not null references prescription_exam.questions(id),
  response text not null default '',
  last_saved_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create table if not exists prescription_exam.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  participant_id uuid references prescription_exam.participants(id),
  exam_session_id uuid references prescription_exam.exam_sessions(id),
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Turn on RLS on every table. No client table policy is provided for participant
-- record writes, staff-role writes, or audit-event inserts. Use reviewed RPCs / Edge
-- Functions for those operations; never trust a role or participant ID from a client.
alter table prescription_exam.participants enable row level security;
alter table prescription_exam.staff_roles enable row level security;
alter table prescription_exam.questions enable row level security;
alter table prescription_exam.exam_sessions enable row level security;
alter table prescription_exam.attempts enable row level security;
alter table prescription_exam.answers enable row level security;
alter table prescription_exam.audit_events enable row level security;

-- A staff member can read only their own role claim; this does not grant access to
-- admin data. Admin authorization must also be enforced on every data RPC/policy.
create policy staff_roles_read_own on prescription_exam.staff_roles
  for select to authenticated using (user_id = auth.uid() and is_active = true);

-- Questions are visible to the participant only while an active server-created exam
-- session exists for the authenticated email. Public student reads never include keys.
create policy questions_visible_to_active_exam on prescription_exam.questions
  for select to authenticated using (
    is_published = true and exists (
      select 1
      from prescription_exam.exam_sessions s
      join prescription_exam.participants p on p.id = s.participant_id
      where p.google_email = lower(auth.jwt() ->> 'email')
        and p.is_active = true
        and s.exam_version = questions.exam_version
        and s.status = 'in_progress'
        and s.expires_at > now()
    )
  );

create policy exam_sessions_read_own on prescription_exam.exam_sessions
  for select to authenticated using (
    exists (select 1 from prescription_exam.participants p
      where p.id = exam_sessions.participant_id
        and p.google_email = lower(auth.jwt() ->> 'email')
        and p.is_active = true)
  );

create policy attempts_read_own on prescription_exam.attempts
  for select to authenticated using (
    exists (select 1 from prescription_exam.participants p
      where p.id = attempts.participant_id
        and p.google_email = lower(auth.jwt() ->> 'email')
        and p.is_active = true)
  );

create policy answers_read_own on prescription_exam.answers
  for select to authenticated using (
    exists (select 1 from prescription_exam.attempts a
      join prescription_exam.participants p on p.id = a.participant_id
      where a.id = answers.attempt_id
        and p.google_email = lower(auth.jwt() ->> 'email')
        and p.is_active = true)
  );

-- Student writes should be exposed through a bounded save_answer RPC/Edge Function
-- that rechecks auth.uid(), email/NIM verification, session status and expiry; there
-- is intentionally no unrestricted INSERT/UPDATE policy here.
-- Admin read/write policies should require an active staff_roles row with role in
-- ('admin','lecturer'), and be reviewed before deployment. Audit logs are append-only
-- server-side; no client insert/update/delete policy is intentionally defined.

-- Required server-side flows (design contract, implement and security-test separately):
-- 1. verify_student(p_nim): require auth.uid(), confirmed personal @gmail.com email,
--    exact normalized email + NIM match and active participant; generic failure; record
--    audit event; create server-owned session/attempt; return minimal session metadata.
-- 2. save_answer(session_id, question_id, response): verify ownership/status/expiry,
--    upsert answer, append audit event; never accept participant/role from the client.
-- 3. submit_exam(session_id): verify ownership, atomically finalize attempt and session.
-- 4. admin procedures: authorize active staff_roles server-side on every request.
-- 5. Keep grading keys in private server-only storage or a protected server routine;
--    never put them in questions, public views, frontend bundles, or API responses to
--    student roles.
