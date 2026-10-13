/**
 * IconAction — Small square icon button for the top-right of a screen
 * (e.g. History, Log out). Matches the style of ScreenCard's back arrow.
 *
 * Props:
 *   icon    — Lucide icon component.
 *   label   — Accessible name, also shown as a tooltip (e.g. "View history").
 *   onClick — Click handler.
 *   active  — Highlights the button when the user is already on that screen.
 */
import type { ElementType } from "react";
import { cn } from "@/lib/utils";

interface IconActionProps {
  icon: ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
}

export function IconAction({ icon: Icon, label, onClick, active = false }: IconActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "h-10 w-10 rounded-xl border flex items-center justify-center transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        active
          ? "border-primary/30 bg-mint-soft text-primary"
          : "border-slate-light/30 text-slate hover:bg-slate-light/5"
      )}
    >
      <Icon size={18} />
    </button>
  );
}
