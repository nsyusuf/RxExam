import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/verify-student` },
  });
  if (error) throw error;
}

export async function verifyStudent(nim: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("verify_student", { p_nim: nim.trim() });
  if (error) throw error;
  return data as any;
}

export async function getExamPayload(attemptId: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("get_exam_payload", { p_attempt_id: attemptId });
  if (error) throw error;
  return data as any;
}

export async function saveAnswer(attemptId: string, questionId: string, answer: unknown) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("save_answer", { p_attempt_id: attemptId, p_question_id: questionId, p_answer: answer });
  if (error) throw error;
  return data as any;
}

export async function submitExam(attemptId: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("submit_exam", { p_attempt_id: attemptId });
  if (error) throw error;
  return data as any;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}
