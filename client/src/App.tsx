import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Copy,
  Database,
  Download,
  FileCheck2,
  FileQuestion,
  Fingerprint,
  Flag,
  Gauge,
  GraduationCap,
  History,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  TabletSmartphone,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { Toaster, toast } from "sonner";

import { ThemeProvider } from "./contexts/ThemeContext";
import { getExamPayload, saveAnswer, signInWithGoogle, signOut as supabaseSignOut, submitExam, supabase, verifyStudent } from "./lib/supabase";

const DEMO_EMAIL = "demo.student@gmail.com";
const DEMO_NIM = "2408101017";
const ATTEMPT_ID = "RX-26-0148";
const EXAM_DRAFT_KEY = "rxexam-prototype-draft-v1";
const EXAM_DURATION_SECONDS = 15 * 60;

type AnswerSet = {
  patientName: string;
  age: string;
  weight: string;
  drugName: string;
  strengthDose: string;
  dosageForm: string;
  quantity: string;
  route: string;
  frequency: string;
  timing: string;
  duration: string;
  signa: string;
  freeTextPrescription: string;
};

type AdminTab = "overview" | "participants" | "attempts" | "question-bank" | "audit";

type Participant = {
  nim: string;
  name: string;
  email: string;
  status: "Active" | "Invited";
  lastAccess: string;
};

const emptyAnswer = (): AnswerSet => ({
  patientName: "",
  age: "",
  weight: "",
  drugName: "",
  strengthDose: "",
  dosageForm: "",
  quantity: "",
  route: "",
  frequency: "",
  timing: "",
  duration: "",
  signa: "",
  freeTextPrescription: "",
});

const initialParticipants: Participant[] = [
  { nim: "2408101017", name: "Alya Prameswari", email: "demo.student@gmail.com", status: "Active", lastAccess: "Today, 09:42" },
  { nim: "2408101022", name: "Bima Satrya", email: "bima.satrya@gmail.com", status: "Active", lastAccess: "Yesterday, 14:10" },
  { nim: "2408101031", name: "Citra Kusuma", email: "citra.kusuma@gmail.com", status: "Invited", lastAccess: "Not yet" },
  { nim: "2408101044", name: "Dimas Raharjo", email: "dimas.r@gmail.com", status: "Active", lastAccess: "18 Sep 2026" },
];

const questions = [
  {
    number: 1,
    label: "Case 01",
    title: "Acute care scenario",
    meta: "Draft response",
    text: "Lecturer placeholder: the clinical vignette for this item will be inserted by the lecturer. This prototype does not generate, recommend, or validate treatment.",
  },
  {
    number: 2,
    label: "Case 02",
    title: "Chronic care scenario",
    meta: "Not started",
    text: "Lecturer placeholder: use this space for an approved assessment vignette. Answer keys remain protected from the student view.",
  },
  {
    number: 3,
    label: "Case 03",
    title: "Special population scenario",
    meta: "Not started",
    text: "Lecturer placeholder: the question bank content is intentionally omitted from this demo build pending secure lecturer authoring.",
  },
];

const auditEvents = [
  { time: "09:42:18", event: "Google identity verified", detail: DEMO_EMAIL, type: "success" },
  { time: "09:42:26", event: "NIM matched to participant", detail: `${DEMO_NIM} · Alya Prameswari`, type: "success" },
  { time: "09:46:03", event: "Autosave checkpoint", detail: `Attempt ${ATTEMPT_ID} · Case 01`, type: "info" },
  { time: "09:48:19", event: "Tab visibility changed", detail: "Audit event recorded · no monitoring claim", type: "warning" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Brand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <div className={cx("flex items-center", compact ? "gap-2.5" : "gap-3")}>
      <div className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {!compact && (
        <div>
          <div className={cx("font-display text-[15px] font-bold tracking-tight", light ? "text-slate-950" : "text-white")}>RxExam</div>
          <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", light ? "text-slate-500" : "text-slate-400")}>Assessment workspace</div>
        </div>
      )}
    </div>
  );
}

function InstitutionBrand() {
  return (
    <div className="space-y-3">
      <div className="font-display text-4xl font-bold tracking-tight text-white">Rx-Exam</div>
      <div className="space-y-2 text-base font-medium text-slate-300">
        <div>Bagian Farmakologi</div>
        <div>Prodi S1 Kedokteran</div>
        <div>Universitas Tadulako</div>
      </div>
    </div>
  );
}

function PrototypeBadge({ dark = false }: { dark?: boolean }) {
  return (
    <span className={cx("prototype-badge", dark ? "prototype-badge-dark" : "")}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Prototype build
    </span>
  );
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">
      {children} {required && <span className="text-teal-600">*</span>}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, required = false, className = "", type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; className?: string; type?: string }) {
  return (
    <div className={className}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input-control"
      />
    </div>
  );
}

function AppHeader({ onNavigate, activePath, studentEmail, onSignOut }: { onNavigate: (path: string) => void; activePath: string; studentEmail: string; onSignOut: () => void }) {
  return (
    <header className="app-header">
      <button className="flex items-center gap-3 text-left" onClick={() => onNavigate("/login")} aria-label="Go to RxExam sign in">
        <Brand />
      </button>
      <div className="hidden items-center gap-2 md:flex">
        <PrototypeBadge dark />
        <div className="mx-2 h-5 w-px bg-white/10" />
        <button className={cx("header-link", activePath === "/security" && "header-link-active")} onClick={() => onNavigate("/security")}>Security model</button>
        {studentEmail && <span className="text-xs text-slate-400">{studentEmail}</span>}
        {studentEmail && <button onClick={onSignOut} className="icon-button-dark" aria-label="Sign out"><LogOut size={16} /></button>}
      </div>
      <button className="icon-button-dark md:hidden" onClick={() => onNavigate("/security")} aria-label="Open security model"><ShieldCheck size={18} /></button>
    </header>
  );
}

function Callout({ tone = "info", title, children }: { tone?: "info" | "warning" | "success"; title: string; children: ReactNode }) {
  const styles = {
    info: { wrap: "callout-info", icon: <ShieldCheck size={17} />, iconWrap: "callout-icon-info" },
    warning: { wrap: "callout-warning", icon: <AlertTriangle size={17} />, iconWrap: "callout-icon-warning" },
    success: { wrap: "callout-success", icon: <CheckCircle2 size={17} />, iconWrap: "callout-icon-success" },
  }[tone];
  return (
    <div className={cx("callout", styles.wrap)}>
      <div className={cx("callout-icon", styles.iconWrap)}>{styles.icon}</div>
      <div>
        <div className="text-[12px] font-bold text-slate-900">{title}</div>
        <div className="mt-0.5 text-[12px] leading-5 text-slate-600">{children}</div>
      </div>
    </div>
  );
}

function LoginPage({ onStudentLogin, error }: { onStudentLogin: () => void; error?: string }) {
  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <div className="login-grid min-h-screen lg:grid lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 lg:flex lg:flex-col lg:justify-center lg:p-12 xl:p-16">
          <div className="relative z-10">
            <InstitutionBrand />
          </div>
          <div className="login-orb login-orb-one" />
          <div className="login-orb login-orb-two" />
        </section>
        <section className="flex min-h-screen flex-col bg-[#f6f8fb] text-slate-900">
          <div className="flex items-center p-5 lg:hidden">
            <div>
              <div className="font-display text-xl font-bold tracking-tight text-slate-950">Rx-Exam</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Bagian Farmakologi · Prodi S1 Kedokteran</div>
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-5 py-10 sm:px-10">
            <div className="surface-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-slate-400">Student sign in</p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-950">Welcome to RxExam</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Use the ordinary Gmail account registered by your lecturer. Workspace accounts are not required.</p>
                </div>
                <div className="hidden rounded-2xl bg-teal-50 p-3 text-teal-700 sm:block"><GraduationCap size={22} /></div>
              </div>
              <button className="google-button mt-7" onClick={onStudentLogin}>
                <span className="google-g">G</span>
                <span>Sign in with Google</span>
                <ArrowRight size={17} className="ml-auto" />
              </button>
              <div className="mt-5 flex items-center gap-3 text-[11px] text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                <span>two-step identity check</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <Fingerprint size={16} className="mt-0.5 shrink-0 text-teal-600" />
                <p className="text-[11px] leading-5 text-slate-600">
                  After Google authentication, you will enter your <strong className="text-slate-800">NIM</strong>. Access is granted only when the email and NIM match the lecturer-maintained participant list.
                </p>
              </div>
            </div>
            {error && (
              <div className="mt-6">
                <Callout tone="warning" title="Sign-in unavailable">{error}</Callout>
              </div>
            )}
          </div>
          <div className="p-5 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Assessment only · no clinical prescribing</div>
        </section>
      </div>
    </div>
  );
}

function VerifyStudentPage({ email, onVerified, onBack }: { email: string; onVerified: (result: any) => void; onBack: () => void }) {
  const [nim, setNim] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setChecking(true);
    verifyStudent(nim.trim()).then((result) => {
      setChecking(false);
      onVerified(result);
    }).catch(() => {
      setChecking(false);
      setError("This Google account is not registered for that NIM, or the exam session is not available.");
    });
  };
  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="verify-aside hidden w-[38%] flex-col justify-between p-12 text-white lg:flex xl:p-16"><div><Brand /><div className="mt-20 max-w-sm"><p className="eyebrow text-teal-300">Step 02 / 02</p><h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-[-0.04em]">Match the person to the participant record.</h1><p className="mt-5 text-sm leading-7 text-slate-300">Your Google identity is known. NIM verification connects it to the exact participant record maintained by the lecturer.</p></div></div><div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-teal-400" />Email identity received from Google <Check size={14} className="text-teal-300" /></div></aside>
        <main className="flex flex-1 items-center justify-center p-5 sm:p-10"><div className="w-full max-w-[560px]"><button onClick={onBack} className="mb-8 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-slate-900"><ArrowLeft size={15} /> Back to sign in</button><div className="mb-5 lg:hidden"><Brand compact /></div><div className="surface-card p-6 sm:p-9"><div className="flex items-center justify-between"><div><p className="eyebrow text-teal-700">NIM verification</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950">Confirm your student record</h2></div><div className="step-pill"><span className="step-dot step-dot-done"><Check size={11} /></span><span className="step-line" /><span className="step-dot step-dot-active">2</span></div></div><div className="mt-7 flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 p-4"><div className="google-avatar">G</div><div className="min-w-0"><div className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-800">Google account</div><div className="truncate text-sm font-semibold text-slate-800">{email}</div></div><BadgeCheck size={18} className="ml-auto shrink-0 text-teal-600" /></div><form onSubmit={handleSubmit} className="mt-8"><FieldLabel required>Nomor Induk Mahasiswa (NIM)</FieldLabel><input autoFocus inputMode="numeric" value={nim} onChange={(event) => setNim(event.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="e.g. 2408101017" className={cx("input-control text-lg tracking-[0.16em]", error && "input-error")} /><div className="mt-2 text-[11px] text-slate-400">Demo participant: <span className="font-mono text-slate-500">{DEMO_NIM}</span></div>{error && <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700"><XCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}<button type="submit" disabled={checking || nim.length < 8} className="primary-button mt-7 w-full">{checking ? <><RefreshCw size={16} className="animate-spin" /> Matching record…</> : <>Verify and continue <ArrowRight size={16} /></>}</button></form><div className="mt-6 border-t border-slate-100 pt-5 text-[11px] leading-5 text-slate-500"><strong className="text-slate-700">Why two steps?</strong> A Google email alone does not identify the exam participant. RxExam requires a deliberate email + NIM match before an attempt is created.</div></div><p className="mt-6 text-center text-[11px] text-slate-400">Your NIM is used only to locate the registered demo participant in this prototype.</p></div></main>
      </div>
    </div>
  );
}

function ExamInstructions({ onBegin }: { onBegin: () => void }) {
  return <div className="min-h-screen bg-[#f6f8fb]"><AppHeader onNavigate={(path) => window.location.assign(path)} activePath="/exam" studentEmail={DEMO_EMAIL} onSignOut={() => window.location.assign("/login")} /><main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow text-teal-700">Prescription writing examination</p><h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">Before you begin</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Read the assessment rules carefully. You will have one timed attempt, and your response will be submitted for lecturer review.</p></div><PrototypeBadge /></div><div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"><div className="surface-card p-6 sm:p-8"><div className="flex items-center gap-3 border-b border-slate-100 pb-5"><div className="rounded-xl bg-teal-50 p-2.5 text-teal-700"><ClipboardCheck size={20} /></div><div><h2 className="font-display text-lg font-bold text-slate-950">Assessment brief</h2><p className="text-xs text-slate-500">Rx writing · cohort 2026 · demo session</p></div></div><div className="mt-6 space-y-5">{[{ n: "01", t: "Work independently", d: "Answer each lecturer-provided case using the structured prescription fields. This is not a clinical decision support tool." }, { n: "02", t: "Use the countdown", d: "Your attempt has a 15-minute limit. Progress is autosaved on this device while the page is open." }, { n: "03", t: "Submit once", d: "Review all questions before final submission. After submission, responses are locked for review." }].map((item) => <div key={item.n} className="flex gap-4"><div className="font-mono text-[11px] font-bold text-teal-600">{item.n}</div><div><div className="text-sm font-bold text-slate-800">{item.t}</div><p className="mt-1 text-xs leading-5 text-slate-500">{item.d}</p></div></div>)}</div><Callout tone="warning" title="Tab visibility is recorded as an audit event">The prototype can record that the tab became hidden. It does not claim to monitor your browser or prevent cheating.</Callout><button onClick={onBegin} className="primary-button mt-7 w-full sm:w-auto">Start timed attempt <ArrowRight size={16} /></button></div><div className="space-y-5"><div className="dark-panel"><div className="flex items-center justify-between"><span className="eyebrow text-teal-300">Attempt details</span><span className="status-dot-label"><span className="status-dot" />Ready</span></div><div className="mt-6 grid grid-cols-2 gap-5">{[{ label: "Questions", value: "03" }, { label: "Time limit", value: "15:00" }, { label: "Attempt ID", value: ATTEMPT_ID }, { label: "Student", value: "Alya P." }].map((item) => <div key={item.label}><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{item.label}</div><div className="mt-1.5 font-mono text-sm font-semibold text-white">{item.value}</div></div>)}</div></div><div className="surface-card p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><LockKeyhole size={16} className="text-teal-600" /> What is protected</div><p className="mt-3 text-xs leading-5 text-slate-500">Answer keys, scoring rules, and other participants remain lecturer-only. This demo shows placeholders only and exposes no key to students.</p><button onClick={() => window.location.assign("/security")} className="mt-4 text-xs font-bold text-teal-700 hover:text-teal-900">View security model →</button></div></div></div></main></div>;
}

function ExamPage({ onSubmit, onNavigate, studentEmail, attemptId, dbQuestions }: { onSubmit: () => void; onNavigate: (path: string) => void; studentEmail: string; attemptId: string; dbQuestions: any[] }) {
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [draft] = useState<{ startedAt: number; answers: Record<number, AnswerSet> }>(() => {
    try {
      const saved = localStorage.getItem(EXAM_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { startedAt?: number; answers?: Record<number, AnswerSet> };
        if (typeof parsed.startedAt === "number" && parsed.answers) return { startedAt: parsed.startedAt, answers: parsed.answers };
      }
    } catch { /* Ignore invalid prototype data and start with a clean draft. */ }
    return { startedAt: Date.now(), answers: { 1: emptyAnswer(), 2: emptyAnswer(), 3: emptyAnswer() } };
  });
  const [answers, setAnswers] = useState<Record<number, AnswerSet>>(draft.answers);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, EXAM_DURATION_SECONDS - Math.floor((Date.now() - draft.startedAt) / 1000)));
  const [showSubmit, setShowSubmit] = useState(false);
  const [saveState, setSaveState] = useState("Saved just now");
  const [tabWarning, setTabWarning] = useState(false);
  const [expiryHandled, setExpiryHandled] = useState(false);
  const question = dbQuestions[activeQuestion - 1] ?? questions[activeQuestion - 1];
  const currentAnswer = answers[activeQuestion];

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft((current) => (current > 0 ? current - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      try {
        const q = dbQuestions[activeQuestion - 1];
        if (!q?.id) return;
        await saveAnswer(attemptId, q.id, answers[activeQuestion]);
        setSaveState("Saved to server");
      } catch {
        setSaveState("Save failed — retrying");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [answers, activeQuestion, attemptId, dbQuestions]);

  useEffect(() => {
    if (secondsLeft === 0 && !expiryHandled) {
      setExpiryHandled(true);
      onSubmit();
    }
  }, [secondsLeft, expiryHandled, onSubmit]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") setTabWarning(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const updateAnswer = (field: keyof AnswerSet, value: string) => {
    setAnswers((previous) => ({ ...previous, [activeQuestion]: { ...previous[activeQuestion], [field]: value } }));
    setSaveState("Saving…");
  };

  const filledFields = Object.values(currentAnswer).filter(Boolean).length;
  const allAnswered = Object.values(answers).some((answer) => Object.values(answer).some(Boolean));
  const timer = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return <div className="min-h-screen bg-[#f3f6f9] pb-24"><div className="exam-topbar"><div className="flex min-w-0 items-center gap-3"><Brand /><div className="hidden h-6 w-px bg-white/10 sm:block" /><div className="hidden min-w-0 sm:block"><div className="truncate text-xs font-semibold text-white">Prescription writing examination</div><div className="text-[10px] text-slate-500">Attempt {ATTEMPT_ID}</div></div></div><div className="flex items-center gap-2 sm:gap-4"><div className="save-state"><span className="save-pulse" />{saveState}</div><div className={cx("exam-timer", secondsLeft < 120 && "exam-timer-danger")}><Clock3 size={16} /><span>{timer}</span></div><button className="icon-button-dark" onClick={() => onNavigate("/security")} aria-label="View security model"><ShieldCheck size={17} /></button></div></div><div className="sticky-warning-wrap">{tabWarning && <div className="mx-auto flex max-w-7xl items-start gap-3 border-x border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 sm:items-center"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><span><strong>Tab visibility event recorded.</strong> This is an audit signal only; it is not browser monitoring.</span><button onClick={() => setTabWarning(false)} className="ml-auto text-amber-700" aria-label="Dismiss warning"><X size={15} /></button></div>}</div><main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="eyebrow text-teal-700">Timed attempt · student view</p><h1 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Write the prescription</h1></div><div className="flex items-center gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><UserCheck size={14} className="text-teal-600" /> {studentEmail}</span><span className="hidden text-slate-300 sm:inline">•</span><span>{filledFields}/13 fields on current case</span></div></div><div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)_280px]"><aside className="order-2 lg:order-1"><div className="surface-card p-4 lg:sticky lg:top-5"><div className="flex items-center justify-between"><div><div className="eyebrow text-slate-400">Question navigator</div><div className="mt-1 text-sm font-bold text-slate-900">3 cases</div></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{allAnswered ? "In progress" : "Started"}</span></div><div className="mt-5 space-y-2">{questions.map((item) => { const answered = Object.values(answers[item.number]).some(Boolean); return <button key={item.number} onClick={() => setActiveQuestion(item.number)} className={cx("question-nav-item", activeQuestion === item.number && "question-nav-active")}><span className={cx("question-number", answered && "question-number-answered")}>{answered ? <Check size={13} /> : `0${item.number}`}</span><span className="min-w-0 text-left"><span className="block text-xs font-bold">{item.label}</span><span className="mt-0.5 block truncate text-[10px] font-medium opacity-70">{answered ? "Response saved" : item.meta}</span></span><ChevronDown size={14} className="ml-auto -rotate-90 opacity-40" /></button> })}</div><div className="mt-6 border-t border-slate-100 pt-5"><div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><span>Overall progress</span><span>{Math.round((Object.values(answers).filter((answer) => Object.values(answer).some(Boolean)).length / 3) * 100)}%</span></div><div className="progress-track mt-2"><div className="progress-fill" style={{ width: `${(Object.values(answers).filter((answer) => Object.values(answer).some(Boolean)).length / 3) * 100}%` }} /></div></div><div className="mt-5 flex items-start gap-2 text-[10px] leading-4 text-slate-400"><LockKeyhole size={13} className="mt-0.5 shrink-0" /> Answers are autosaved locally for this prototype.</div></div></aside><section className="order-1 min-w-0 lg:order-2"><div className="surface-card overflow-hidden"><div className="border-b border-slate-100 bg-[#fbfcfe] px-5 py-5 sm:px-7"><div className="flex items-center justify-between gap-4"><div><div className="eyebrow text-teal-700">{question.label}</div><h2 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-950">{question.title}</h2></div><div className="rounded-xl bg-slate-100 px-3 py-2 text-right"><div className="font-mono text-[10px] font-bold text-slate-400">ITEM</div><div className="font-mono text-sm font-bold text-slate-700">0{activeQuestion} / 03</div></div></div><div className="case-vignette mt-5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-teal-800"><FileQuestion size={14} /> Lecturer-provided case vignette</div><p className="mt-2 text-sm leading-6 text-slate-700">{question.text}</p></div></div><div className="px-5 py-6 sm:px-7"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-900">Structured prescription fields</h3><p className="mt-1 text-xs text-slate-500">Use your phone keyboard or a standard keyboard. No stylus required.</p></div><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{filledFields} / 13 complete</span></div><div className="grid gap-4 sm:grid-cols-2"><TextField label="Patient name" required value={currentAnswer.patientName} onChange={(value) => updateAnswer("patientName", value)} placeholder="Enter patient name" className="sm:col-span-2" /><TextField label="Age" value={currentAnswer.age} onChange={(value) => updateAnswer("age", value)} placeholder="e.g. 42" type="number" /><TextField label="Weight" value={currentAnswer.weight} onChange={(value) => updateAnswer("weight", value)} placeholder="e.g. 60 kg" /><TextField label="Drug name" required value={currentAnswer.drugName} onChange={(value) => updateAnswer("drugName", value)} placeholder="Lecturer placeholder" /><TextField label="Strength / dose" value={currentAnswer.strengthDose} onChange={(value) => updateAnswer("strengthDose", value)} placeholder="Enter response" /><TextField label="Dosage form" value={currentAnswer.dosageForm} onChange={(value) => updateAnswer("dosageForm", value)} placeholder="e.g. tablet" /><TextField label="Quantity" value={currentAnswer.quantity} onChange={(value) => updateAnswer("quantity", value)} placeholder="Enter response" /><TextField label="Route" value={currentAnswer.route} onChange={(value) => updateAnswer("route", value)} placeholder="Enter response" /><TextField label="Frequency" value={currentAnswer.frequency} onChange={(value) => updateAnswer("frequency", value)} placeholder="Enter response" /><TextField label="Timing" value={currentAnswer.timing} onChange={(value) => updateAnswer("timing", value)} placeholder="Enter response" /><TextField label="Duration" value={currentAnswer.duration} onChange={(value) => updateAnswer("duration", value)} placeholder="Enter response" /><TextField label="Signa / directions" value={currentAnswer.signa} onChange={(value) => updateAnswer("signa", value)} placeholder="Enter response" className="sm:col-span-2" /><div className="sm:col-span-2"><FieldLabel>Free-text prescription</FieldLabel><textarea value={currentAnswer.freeTextPrescription} onChange={(event) => updateAnswer("freeTextPrescription", event.target.value)} placeholder="Optional lecturer-defined free-text response" className="input-control min-h-[120px] resize-y" /></div></div><div className="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><button onClick={() => setActiveQuestion((current) => Math.max(1, current - 1))} disabled={activeQuestion === 1} className="secondary-button"><ArrowLeft size={15} /> Previous</button>{activeQuestion < 3 ? <button onClick={() => setActiveQuestion((current) => Math.min(3, current + 1))} className="primary-button">Save & next <ArrowRight size={15} /></button> : <button onClick={() => setShowSubmit(true)} className="primary-button"><Send size={15} /> Review & submit</button>}</div></div></div></section><aside className="order-3"><div className="space-y-5 lg:sticky lg:top-5"><div className="surface-card p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Gauge size={16} className="text-teal-600" /> Attempt health</div><div className="mt-5 space-y-4"><div><div className="flex justify-between text-xs"><span className="text-slate-500">Autosave</span><span className="font-bold text-teal-700">Active</span></div><div className="progress-track mt-2"><div className="progress-fill w-full" /></div></div><div><div className="flex justify-between text-xs"><span className="text-slate-500">Time remaining</span><span className="font-mono font-bold text-slate-800">{timer}</span></div><div className="progress-track mt-2"><div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.max(0, (secondsLeft / (15 * 60)) * 100)}%` }} /></div></div></div><div className="mt-5 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500"><strong className="text-slate-700">Tip:</strong> Empty fields are allowed until you are ready to review. Your answer key is never shown in the student interface.</div></div><div className="surface-card p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Flag size={16} className="text-amber-600" /> Assessment note</div><p className="mt-3 text-xs leading-5 text-slate-500">This is an academic assessment prototype. Do not use it to make real clinical prescribing decisions.</p><button onClick={() => onNavigate("/security")} className="mt-4 text-xs font-bold text-teal-700 hover:text-teal-900">Security & scope →</button></div></div></aside></div></main>{showSubmit && <div className="modal-backdrop"><div className="modal-card max-w-md p-6 sm:p-7"><div className="flex items-start justify-between"><div className="rounded-xl bg-teal-50 p-3 text-teal-700"><Send size={19} /></div><button onClick={() => setShowSubmit(false)} className="icon-button-light" aria-label="Close submit confirmation"><X size={17} /></button></div><h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-950">Submit this attempt?</h2><p className="mt-2 text-sm leading-6 text-slate-500">After submission, your responses will be locked and sent to the lecturer review queue. You can no longer edit this attempt.</p><div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="flex justify-between text-xs"><span className="text-slate-500">Attempt ID</span><span className="font-mono font-bold text-slate-800">{ATTEMPT_ID}</span></div><div className="mt-3 flex justify-between text-xs"><span className="text-slate-500">Cases with responses</span><span className="font-bold text-slate-800">{Object.values(answers).filter((answer) => Object.values(answer).some(Boolean)).length} / 3</span></div></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => setShowSubmit(false)} className="secondary-button">Keep editing</button><button onClick={onSubmit} className="primary-button"><CheckCircle2 size={15} /> Confirm submission</button></div></div></div>}</div>;
}

function SubmittedPage({ onNavigate, onSignOut }: { onNavigate: (path: string) => void; onSignOut: () => void }) {
  return <div className="min-h-screen bg-[#f6f8fb]"><AppHeader onNavigate={onNavigate} activePath="/submitted" studentEmail={DEMO_EMAIL} onSignOut={onSignOut} /><main className="mx-auto flex max-w-4xl flex-col items-center px-4 py-12 text-center sm:px-6 lg:py-20"><div className="success-orbit"><div className="success-orbit-inner"><CheckCircle2 size={33} /></div></div><p className="eyebrow mt-8 text-teal-700">Submission received</p><h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-slate-950">Your attempt is locked.</h1><p className="mt-4 max-w-lg text-sm leading-7 text-slate-500">The lecturer can now review your response. This prototype does not calculate or display a score to students.</p><div className="mt-9 grid w-full gap-4 sm:grid-cols-3"><div className="surface-card p-5"><div className="eyebrow text-slate-400">Attempt ID</div><div className="mt-2 font-mono text-lg font-bold text-slate-900">{ATTEMPT_ID}</div><button onClick={() => { navigator.clipboard?.writeText(ATTEMPT_ID); toast.success("Attempt ID copied"); }} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700"><Copy size={13} /> Copy ID</button></div><div className="surface-card p-5"><div className="eyebrow text-slate-400">Submitted</div><div className="mt-2 text-lg font-bold text-slate-900">23 Sep 2026</div><div className="mt-3 text-[11px] text-slate-500">10:02 local time</div></div><div className="surface-card p-5"><div className="eyebrow text-slate-400">Status</div><div className="mt-2 inline-flex items-center gap-2 text-lg font-bold text-teal-700"><span className="h-2 w-2 rounded-full bg-teal-500" /> Locked</div><div className="mt-3 text-[11px] text-slate-500">Awaiting lecturer review</div></div></div><div className="mt-7 w-full text-left"><Callout tone="warning" title="Assessment only">RxExam is not for real clinical prescribing or high-stakes examination use until institution-level authentication, secure backend, audit logging, and validation are implemented.</Callout></div><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={() => onNavigate("/security")} className="secondary-button"><ShieldCheck size={15} /> Review security model</button><button onClick={onSignOut} className="primary-button"><LogOut size={15} /> Return to sign in</button></div></main></div>;
}

function AdminShell({ activeTab, setActiveTab, onSignOut, children }: { activeTab: AdminTab; setActiveTab: (tab: AdminTab) => void; onSignOut: () => void; children: ReactNode }) {
  const items: Array<{ id: AdminTab; label: string; icon: ReactNode; count?: string }> = [{ id: "overview", label: "Overview", icon: <LayoutDashboard size={17} /> }, { id: "participants", label: "Participants", icon: <Users size={17} />, count: "248" }, { id: "attempts", label: "Attempts & review", icon: <ClipboardCheck size={17} />, count: "12" }, { id: "question-bank", label: "Question bank", icon: <BookOpen size={17} /> }, { id: "audit", label: "Audit log", icon: <History size={17} />, count: "4" }];
  return <div className="admin-layout"><aside className="admin-sidebar"><div className="flex items-center justify-between"><Brand /><button className="icon-button-dark lg:hidden" aria-label="Close navigation"><PanelLeftClose size={17} /></button></div><div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.05] p-3"><div className="flex items-center gap-3"><div className="admin-avatar">LM</div><div className="min-w-0"><div className="truncate text-xs font-bold text-white">Dr. Lestari M.</div><div className="truncate text-[10px] text-slate-500">Lecturer workspace</div></div><span className="ml-auto h-2 w-2 rounded-full bg-teal-400" /></div></div><div className="mt-8"><div className="eyebrow px-3 text-slate-600">Workspace</div><nav className="mt-3 space-y-1">{items.map((item) => <button key={item.id} onClick={() => setActiveTab(item.id)} className={cx("admin-nav-item", activeTab === item.id && "admin-nav-active")}><span>{item.icon}</span><span>{item.label}</span>{item.count && <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">{item.count}</span>}</button>)}</nav></div><div className="mt-auto pt-8"><div className="rounded-2xl border border-teal-400/15 bg-teal-400/[0.07] p-4"><ShieldCheck size={18} className="text-teal-300" /><div className="mt-3 text-xs font-bold text-white">Security posture</div><div className="mt-1 text-[10px] leading-4 text-slate-400">Prototype controls are visible. Server-side enforcement is pending.</div><button onClick={() => setActiveTab("audit")} className="mt-3 text-[10px] font-bold text-teal-300">View audit events →</button></div><button onClick={onSignOut} className="mt-5 flex items-center gap-2 px-3 text-xs font-bold text-slate-500 transition hover:text-white"><LogOut size={15} /> Sign out</button></div></aside><div className="admin-main"><header className="admin-topbar"><div className="flex items-center gap-3"><button className="icon-button-light lg:hidden" aria-label="Open navigation"><Menu size={18} /></button><div><div className="eyebrow text-slate-400">Lecturer workspace</div><div className="mt-1 text-sm font-bold text-slate-900">Prescription writing examination</div></div></div><div className="flex items-center gap-3"><PrototypeBadge /><div className="hidden h-5 w-px bg-slate-200 sm:block" /><button className="text-xs font-bold text-slate-500 hover:text-slate-900" onClick={() => setActiveTab("audit")}>Live audit</button></div></header><main className="admin-content">{children}</main></div></div>;
}

function AdminPage({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [participants, setParticipants] = useState(initialParticipants);
  const [showAdd, setShowAdd] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const [newParticipant, setNewParticipant] = useState({ nim: "", name: "", email: "" });
  const filteredParticipants = participants.filter((participant) => [participant.nim, participant.name, participant.email].join(" ").toLowerCase().includes(participantSearch.toLowerCase()));
  const addParticipant = (event: FormEvent) => { event.preventDefault(); if (!newParticipant.nim || !newParticipant.name || !newParticipant.email) return; setParticipants((current) => [...current, { ...newParticipant, status: "Invited", lastAccess: "Not yet" }]); setNewParticipant({ nim: "", name: "", email: "" }); setShowAdd(false); toast.success("Participant added to demo list"); };
  const statCards = [{ label: "Registered participants", value: "248", delta: "+18 this week", icon: <Users size={17} />, color: "teal" }, { label: "Active exam session", value: "01", delta: "12 attempts in queue", icon: <Clock3 size={17} />, color: "blue" }, { label: "Pending reviews", value: "12", delta: "Avg. 8 min / attempt", icon: <FileCheck2 size={17} />, color: "amber" }, { label: "Audit events", value: "04", delta: "0 critical flags", icon: <History size={17} />, color: "purple" }];
  return <AdminShell activeTab={tab} setActiveTab={setTab} onSignOut={onSignOut}>{tab === "overview" && <><div className="admin-page-heading"><div><p className="eyebrow text-teal-700">Wednesday · 23 September 2026</p><h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-slate-950">Good morning, Dr. Lestari.</h1><p className="mt-2 text-sm text-slate-500">Here’s the current pulse of your prescription-writing assessment.</p></div><button className="primary-button" onClick={() => setTab("participants")}><Plus size={16} /> Add participant</button></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statCards.map((stat) => <div className="surface-card p-5" key={stat.label}><div className="flex items-start justify-between"><div className={cx("stat-icon", `stat-icon-${stat.color}`)}>{stat.icon}</div><MoreHorizontal size={16} className="text-slate-300" /></div><div className="mt-6 font-display text-3xl font-bold tracking-tight text-slate-950">{stat.value}</div><div className="mt-1 text-xs font-semibold text-slate-700">{stat.label}</div><div className="mt-2 text-[11px] text-slate-400">{stat.delta}</div></div>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><div className="surface-card"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-5"><div><h2 className="text-sm font-bold text-slate-900">Live exam session</h2><p className="mt-1 text-xs text-slate-500">RX-SEP26 · Prescription writing assessment</p></div><span className="status-dot-label bg-teal-50 px-2.5 py-1 text-teal-700"><span className="status-dot" /> Open</span></div><div className="grid gap-6 p-5 sm:grid-cols-[1fr_0.8fr]"><div><div className="flex items-end justify-between"><div><div className="font-display text-4xl font-bold tracking-tight text-slate-950">186 <span className="text-lg font-semibold text-slate-400">/ 248</span></div><div className="mt-1 text-xs text-slate-500">participants started</div></div><div className="text-right"><div className="text-lg font-bold text-teal-700">75%</div><div className="text-[10px] text-slate-400">participation</div></div></div><div className="progress-track mt-5 h-2"><div className="progress-fill" style={{ width: "75%" }} /></div><div className="mt-5 flex gap-5 text-[11px] text-slate-500"><span><strong className="text-slate-800">12</strong> in progress</span><span><strong className="text-slate-800">174</strong> submitted</span></div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="eyebrow text-slate-400">Session controls</div><div className="mt-4 space-y-3">{[{ label: "Open registration", value: "On" }, { label: "Time limit", value: "15 minutes" }, { label: "Auto-submit", value: "Enabled" }].map((item) => <div key={item.label} className="flex items-center justify-between text-xs"><span className="text-slate-500">{item.label}</span><span className="font-bold text-slate-800">{item.value}</span></div>)}</div><button onClick={() => toast.info("Session controls are placeholders in this prototype")} className="secondary-button mt-5 w-full">Manage session <SlidersHorizontal size={14} /></button></div></div></div><div className="surface-card"><div className="border-b border-slate-100 px-5 py-5"><h2 className="text-sm font-bold text-slate-900">Recent submissions</h2><p className="mt-1 text-xs text-slate-500">Latest attempts entering the review queue</p></div><div className="divide-y divide-slate-100">{[{ id: "RX-26-0148", name: "Alya Prameswari", time: "2 min ago", score: "Pending" }, { id: "RX-26-0147", name: "Bima Satrya", time: "8 min ago", score: "Pending" }, { id: "RX-26-0146", name: "Dimas Raharjo", time: "16 min ago", score: "Reviewed" }].map((attempt) => <button key={attempt.id} onClick={() => { setSelectedAttempt(attempt.id); setTab("attempts"); }} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50"><div className="student-mini-avatar">{attempt.name.split(" ").map((name) => name[0]).join("")}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-slate-800">{attempt.name}</div><div className="mt-1 font-mono text-[10px] text-slate-400">{attempt.id} · {attempt.time}</div></div><span className={cx("text-[10px] font-bold", attempt.score === "Reviewed" ? "text-teal-700" : "text-amber-600")}>{attempt.score}</span></button>)}</div><button onClick={() => setTab("attempts")} className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-4 text-xs font-bold text-teal-700">View all attempts <ArrowRight size={14} /></button></div></div><div className="mt-6"><Callout tone="warning" title="Prototype security boundary">Participant, attempt, and audit data shown here is demo data in a static client. Connect server-side auth, database access controls, and institution-owned audit storage before real use.</Callout></div></>}{tab === "participants" && <div><div className="admin-page-heading"><div><p className="eyebrow text-teal-700">Roster management</p><h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-slate-950">Participants</h1><p className="mt-2 text-sm text-slate-500">Manage the NIM ↔ registered Gmail match used for student access.</p></div><div className="flex gap-2"><button className="secondary-button" onClick={() => toast.info("CSV import is a placeholder in this prototype")}><Download size={15} /> Import CSV</button><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={16} /> Add participant</button></div></div>{showAdd && <form onSubmit={addParticipant} className="surface-card mt-6 grid gap-4 p-5 sm:grid-cols-4 sm:items-end"><TextField label="NIM" value={newParticipant.nim} onChange={(value) => setNewParticipant({ ...newParticipant, nim: value })} placeholder="240810…" required /><TextField label="Student name" value={newParticipant.name} onChange={(value) => setNewParticipant({ ...newParticipant, name: value })} placeholder="Full name" required /><TextField label="Registered Gmail" value={newParticipant.email} onChange={(value) => setNewParticipant({ ...newParticipant, email: value })} placeholder="student@gmail.com" required type="email" /><div className="flex gap-2"><button type="button" onClick={() => setShowAdd(false)} className="secondary-button flex-1">Cancel</button><button type="submit" className="primary-button flex-1">Add</button></div></form>}<div className="surface-card mt-6 overflow-hidden"><div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center"><div><div className="text-sm font-bold text-slate-900">Registered participant list</div><div className="mt-1 text-xs text-slate-500">{participants.length} demo records · email matches are case-insensitive</div></div><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} className="input-control w-full pl-9 sm:w-[260px]" placeholder="Search NIM, name, email" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><tr><th className="px-5 py-3">Participant</th><th className="px-5 py-3">NIM</th><th className="px-5 py-3">Registered Google account</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Last access</th><th /></tr></thead><tbody className="divide-y divide-slate-100">{filteredParticipants.map((participant) => <tr key={participant.nim} className="text-xs"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="student-mini-avatar">{participant.name.split(" ").map((name) => name[0]).join("")}</div><span className="font-bold text-slate-800">{participant.name}</span></div></td><td className="px-5 py-4 font-mono text-slate-600">{participant.nim}</td><td className="px-5 py-4 text-slate-600">{participant.email}</td><td className="px-5 py-4"><span className={cx("rounded-full px-2 py-1 text-[10px] font-bold", participant.status === "Active" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700")}>{participant.status}</span></td><td className="px-5 py-4 text-slate-500">{participant.lastAccess}</td><td className="px-5 py-4 text-right"><button onClick={() => toast.info(`Participant ${participant.nim} is a demo record`)} className="icon-button-light"><MoreHorizontal size={15} /></button></td></tr>)}</tbody></table></div></div></div>}{tab === "attempts" && <div><div className="admin-page-heading"><div><p className="eyebrow text-teal-700">Assessment review</p><h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-slate-950">Attempts & review</h1><p className="mt-2 text-sm text-slate-500">Review submitted responses without exposing answer keys to students.</p></div><button className="secondary-button" onClick={() => toast.info("Export is a placeholder in this prototype")}><Download size={15} /> Export queue</button></div><div className="mt-6 grid gap-5 xl:grid-cols-[1fr_380px]"><div className="surface-card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><div className="text-sm font-bold text-slate-900">Review queue</div><div className="mt-1 text-xs text-slate-500">12 pending · sorted by submitted time</div></div><button className="icon-button-light"><SlidersHorizontal size={15} /></button></div><div className="divide-y divide-slate-100">{[{ id: "RX-26-0148", name: "Alya Prameswari", nim: "2408101017", status: "Pending review", time: "10:02" }, { id: "RX-26-0147", name: "Bima Satrya", nim: "2408101022", status: "Pending review", time: "09:56" }, { id: "RX-26-0146", name: "Dimas Raharjo", nim: "2408101044", status: "Reviewed", time: "09:48" }, { id: "RX-26-0145", name: "Citra Kusuma", nim: "2408101031", status: "Pending review", time: "09:42" }].map((attempt) => <button key={attempt.id} onClick={() => setSelectedAttempt(attempt.id)} className={cx("flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50", selectedAttempt === attempt.id && "bg-teal-50/50")}><div className="student-mini-avatar">{attempt.name.split(" ").map((name) => name[0]).join("")}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-xs font-bold text-slate-800">{attempt.name}</span><span className={cx("rounded-full px-2 py-0.5 text-[9px] font-bold", attempt.status === "Reviewed" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700")}>{attempt.status}</span></div><div className="mt-1 font-mono text-[10px] text-slate-400">{attempt.id} · NIM {attempt.nim}</div></div><span className="text-[10px] text-slate-400">{attempt.time}</span><ArrowRight size={14} className="text-slate-300" /></button>)}</div></div><div className="surface-card p-5">{selectedAttempt ? <><div className="flex items-center justify-between"><div><div className="eyebrow text-teal-700">Selected attempt</div><h2 className="mt-1 font-display text-xl font-bold text-slate-950">{selectedAttempt}</h2></div><button onClick={() => setSelectedAttempt(null)} className="icon-button-light"><X size={15} /></button></div><div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-800">Alya Prameswari</div><div className="mt-1 text-[11px] text-slate-500">NIM 2408101017 · demo.student@gmail.com</div></div><div className="mt-5 space-y-3">{[{ label: "Case 01", state: "Response present" }, { label: "Case 02", state: "Response present" }, { label: "Case 03", state: "Response present" }].map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-100 p-3"><span className="text-xs font-bold text-slate-700">{item.label}</span><span className="flex items-center gap-1.5 text-[10px] font-bold text-teal-700"><CheckCircle2 size={13} /> {item.state}</span></div>)}</div><div className="mt-5 border-t border-slate-100 pt-5"><div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">Review status</div><div className="mt-2 flex items-center justify-between"><span className="text-sm font-bold text-slate-800">Not yet scored</span><span className="font-mono text-xs text-slate-400">0 / 100</span></div></div><button onClick={() => toast.info("Review editor is a placeholder; answer keys remain lecturer-only")} className="primary-button mt-6 w-full"><FileCheck2 size={15} /> Open review editor</button></> : <div className="flex min-h-[420px] flex-col items-center justify-center text-center"><div className="rounded-2xl bg-slate-100 p-4 text-slate-400"><ClipboardCheck size={24} /></div><h2 className="mt-4 text-sm font-bold text-slate-800">Select an attempt</h2><p className="mt-2 max-w-[220px] text-xs leading-5 text-slate-500">Choose a submission from the queue to inspect its response structure and review state.</p></div>}</div></div></div>}{tab === "question-bank" && <div><div className="admin-page-heading"><div><p className="eyebrow text-teal-700">Content authoring</p><h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-slate-950">Question bank</h1><p className="mt-2 text-sm text-slate-500">Lecturer-only placeholders for future secure vignette and rubric authoring.</p></div><button className="primary-button" onClick={() => toast.info("Question authoring is a placeholder in this prototype")}><Plus size={16} /> New question</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{questions.map((item) => <div key={item.number} className="surface-card p-5"><div className="flex items-start justify-between"><div className="rounded-xl bg-teal-50 p-2.5 text-teal-700"><FileQuestion size={18} /></div><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Placeholder</span></div><div className="mt-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{item.label}</div><h2 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h2><p className="mt-3 text-xs leading-5 text-slate-500">Vignette and rubric will be authored by the lecturer. Student answer keys are not exposed.</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] text-slate-400"><span>Last edited · never</span><button onClick={() => toast.info("Protected authoring is not connected")} className="font-bold text-teal-700">Configure →</button></div></div>)}</div><div className="mt-6"><Callout tone="info" title="Protected answer-key design">In the production architecture, vignettes, rubrics, and answer keys must be stored server-side with lecturer-only access controls. This static demo intentionally contains no answer key.</Callout></div></div>}{tab === "audit" && <div><div className="admin-page-heading"><div><p className="eyebrow text-teal-700">Traceability</p><h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-slate-950">Audit log</h1><p className="mt-2 text-sm text-slate-500">A visible record of identity, access, autosave, and tab visibility events.</p></div><button className="secondary-button" onClick={() => toast.info("Audit export is a placeholder in this prototype")}><Download size={15} /> Export log</button></div><div className="surface-card mt-6 overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><div className="text-sm font-bold text-slate-900">Recent events</div><div className="mt-1 text-xs text-slate-500">Demo session · {ATTEMPT_ID}</div></div><span className="status-dot-label bg-teal-50 px-2.5 py-1 text-teal-700"><span className="status-dot" /> Healthy</span></div><div className="divide-y divide-slate-100">{auditEvents.map((event) => <div key={event.time + event.event} className="flex gap-4 p-5"><div className={cx("audit-icon", event.type === "warning" ? "audit-icon-warning" : event.type === "success" ? "audit-icon-success" : "audit-icon-info")}>{event.type === "warning" ? <AlertTriangle size={15} /> : event.type === "success" ? <Check size={15} /> : <RefreshCw size={15} />}</div><div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-800">{event.event}</div><div className="mt-1 text-[11px] text-slate-500">{event.detail}</div></div><div className="font-mono text-[10px] text-slate-400">{event.time}</div></div>)}</div></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="surface-card p-5"><Database size={18} className="text-teal-600" /><div className="mt-4 text-xs font-bold text-slate-800">Server-side log</div><p className="mt-1 text-[11px] leading-4 text-slate-500">Required in production. Not connected in this static prototype.</p></div><div className="surface-card p-5"><LockKeyhole size={18} className="text-teal-600" /><div className="mt-4 text-xs font-bold text-slate-800">Role protected</div><p className="mt-1 text-[11px] leading-4 text-slate-500">Admin UI is gated by a separate demo role session.</p></div><div className="surface-card p-5"><Fingerprint size={18} className="text-teal-600" /><div className="mt-4 text-xs font-bold text-slate-800">Minimal data</div><p className="mt-1 text-[11px] leading-4 text-slate-500">Only demo NIM, name, and registered Gmail are displayed.</p></div></div></div>}</AdminShell>;
}

function SecurityPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const principles = [{ icon: <ShieldCheck size={19} />, title: "HTTPS everywhere", text: "Encrypt transport between the browser and institution-controlled services. Never downgrade to plain HTTP." }, { icon: <KeyRound size={19} />, title: "Server-side validation", text: "Validate Google identity, NIM match, roles, attempts, and submission state on the server — not only in the browser." }, { icon: <Users size={19} />, title: "Role separation", text: "Student and lecturer sessions use separate authentication and authorization paths. /admin is not a permission boundary." }, { icon: <LockKeyhole size={19} />, title: "Secure sessions", text: "Use short-lived, secure, HttpOnly sessions with CSRF protection and controlled sign-out in production." }, { icon: <Database size={19} />, title: "Minimal student data", text: "Keep only the roster fields needed for access and review. Apply row-level access controls to attempts and participant records." }, { icon: <FileCheck2 size={19} />, title: "Protected answer keys", text: "Store keys and rubrics server-side. Never ship them in the student bundle or expose them through client APIs." }, { icon: <History size={19} />, title: "Audit logging", text: "Record identity matching, access changes, autosaves, submissions, and tab visibility as traceable server-side events." }, { icon: <Fingerprint size={19} />, title: "No secret keys in browser", text: "Client code should contain no private credentials, signing keys, database passwords, trackers, advertising, or payment logic." }];
  return <div className="min-h-screen bg-[#f6f8fb]"><AppHeader onNavigate={onNavigate} activePath="/security" studentEmail="" onSignOut={() => undefined} /><main className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8"><div className="max-w-3xl"><p className="eyebrow text-teal-700">Security model</p><h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.045em] text-slate-950 sm:text-5xl">Trust is a system, not a button.</h1><p className="mt-5 text-base leading-8 text-slate-500">RxExam is designed around a simple principle: the browser is a user interface, not the authority. This page makes the production boundary explicit so a prototype never masquerades as a secure exam system.</p></div><div className="mt-8"><Callout tone="warning" title="Prototype — not for real clinical prescribing or high-stakes examination use until institution-level authentication, secure backend, audit logging, and validation are implemented.">This build uses demo data and client-side simulations only. It does not claim 100% anti-cheating, browser monitoring, or clinical correctness.</Callout></div><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{principles.map((principle) => <div key={principle.title} className="surface-card security-card p-5"><div className="security-icon">{principle.icon}</div><h2 className="mt-5 text-sm font-bold text-slate-900">{principle.title}</h2><p className="mt-2 text-xs leading-5 text-slate-500">{principle.text}</p></div>)}</div><div className="mt-8 grid gap-5 lg:grid-cols-2"><div className="dark-panel"><div className="eyebrow text-teal-300">Authentication sequence</div><div className="mt-5 space-y-4">{[{ step: "01", title: "Google identity", text: "Accept ordinary personal Gmail authentication through a trusted server-side OAuth flow." }, { step: "02", title: "NIM match", text: "Match the authenticated email + entered NIM against the admin-maintained participant list." }, { step: "03", title: "Role session", text: "Issue a scoped student session. Lecturer sessions use a separate role and authorization path." }, { step: "04", title: "Attempt access", text: "Check active session, session window, and attempt ownership for every protected action." }].map((item) => <div key={item.step} className="flex gap-4"><div className="font-mono text-[11px] font-bold text-teal-300">{item.step}</div><div><div className="text-sm font-bold text-white">{item.title}</div><p className="mt-1 text-xs leading-5 text-slate-400">{item.text}</p></div></div>)}</div></div><div className="surface-card p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><TabletSmartphone size={19} /></div><div><div className="text-sm font-bold text-slate-900">What this prototype demonstrates</div><div className="mt-1 text-xs text-slate-500">UI and interaction contract, not a security claim</div></div></div><div className="mt-6 space-y-3">{["Student Google → NIM verification flow", "Separate admin login and gated dashboard", "Timed attempt, autosave state, and submit lock", "Audit event visibility without anti-cheating claims", "Lecturer placeholders without answer-key exposure"].map((item) => <div key={item} className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle2 size={14} className="shrink-0 text-teal-600" />{item}</div>)}</div><button onClick={() => onNavigate("/login")} className="secondary-button mt-7 w-full">Return to sign in <ArrowRight size={14} /></button></div></div></main></div>;
}

function App() {
  const [path, setPath] = useState(window.location.pathname || "/login");
  const [googleEmail, setGoogleEmail] = useState("");
  const [student, setStudent] = useState<{ nim: string; name: string } | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState("");
  const [attemptId, setAttemptId] = useState("");
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname || "/login");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email?.toLowerCase() || "";
      if (email && path === "/login") { setGoogleEmail(email); navigate("/verify-student"); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email?.toLowerCase() || "";
      if (email) setGoogleEmail(email);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const navigate = (nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const signOut = () => {
    localStorage.removeItem(EXAM_DRAFT_KEY);
    void supabaseSignOut();
    setGoogleEmail(""); setStudent(null); setExamStarted(false); setSubmitted(false); setAttemptId(""); setDbQuestions([]); navigate("/login");
  };

  const startGoogleLogin = () => {
    setAuthError("");
    void signInWithGoogle().catch((e) => setAuthError(e instanceof Error ? e.message : "Google sign-in could not be started."));
  };

  const view = useMemo(() => {
    if (path === "/security") return <SecurityPage onNavigate={navigate} />;
    if (path === "/verify-student") return googleEmail ? <VerifyStudentPage email={googleEmail} onVerified={async (result) => { setStudent({ nim: result.participant.nim, name: result.participant.name }); setAttemptId(result.attempt.id); try { const payload = await getExamPayload(result.attempt.id); setDbQuestions(payload.questions || []); navigate("/exam"); } catch { setAuthError("The exam could not be loaded."); } }} onBack={() => { setGoogleEmail(""); navigate("/login"); }} /> : <LoginPage onStudentLogin={startGoogleLogin} error={authError} />;
    if (path === "/exam") {
      if (!student) return <LoginPage onStudentLogin={startGoogleLogin} error={authError} />;
      return examStarted ? <ExamPage studentEmail={googleEmail} attemptId={attemptId} dbQuestions={dbQuestions} onNavigate={navigate} onSubmit={async () => { try { await submitExam(attemptId); localStorage.removeItem(EXAM_DRAFT_KEY); setSubmitted(true); navigate("/submitted"); } catch { setAuthError("Submission could not be confirmed by the server."); } }} /> : <ExamInstructions onBegin={() => setExamStarted(true)} />;
    }
    if (path === "/submitted") return submitted && student ? <SubmittedPage onNavigate={navigate} onSignOut={signOut} /> : <LoginPage onStudentLogin={startGoogleLogin} error={authError} />;
    return <LoginPage onStudentLogin={startGoogleLogin} error={authError} />;
  }, [examStarted, googleEmail, path, student, submitted]);

  return <><Toaster position="top-right" richColors />{view}</>;
}

export default function AppWithTheme() {
  return <ThemeProvider defaultTheme="light"><App /></ThemeProvider>;
}
