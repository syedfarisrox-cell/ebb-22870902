/**
 * Notice — Soft, rounded message box used across Ebb.
 *
 * Props:
 *   tone     — "success" (mint, teal icon) | "info" (mint, shield) | "warning" (amber).
 *              We never use alarming red: warnings are calm amber, as in A2.
 *   children — The message.
 *
 * Uses role="status" so screen readers announce it when it appears.
 */
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoticeProps {
  tone?: "success" | "info" | "warning";
  children: ReactNode;
  className?: string;
}

const tones = {
  success: { box: "bg-mint-soft/60", icon: CheckCircle2, iconClass: "text-primary" },
  info: { box: "bg-mint-soft/50", icon: Info, iconClass: "text-primary" },
  warning: { box: "bg-amber-soft/70", icon: AlertTriangle, iconClass: "text-amber" },
} as const;

export function Notice({ tone = "info", children, className }: NoticeProps) {
  const t = tones[tone];
  const Icon = t.icon;
  return (
    <div
      role="status"
      className={cn("rounded-2xl p-4 flex items-start gap-3 animate-fade-in", t.box, className)}
    >
      <Icon className={cn("shrink-0 mt-0.5", t.iconClass)} size={20} aria-hidden="true" />
      <div className="text-sm text-navy leading-relaxed">{children}</div>
    </div>
  );
}
