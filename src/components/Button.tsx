/**
 * Button — Reusable button component for the Ebb MVP.
 *
 * Props:
 *   children    — The button text (e.g. "Continue"). Optional for icon-only buttons.
 *   onClick     — Click handler (optional — not needed for type="submit" inside a form).
 *   type        — "button" (default) or "submit". Use "submit" for form submissions.
 *   variant     — "primary" (filled teal), "secondary" (outlined for Back actions),
 *                  or "warning" (amber outline for caution actions).
 *   icon        — An optional Lucide icon component rendered before the text.
 *   disabled    — When true, the button is greyed out and shows a not-allowed cursor.
 *   fullWidth   — When true (default), the button stretches to fill its container.
 *   form        — Optional HTML form id. Use when the button sits outside the <form>
 *                  element (e.g. in a ScreenCard footer) but needs to submit it.
 *   loading     — (A3) When true, shows a spinner and blocks clicks while we wait
 *                  for the Python backend / Supabase to answer.
 */
import type { ElementType, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "warning";
  icon?: ElementType;
  disabled?: boolean;
  fullWidth?: boolean;
  form?: string;
  loading?: boolean;
}

/* ── Style tokens for each variant ─────────────────────── */
const variantStyles = {
  primary: cn(
    "bg-primary text-white",
    "hover:bg-primary-light",
    "active:scale-[0.98]",
    "shadow-lg shadow-primary/20"
  ),
  secondary: cn(
    "border border-slate-light/30 text-slate",
    "hover:bg-slate-light/5"
  ),
  warning: cn(
    "border-2 border-amber text-amber",
    "hover:bg-amber-soft/30",
    "active:scale-[0.98]"
  ),
} as const;

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  icon: Icon,
  disabled = false,
  fullWidth = true,
  form,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      form={form}
      className={cn(
        /* ── Base styles shared by every variant ──────── */
        "h-12 rounded-xl font-semibold text-base",
        "flex items-center justify-center gap-2",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
        /* ── Full-width or auto ───────────────────────── */
        fullWidth ? "w-full" : "px-5",
        /* ── Variant colours (overridden when disabled) ─ */
        loading
          ? cn(variantStyles[variant], "opacity-80 cursor-wait")
          : disabled
            ? "bg-slate-light/20 text-slate-light cursor-not-allowed"
            : variantStyles[variant]
      )}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon size={18} />
      )}
      {children}
    </button>
  );
}