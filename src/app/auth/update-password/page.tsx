"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getBrowserClient, humanizeAuthError } from "@/lib/supabase-browser";

/**
 * Landing page for the password-reset link. By the time the user arrives here
 * the recovery token in the URL has already been exchanged for a session by
 * /auth/callback, so all that's left is setting the new password.
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const valid = password.length >= 8 && password === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;

    const supabase = getBrowserClient(true);
    if (!supabase) {
      setError("Supabase isn't configured. See the README.");
      return;
    }

    setBusy(true);
    setError(null);

    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (err) {
      setError(humanizeAuthError(err.message));
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/app"), 1200);
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-sky-wash px-6 py-16">
      <div className="w-full max-w-[380px]">
        <Link
          href="/"
          className="block text-center font-display text-[26px] font-extrabold tracking-tight"
        >
          bridge<span className="text-lime">now</span>
        </Link>

        <div className="mt-6 rounded-[28px] bg-white px-8 py-8 shadow-block">
          {done ? (
            <p className="text-center text-sm text-sky-deep/70">
              Password updated. Taking you to your dashboard…
            </p>
          ) : (
            <>
              <h1 className="display text-[20px] text-sky-deep">Set a new password</h1>

              <form onSubmit={submit} className="mt-5 space-y-2">
                <Input
                  id="new-password"
                  label="New password"
                  value={password}
                  onValueChange={setPassword}
                  autoComplete="new-password"
                />
                <Input
                  id="confirm-password"
                  label="Confirm password"
                  value={confirm}
                  onValueChange={setConfirm}
                  autoComplete="new-password"
                />

                {confirm.length > 0 && password !== confirm && (
                  <p className="pt-1 text-[12px] text-hot-deep">Passwords don&apos;t match.</p>
                )}

                <button
                  type="submit"
                  disabled={!valid || busy}
                  className="btn bg-sky-deep text-white sweep mt-4 w-full"
                >
                  {busy ? "Saving…" : "Update password"}
                </button>
              </form>

              {error && (
                <p role="alert" className="mt-4 text-center text-[13px] text-hot-deep">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Input({
  id,
  label,
  value,
  onValueChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  autoComplete: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="password"
        value={value}
        placeholder=" "
        autoComplete={autoComplete}
        onChange={(e) => onValueChange(e.target.value)}
        className="peer h-[52px] w-full rounded-xl border border-sky-deep/15 bg-sky-pale/40 px-3.5 pb-1.5 pt-5
                   text-[14px] text-sky-deep focus:border-sky focus:bg-white focus:outline-none"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3.5 top-[10px] text-[11px] text-sky-deep/50
                   transition-all duration-150
                   peer-placeholder-shown:top-[17px] peer-placeholder-shown:text-[14px]
                   peer-focus:top-[9px] peer-focus:text-[11px]"
      >
        {label}
      </label>
    </div>
  );
}
