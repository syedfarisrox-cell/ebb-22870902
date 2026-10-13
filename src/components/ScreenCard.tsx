/**
 * ScreenCard — Shared layout wrapper for every screen in the Ebb MVP.
 *
 * Props:
 *   title       — Bold heading shown below the wave motif (optional).
 *   subtitle    — Friendly one-liner below the title (optional).
 *   icon        — Lucide icon displayed inside a soft mint circle (optional).
 *   step        — Current step number (e.g. 1). Used with totalSteps to show a progress bar.
 *   totalSteps  — Total number of steps (e.g. 3). When provided with step, shows a progress bar.
 *   onBack      — Callback for a back-arrow button at the top-left (optional).
 *   children    — The main content of the screen (e.g. a form with inputs).
 *   footer      — Area for the main action button(s), rendered at the bottom (optional).
 *   actions     — (A3) Small buttons shown at the top-right, e.g. History and Log out.
 */
import type { ElementType, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface ScreenCardProps {
  title?: string;
  subtitle?: string;
  icon?: ElementType;
  step?: number;
  totalSteps?: number;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
}

export function ScreenCard({
  title, subtitle, icon: Icon, step, totalSteps,
  onBack, children, footer, actions,
}: ScreenCardProps) {
  /* Compute progress-bar width as a percentage */
  const progressPct = step && totalSteps ? (step / totalSteps) * 100 : 0;

  return (
    <div className="animate-slide-up px-6 py-8 flex flex-col min-h-screen">

      {/* ── Top row: back arrow (left) + actions (right) ─ */}
      {(onBack || actions) && (
        <div className="flex items-center justify-between mb-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="h-10 w-10 rounded-xl border border-slate-light/30
                         text-slate flex items-center justify-center
                         hover:bg-slate-light/5 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <span />
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* ── Progress bar ──────────────────────────────── */}
      {step != null && totalSteps != null && (
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-navy">
              Step {step} of {totalSteps}
            </span>
          </div>
          <div className="h-1.5 bg-slate-light/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full animate-progress"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Wave motif ────────────────────────────────── */}
      <div className="flex justify-center mb-4">
        <svg width="80" height="20" viewBox="0 0 120 32" fill="none" aria-hidden="true">
          <path
            d="M0 16C10 16 10 6 20 6C30 6 30 26 40 26C50 26 50 6 60 6C70 6 70 26 80 26C90 26 90 6 100 6C110 6 110 16 120 16"
            stroke="#0F766E" strokeWidth="3" strokeLinecap="round" opacity="0.5"
          />
        </svg>
      </div>

      {/* ── Icon in a soft mint circle ─────────────────── */}
      {Icon && (
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-mint-soft flex items-center justify-center">
            <Icon className="text-primary" size={24} />
          </div>
        </div>
      )}

      {/* ── Title & subtitle ──────────────────────────── */}
      {title && (
        <h2 className="text-2xl font-bold text-navy text-center mb-1">
          {title}
        </h2>
      )}
      {subtitle && (
        <p className="text-slate text-center text-sm mb-8">
          {subtitle}
        </p>
      )}

      {/* ── Main content (flex-1 so it grows) ─────────── */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>

      {/* ── Footer (pinned to the bottom) ─────────────── */}
      {footer && (
        <div className="mt-4">
          {footer}
        </div>
      )}
    </div>
  );
}