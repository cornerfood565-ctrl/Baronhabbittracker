"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!isSupabaseConfigured) {
      setMessage("Supabase is not configured yet. Add the two NEXT_PUBLIC environment variables in your local .env.local and Vercel project settings.");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabase();
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin }
          });

      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("Account created. Check your email to confirm your address, then sign in.");
      } else {
        router.replace("/");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090c10] px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[#929ba6] hover:text-white"><ArrowLeft size={16}/> Back to Baron Habits</Link>
        <section className="rounded-2xl border border-[#303740] bg-[#11161c] p-7 shadow-2xl">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#65717e] bg-gradient-to-br from-[#596573] to-[#202830] text-lg font-black">B</div>
            <div><div className="text-sm font-bold tracking-[.18em]">BARON</div><div className="text-[10px] tracking-[.25em] text-[#8e99a5]">HABITS</div></div>
          </div>
          <h1 className="text-2xl font-semibold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-[#929ba6]">Sign in to keep your habits synced to your account.</p>

          {!isSupabaseConfigured && <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">Supabase setup is incomplete. Add your Project URL and publishable key as environment variables before using account features.</div>}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-xs text-[#aeb7c1]">Email address
              <span className="mt-2 flex items-center gap-2 rounded-xl border border-[#343b44] bg-[#0c1116] px-3"><Mail size={16} className="text-[#87919c]"/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" placeholder="you@example.com"/></span>
            </label>
            <label className="block text-xs text-[#aeb7c1]">Password
              <span className="mt-2 flex items-center gap-2 rounded-xl border border-[#343b44] bg-[#0c1116] px-3"><LockKeyhole size={16} className="text-[#87919c]"/><input required minLength={6} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" placeholder="At least 6 characters"/></span>
            </label>
            {message && <p role="status" className="rounded-xl border border-[#414a55] bg-[#20262d] p-3 text-xs leading-5 text-[#d2d9e0]">{message}</p>}
            <button disabled={busy || !isSupabaseConfigured} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d3dae1] px-4 py-3 text-sm font-semibold text-[#11151a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
              <ShieldCheck size={16}/>{busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button onClick={()=>{setMode(mode === "signin" ? "signup" : "signin");setMessage("");}} className="mt-5 w-full text-center text-xs text-[#aeb7c1] hover:text-white">
            {mode === "signin" ? "New to Baron Habits? Create an account" : "Already have an account? Sign in"}
          </button>
        </section>
      </div>
    </main>
  );
}
