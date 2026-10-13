/**
 * Ebb — TypeScript Types
 *
 * These types describe the shape of all data in the app.
 * In A3 the data is saved to Supabase through the Python backend (/api).
 */

/** Which screen the user is currently on */
export type Screen = "login" | "bills" | "income" | "expense" | "result" | "history";

/** The user's regular bills (set in Step 1, saved to the `budgets` table) */
export interface Bills {
  rent: number;
  phone: number;
  other: number;
  savingsBuffer: number;
}

/** A single income entry logged by the user */
export interface IncomeEntry {
  amount: number;
  source: string;
  date: string; // ISO date string, e.g. "2026-10-13"
}

/** Expense categories — limited set for simplicity */
export type ExpenseCategory =
  | "Groceries"
  | "Transport"
  | "Eating out"
  | "Bills"
  | "Other";

/** A single expense entry logged by the user */
export interface ExpenseEntry {
  amount: number;
  category: ExpenseCategory;
  date: string;
}

/** The logged-in user's session, returned by POST /api/auth/login */
export interface Session {
  accessToken: string;
  expiresIn: number;
  user: { id: string; email: string };
}

/**
 * One saved check-in (a row in the `check_ins` table).
 * The Python backend calculates safeBefore, safeToSpend and outcome.
 */
export interface CheckIn {
  id: number;
  createdAt: string;
  income: IncomeEntry;
  expense: ExpenseEntry;
  bills: Bills;
  safeBefore: number;
  safeToSpend: number;
  outcome: "success" | "declined";
}

/** Messages the Login screen can show after the user is sent back to it */
export type LoginNotice =
  | { kind: "wiped"; checkIns: number }
  | { kind: "expired" }
  | { kind: "loggedOut" }
  | null;
