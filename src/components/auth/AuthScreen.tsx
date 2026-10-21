"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { LazyObject3D } from "@/components/three/LazyObject3D";
import { RainbowBand } from "@/components/ui/RainbowBand";
import type { Audience } from "@/config/plans.types";
import { getBrowserClient, humanizeAuthError, isSupabaseConfigured } from "@/lib/supabase-browser";

/**
 * Auth, as a split screen.
 *
 * Left: the pitch — gradient wash, particles, a Passport sitting in the dark,
 * so signing up feels like being issued something.
 * Right: the form, on glass.
 *
 * Email policy: one "account created" notice at sign-up, nothing on login.
 */

type Mode = "signin" | "signup" | "forgot";
const MIN_PASSWORD = 8;

export function AuthScreen() {
  const params = useSearchParams();
  const router = useRouter();

  const initialRole = (params.get("role") === "brand" ? "brand" : "creator") as Audience;
  const next = params.get("next");

  const [role, setRole] = useState<Audience>(initialRole);
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signin" ? "signin" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const passwordValid = password.length >= MIN_PASSWORD;
  const canSubmit =
    mode === "forgot"
      ? emailValid
      : emailValid && passwordValid && (mode === "signin" || fullName.trim().length > 1);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;

    const supabase = getBrowserClient(remember);
    if (!supabase) {
      setError("Supabase isn't configured yet. Add the two NEXT_PUBLIC_SUPABASE_* vars to .env and restart.");
      return;
    }

    setBusy(true);
    setError(null);
    const destination = next ?? "/app";
    const origin = window.location.origin;

    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(destination)}`,
            data: { role, full_name: fullName.trim() },
          },
        });
        if (err) throw err;

        if (data.session) {
          try {
            await fetch("/api/auth/signup-notify", { method: "POST" });
          } catch {
            /* an email failure must not block sign-up */
          }
          await supabase.auth.signOut();
          setSignedUpEmail(email);
          setMode("signin");
          setPassword("");
          return;
        }

        setNotice({
          title: "Confirm your email",
          body: `Supabase still has email confirmation switched on, so a link went to ${email}. Turn it off under Authentication → Sign In / Providers → Email to skip this step.`,
        });
      } else if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push(destination);
        router.refresh();
        return;
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/update-password`,
        });
        if (err) throw err;
        setNotice({
          title: "Check your inbox",
          body: `If an account exists for ${email}, a reset link is on its way.`,
        });
      }
    } catch (err) {
      setError(humanizeAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setNotice(null);
    setSignedUpEmail(null);
    setPassword("");
  }

  return (
    <main className="relative grid min-h-[100svh] lg:grid-cols-2">
      <Showcase role={role} />

      <section className="relative flex items-center justify-center bg-white px-6 py-14">
        <div className="w-full max-w-[400px]">
          <Link
            href="/"
            className="mb-8 block text-center display text-[26px] lowercase tracking-tight text-sky-deep lg:hidden"
          >
            bridge<span className="text-hot">now</span>
          </Link>

          {notice ? (
            <div className="rounded-[28px] border border-sky-deep/10 bg-white p-8 shadow-block">
              <Notice {...notice} onBack={() => switchMode("signin")} />
            </div>
          ) : (
            <>
              <div className="rounded-[28px] border border-sky-deep/10 bg-white p-8 shadow-block">
                {signedUpEmail && (
                  <div className="mb-6 rounded-xl border border-lime-deep/40 bg-lime/20 px-4 py-3">
                    <p className="display text-[13px] text-sky-deep">
                      Account created
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-sky-deep/75">
                      Log in with the password you just set. A confirmation went to{" "}
                      <span className="font-semibold text-sky-deep">{signedUpEmail}</span>.
                    </p>
                  </div>
                )}

                <h1 className="display text-[26px] text-sky-deep">
                  {mode === "signup" ? "Create your account" : mode === "signin" ? "Welcome back" : "Reset password"}
                </h1>
                <p className="mt-2 text-sm text-sky-deep/70">
                  {mode === "signup"
                    ? "One minute. No card needed to join."
                    : mode === "signin"
                      ? "Pick up where you left off."
                      : "We'll email you a link to set a new one."}
                </p>

                {mode !== "forgot" && <RoleToggle value={role} onChange={setRole} />}

                <form onSubmit={submit} className="mt-6 space-y-2.5">
                  {mode === "signup" && (
                    <Field id="full-name" label="Full name" value={fullName} onValueChange={setFullName} type="text" autoComplete="name" />
                  )}
                  <Field id="email" label="Email address" value={email} onValueChange={setEmail} type="email" autoComplete="email" required />

                  {mode !== "forgot" && (
                    <div className="relative">
                      <Field
                        id="password"
                        label="Password"
                        value={password}
                        onValueChange={setPassword}
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-[19px] text-[11px] font-bold uppercase tracking-[0.1em] text-sky-deep/50 hover:text-sky-deep"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  )}

                  {mode === "signup" && (
                    <p className="pt-0.5 text-[12px] text-sky-deep/55">At least {MIN_PASSWORD} characters.</p>
                  )}

                  {mode !== "forgot" && (
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-sky-deep/75">
                        <input
                          id="remember"
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-sky-deep"
                        />
                        Keep me signed in
                      </label>
                      {mode === "signin" && (
                        <button type="button" onClick={() => switchMode("forgot")} className="text-[13px] font-semibold text-hot hover:text-hot-deep">
                          Forgot?
                        </button>
                      )}
                    </div>
                  )}

                  <button type="submit" disabled={!canSubmit || busy} className="btn bg-sky-deep text-white sweep mt-4 w-full">
                    {busy ? "Working…" : mode === "signup" ? "Create account" : mode === "signin" ? "Log in" : "Send reset link"}
                  </button>
                </form>

                {error && (
                  <p role="alert" className="mt-4 rounded-xl border border-hot-deep/30 bg-hot/10 px-4 py-2.5 text-center text-[13px] text-hot-deep">
                    {error}
                  </p>
                )}
              </div>

              {mode !== "forgot" && (
                <div className="mt-3 rounded-[24px] border border-sky-deep/10 bg-white px-8 py-5 text-center shadow-pill">
                  <p className="text-sm text-sky-deep/75">
                    {mode === "signup" ? "Have an account?" : "New to BridgeNow?"}{" "}
                    <button onClick={() => switchMode(mode === "signup" ? "signin" : "signup")} className="font-bold text-hot hover:text-hot-deep">
                      {mode === "signup" ? "Log in" : "Sign up"}
                    </button>
                  </p>
                </div>
              )}
            </>
          )}

          {!isSupabaseConfigured() && (
            <p className="mt-4 rounded-xl border border-lime-deep/40 bg-lime/20 px-4 py-2.5 text-[12px] text-sky-deep">
              Supabase env vars missing — auth is inactive. See the README.
            </p>
          )}

          <p className="mt-8 text-center text-[12px] text-sky-deep/55">
            <Link href="/" className="hover:text-sky-deep">Back to BridgeNow</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

// ──────────────────────────── Showcase ───────────────────────────────

function Showcase({ role }: { role: Audience }) {
  return (
    <section className="relative hidden overflow-hidden bg-sky-wash lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2
                   bg-[radial-gradient(60%_80%_at_20%_100%,rgba(255,255,255,0.4),transparent_60%)]"
      />

      {/* Objects breaking into the frame, as on the landing page */}
      <LazyObject3D
        scene="ribbon"
        spin={0.2}
        className="pointer-events-none absolute -right-28 -top-16 h-[26rem] w-[26rem] opacity-90"
      />
      <LazyObject3D
        scene="asterisk"
        spin={0.45}
        className="pointer-events-none absolute right-[16%] top-[42%] h-32 w-32 opacity-85"
      />
      <LazyObject3D
        scene="coins"
        spin={0.3}
        className="pointer-events-none absolute left-[6%] bottom-[22%] h-40 w-40 opacity-85"
      />

      <Link href="/" aria-label="BridgeNow — home" className="relative flex w-fit items-center">
        <Image src="/logo.png" alt="BridgeNow" width={819} height={291} className="h-7 w-auto" />
      </Link>

      <div className="relative">
        <h2 className="max-w-md display text-[clamp(2.4rem,4vw,3.6rem)] leading-[0.92] text-lime">
          {role === "creator" ? (
            <>
              GET YOUR
              <br />
              PASSPORT.
            </>
          ) : (
            <>
              FIND THE
              <br />
              RIGHT CREATORS.
            </>
          )}
        </h2>
        <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-white/85">
          {role === "creator"
            ? "Verified reach, niche and region on one card — carried into every brand pitch you make."
            : "A regional, niche-filtered pool of micro-creators, with campaign tooling built around it."}
        </p>

        {/* The card has to switch with the role too. It used to be a hardcoded
            Creator Passport, so a brand signing up was shown a creator's
            artefact — the one thing on this page that is not theirs. */}
        {role === "creator" ? (
          <div className="mt-10 w-fit rounded-[20px] bg-[linear-gradient(150deg,#FF6BD8,#C80092_45%,#7A2499)] p-[1.5px] shadow-block">
            <div className="w-[300px] rounded-[19px] bg-[linear-gradient(165deg,#C80092,#8E0068_52%,#3A1049)] p-5">
              <p className="display text-[13px] tracking-[0.1em] text-white">CREATOR PASSPORT</p>
              <p className="mt-5 display text-[16px] text-white">AANYA KAPOOR</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-white/70">
                Creator Plus · Punjab · 48.2K
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-10 w-fit rounded-[20px] bg-[linear-gradient(150deg,#9FD2FF,#2F6BFF_45%,#1B2A6E)] p-[1.5px] shadow-block">
            <div className="w-[300px] rounded-[19px] bg-[linear-gradient(165deg,#1B2A6E,#101A44_52%,#070C24)] p-5">
              <p className="display text-[13px] tracking-[0.1em] text-white">CAMPAIGN SHORTLIST</p>
              <p className="mt-5 display text-[16px] text-white">24 CREATORS MATCHED</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-white/70">
                Punjab · Lifestyle · 10K–80K reach
              </p>
              <div className="mt-4 flex -space-x-2">
                {["#FF2EC4", "#D7FF3E", "#8B45E8", "#6FD2FF", "#FF8ACF"].map((c) => (
                  <span
                    key={c}
                    aria-hidden
                    className="h-6 w-6 rounded-full border-2 border-[#101A44]"
                    style={{ background: c }}
                  />
                ))}
                <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#101A44] bg-white/15 font-mono text-[8px] text-white">
                  +19
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="relative font-mono text-[10px] uppercase tracking-[0.24em] text-white/70">
        Connect. Collaborate. Grow.
      </p>
    </section>
  );
}

// ───────────────────────────── Pieces ────────────────────────────────

const ROLE_COPY: Record<Audience, string> = { creator: "I'm a Creator", brand: "I'm a Brand" };

function RoleToggle({ value, onChange }: { value: Audience; onChange: (a: Audience) => void }) {
  return (
    <div role="radiogroup" aria-label="Choose your role" className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-sky-pale p-1">
      {(["creator", "brand"] as const).map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(r)}
            className={`rounded-full py-2.5 font-display text-[12px] font-bold uppercase tracking-[0.1em] transition-all duration-300
                        ${active ? "bg-sky-deep text-white" : "text-sky-deep/60 hover:text-sky-deep"}`}
          >
            {ROLE_COPY[r]}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onValueChange,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div className="relative">
      <input
        {...rest}
        id={id}
        value={value}
        placeholder=" "
        onChange={(e) => onValueChange(e.target.value)}
        className="peer h-[54px] w-full rounded-xl border border-sky-deep/15 bg-sky-pale/40 px-3.5 pb-1.5 pt-5
                   text-[14px] text-sky-deep transition-colors focus:border-sky focus:bg-white focus:outline-none"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3.5 top-[10px] text-[11px] text-sky-deep/50 transition-all duration-150
                   peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-[14px]
                   peer-focus:top-[10px] peer-focus:text-[11px]"
      >
        {label}
      </label>
    </div>
  );
}

function Notice({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  return (
    <div className="py-2 text-center">
      <h2 className="display text-[20px] text-sky-deep">{title}</h2>
      <p className="mt-2.5 text-[13px] leading-relaxed text-sky-deep/75">{body}</p>
      <button onClick={onBack} className="mt-6 text-[13px] font-bold text-hot hover:text-hot-deep">
        Back to log in
      </button>
    </div>
  );
}
