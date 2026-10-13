/**
 * LoginScreen — The first screen the user sees.
 *
 * A3 upgrade: this is now a REAL login. Two modes:
 *   • Log in          → POST /api/auth/login
 *   • Create account  → POST /api/auth/signup (consent box required)
 *
 * The Python backend passes the email + password to Supabase Auth.
 * Ebb never stores passwords itself, and only keeps the session token
 * in this browser tab's sessionStorage.
 */
import { useState, type FormEvent } from "react";
import { Mail, Lock, ShieldCheck, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { Notice } from "@/components/Notice";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { LoginNotice, Session } from "@/types";

type Mode = "login" | "signup";

interface LoginScreenProps {
  notice: LoginNotice;
  onAuthenticated: (session: Session) => Promise<void>;
}

export function LoginScreen({ notice, onAuthenticated }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState({ email: false, password: false });

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);
  const [dismissedNotice, setDismissedNotice] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = "We need your email to continue.";
    } else if (!isValidEmail(email)) {
      newErrors.email = "That doesn't look like a valid email — try again?";
    }
    if (!password) {
      newErrors.password = "Please enter your password (8+ characters).";
    } else if (password.length < 8) {
      newErrors.password = "Almost there — passwords need at least 8 characters.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid =
    isValidEmail(email) && password.length >= 8 && (mode === "login" || consent);

  const switchMode = (next: Mode) => {
    setMode(next);
    setServerError(null);
    setConfirmEmailSent(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!validate() || !isFormValid) return;

    setSubmitting(true);
    setServerError(null);
    setDismissedNotice(true);
    try {
      const result =
        mode === "signup"
          ? await api.signup(email.trim(), password)
          : await api.login(email.trim(), password);

      if (result.status === "confirm_email") {
        setConfirmEmailSent(true);
        setMode("login");
        setSubmitting(false);
        return;
      }
      await onAuthenticated(result.session);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const showError = (field: "email" | "password"): string | undefined =>
    touched[field] ? errors[field] : undefined;

  /* Message carried over from another screen (wiped / expired / logged out) */
  const carriedNotice =
    !dismissedNotice && notice
      ? notice.kind === "wiped"
        ? `Your data has been wiped. ${notice.checkIns} check-in${notice.checkIns === 1 ? "" : "s"} and your saved bills were deleted from Ebb's database.`
        : notice.kind === "expired"
          ? "Your session ended. Please log in again."
          : "You've been logged out. See you next time!"
      : null;

  return (
    <div className="animate-slide-up px-6 py-10 flex flex-col min-h-screen">
      {/* Brand header with wave motif */}
      <header className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <svg width="120" height="32" viewBox="0 0 120 32" fill="none" aria-hidden="true">
            <path d="M0 16C10 16 10 6 20 6C30 6 30 26 40 26C50 26 50 6 60 6C70 6 70 26 80 26C90 26 90 6 100 6C110 6 110 16 120 16" stroke="#0F766E" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <path d="M0 22C10 22 10 12 20 12C30 12 30 28 40 28C50 28 50 12 60 12C70 12 70 28 80 28C90 28 90 12 100 12C110 12 110 22 120 22" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-navy tracking-tight">Ebb</h1>
        <p className="text-slate mt-2 text-base">Know your safe-to-spend</p>
      </header>

      {/* Log in / Create account switch */}
      <div
        role="tablist"
        aria-label="Choose how to continue"
        className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-xl bg-slate-light/10"
      >
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={cn(
              "h-10 rounded-lg text-sm font-semibold transition-all",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              mode === m ? "bg-white text-navy shadow-sm" : "text-slate hover:text-navy"
            )}
          >
            {m === "login" ? "Log in" : "Create account"}
          </button>
        ))}
      </div>

      {carriedNotice && (
        <Notice tone="success" className="mb-5">{carriedNotice}</Notice>
      )}
      {confirmEmailSent && (
        <Notice tone="success" className="mb-5">
          Account created! We've emailed you a link. Confirm your email, then log in here.
        </Notice>
      )}
      {serverError && (
        <Notice tone="warning" className="mb-5">{serverError}</Notice>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5" noValidate>
        <InputField
          id="email" label="Email" type="email" value={email}
          onChange={setEmail}
          onBlur={() => { setTouched((t) => ({ ...t, email: true })); validate(); }}
          icon={Mail} placeholder="you@example.com" autoComplete="email"
          error={showError("email")}
        />

        <InputField
          id="password" label="Password" type="password" value={password}
          onChange={setPassword}
          onBlur={() => { setTouched((t) => ({ ...t, password: true })); validate(); }}
          icon={Lock} placeholder="8+ characters"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          error={showError("password")}
        />

        {/* Privacy notice card (updated for A3: data is now saved) */}
        <div className="bg-mint-soft/50 rounded-2xl p-4 flex gap-3">
          <ShieldCheck className="text-primary shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-slate leading-relaxed">
            <strong className="text-navy">Your privacy matters.</strong>{" "}
            Ebb saves only the numbers you enter, to your own private account, so your
            history is there next time. No names or bank details. Only you can see your
            data, and you can wipe it any time.
          </p>
        </div>

        {/* Consent checkbox, required when creating an account */}
        {mode === "signup" && (
          <label className="flex items-start gap-3 cursor-pointer group animate-fade-in">
            <input
              type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-light/40 accent-primary focus:ring-primary focus:ring-2 cursor-pointer"
            />
            <span className="text-sm text-slate leading-snug group-hover:text-navy transition-colors">
              I agree Ebb can save the numbers I enter to my private account to calculate my
              safe-to-spend, and I know I can wipe them at any time.
            </span>
          </label>
        )}

        <div className="flex-1" />

        <Button
          type="submit"
          icon={mode === "signup" ? UserPlus : ArrowRight}
          disabled={!isFormValid}
          loading={submitting}
        >
          {mode === "signup" ? "Create account" : "Log in"}
        </Button>
      </form>
    </div>
  );
}
