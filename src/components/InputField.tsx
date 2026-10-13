/**
 * InputField — Reusable input component for the Ebb MVP.
 *
 * Props:
 *   id           — Unique identifier, also used for htmlFor label linking.
 *   label        — Visible label text shown above the input.
 *   value        — Current value (string, even for number inputs).
 *   onChange      — Called with the new value string whenever the user types or selects.
 *   type         — "text" | "email" | "password" | "number" | "date".
 *                  When options is provided this prop is ignored (a <select> is rendered).
 *   placeholder  — Placeholder text. For selects, used as the disabled default option label.
 *   icon         — Optional Lucide icon component shown inside the input on the left.
 *   prefix       — Optional string (e.g. "$") shown after the icon, before the value.
 *   options      — Optional array of strings. When provided, renders a styled <select> dropdown.
 *   error        — Optional error message shown below the input with aria-live.
 *   autoComplete — Optional autocomplete attribute value (e.g. "email", "off").
 *   onBlur       — Optional blur handler, used by screens to trigger field-level validation.
 */
import { useState, type ElementType } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: "text" | "email" | "password" | "number" | "date";
  placeholder?: string;
  icon?: ElementType;
  prefix?: string;
  options?: string[];
  error?: string;
  autoComplete?: string;
  onBlur?: () => void;
}

export function InputField({
  id, label, value, onChange, type, placeholder, icon: Icon,
  prefix, options, error, autoComplete, onBlur,
}: InputFieldProps) {
  /* Password show/hide state — only used when type === "password" */
  const [showPassword, setShowPassword] = useState(false);

  /* Whether to render a <select> instead of an <input> */
  const isSelect = options && options.length > 0;

  /* ── Compute padding-left for the input ────────────────
   * Icon only → pl-11.  Icon + prefix → pl-14. */
  const inputPadding = prefix ? "pl-14" : "pl-11";

  /* ── Input type (password toggle support) ──────────── */
  const resolvedType = type === "password" && showPassword ? "text" : type;

  return (
    <div>
      {/* Visible label */}
      <label htmlFor={id} className="block text-sm font-medium text-navy mb-1.5">
        {label}
      </label>

      <div className="relative">
        {/* Left icon */}
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-light" size={18} />
        )}

        {/* Prefix (e.g. "$") */}
        {prefix && (
          <span className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-light text-base font-medium">
            {prefix}
          </span>
        )}

        {isSelect ? (
          /* ── Select dropdown ────────────────────────── */
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            aria-invalid={error ? true : undefined}
            className={cn(
              "w-full h-12 pl-11 pr-4 rounded-xl border text-base bg-white appearance-none",
              value ? "text-navy" : "text-slate-light",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow",
              error ? "border-amber" : "border-slate-light/30"
            )}
          >
            <option value="" disabled>{placeholder ?? "Select…"}</option>
            {options!.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          /* ── Regular input ─────────────────────────── */
          <input
            id={id}
            type={resolvedType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            autoComplete={autoComplete}
            min={type === "number" ? "0" : undefined}
            step={type === "number" ? "1" : undefined}
            aria-invalid={error ? true : undefined}
            className={cn(
              "w-full h-12 pr-4 rounded-xl border text-base text-navy bg-white placeholder:text-slate-light",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow",
              /* Extra right padding when password toggle is shown */
              type === "password" ? "pr-12" : "",
              inputPadding,
              error ? "border-amber" : "border-slate-light/30"
            )}
          />
        )}

        {/* Password show/hide toggle */}
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-light hover:text-slate transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {/* Error message — announced by screen readers */}
      <div aria-live="polite" className="h-5 mt-1">
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </div>
  );
}