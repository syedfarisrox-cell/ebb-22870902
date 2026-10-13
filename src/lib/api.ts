/**
 * Ebb — API client
 *
 * The ONLY place the React app talks to the outside world.
 * Every call goes to our own Python backend at /api/...
 *
 * Notice what is NOT here: no Supabase URL, no Supabase key, no database
 * code. Those live only on the server as environment variables, so they can
 * never show up in the browser.
 */
import type { Bills, CheckIn, ExpenseEntry, IncomeEntry, Session } from "@/types";

/** An error from the backend, with the HTTP status (401 = not logged in) */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Turn FastAPI's error body into one friendly sentence */
function readError(body: unknown, status: number): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    // Validation errors come back as a list; show the first one
    if (Array.isArray(detail) && detail[0]?.msg) {
      return String(detail[0].msg).replace(/^Value error, /, "");
    }
  }
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "Something went wrong. Please try again.";
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach Ebb right now. Check your connection and try again.", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(readError(data, res.status), res.status);
  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────

type AuthResult = { status: "signed_in"; session: Session } | { status: "confirm_email" };

export const api = {
  signup: (email: string, password: string) =>
    request<AuthResult>("/auth/signup", { method: "POST", body: { email, password } }),

  login: (email: string, password: string) =>
    request<AuthResult>("/auth/login", { method: "POST", body: { email, password } }),

  logout: (token: string) =>
    request<{ status: string }>("/auth/logout", { method: "POST", token }),

  // ── Bills (budgets table) ────────────────────────────────────────────────
  getBudget: (token: string) =>
    request<{ budget: (Bills & { updatedAt: string }) | null }>("/budget", { token }),

  saveBudget: (token: string, bills: Bills) =>
    request<{ budget: Bills }>("/budget", { method: "PUT", body: bills, token }),

  // ── Check-ins (check_ins table) ──────────────────────────────────────────
  createCheckIn: (token: string, income: IncomeEntry, expense: ExpenseEntry) =>
    request<{ checkIn: CheckIn }>("/check-ins", {
      method: "POST",
      body: { income, expense },
      token,
    }),

  listCheckIns: (token: string) => request<{ checkIns: CheckIn[] }>("/check-ins", { token }),

  // ── Wipe ─────────────────────────────────────────────────────────────────
  wipeMyData: (token: string) =>
    request<{ status: string; deleted: { checkIns: number; budgets: number } }>("/my-data", {
      method: "DELETE",
      token,
    }),
};

// ── Session storage ────────────────────────────────────────────────────────
// The login token is kept in sessionStorage, so it is forgotten as soon as
// the tab is closed (same spirit as the A2 "nothing after you close the tab").

const SESSION_KEY = "ebb.session";

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (e.g. private mode): stay logged in for this page only */
  }
}
