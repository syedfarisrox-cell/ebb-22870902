import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names intelligently.
 *
 * `clsx` handles conditional classes (e.g. `cn("base", isActive && "active")`)
 * `twMerge` resolves conflicting Tailwind classes (e.g. "p-4 p-8" → "p-8")
 *
 * This is the standard utility used by shadcn/ui components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Australian Dollars (AUD).
 * Example: formatAUD(1234.5) → "$1,234.50"
 */
export function formatAUD(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

/**
 * Get today's date as an ISO date string (YYYY-MM-DD).
 * Used to default the date inputs to today.
 */
export function getTodayISO(): string {
  // Use the user's LOCAL date. (toISOString() uses UTC, which in Sydney
  // before 11am would give yesterday's date.)
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}