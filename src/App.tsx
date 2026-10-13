/**
 * Ebb — App.tsx
 *
 * Holds the app's state and decides which screen to show (no router needed).
 *
 * A2 → A3: what changed
 *   • A2 kept everything in React state and forgot it when the tab closed.
 *   • A3 saves data to Supabase through our Python backend (/api), so:
 *       - Login is real (Supabase Auth)
 *       - Bills are loaded on login and saved on "Save & continue"
 *       - "Calculate & save" sends income + expense to Python, which does
 *         the maths and saves a check-in row
 *       - The new History screen reads those rows back
 *       - "Wipe my data" deletes the rows from the database
 *   • This file never talks to Supabase directly and holds no secret keys.
 */
import { useCallback, useEffect, useState } from "react";
import { History, LogOut } from "lucide-react";
import type {
  Screen, Bills, IncomeEntry, ExpenseEntry, Session, CheckIn, LoginNotice,
} from "./types";
import { api, ApiError, loadSession, saveSession } from "./lib/api";
import { LoginScreen } from "./screens/LoginScreen";
import { BillsScreen } from "./screens/BillsScreen";
import { IncomeScreen } from "./screens/IncomeScreen";
import { ExpenseScreen } from "./screens/ExpenseScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { IconAction } from "./components/IconAction";

const emptyBills: Bills = { rent: 0, phone: 0, other: 0, savingsBuffer: 0 };

export default function App() {
  // ── State ──────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [loginNotice, setLoginNotice] = useState<LoginNotice>(null);
  const [restoring, setRestoring] = useState<boolean>(() => loadSession() !== null);

  const [bills, setBills] = useState<Bills>(emptyBills);
  const [billsLoadedFromAccount, setBillsLoadedFromAccount] = useState(false);
  const [income, setIncome] = useState<IncomeEntry | null>(null);
  const [expense, setExpense] = useState<ExpenseEntry | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<CheckIn | null>(null);

  /** Where History's back arrow returns to */
  const [historyReturn, setHistoryReturn] = useState<Screen>("bills");
  /** Bumps each time a new check-in flow starts so the forms reset */
  const [flowKey, setFlowKey] = useState(0);

  const token = session?.accessToken ?? "";
  const email = session?.user.email ?? "";

  // ── Session helpers ────────────────────────────────────

  /** Clear everything in memory and go back to Login with a message */
  const endSession = useCallback((notice: LoginNotice) => {
    saveSession(null);
    setSession(null);
    setBills(emptyBills);
    setBillsLoadedFromAccount(false);
    setIncome(null);
    setExpense(null);
    setLastCheckIn(null);
    setLoginNotice(notice);
    setCurrentScreen("login");
  }, []);

  /**
   * Wrap every backend call: if the server says 401 (token expired or
   * invalid), log the user out cleanly instead of showing a broken screen.
   */
  const guard = useCallback(
    async <T,>(call: () => Promise<T>): Promise<T> => {
      try {
        return await call();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) endSession({ kind: "expired" });
        throw e;
      }
    },
    [endSession]
  );

  /** After login: load saved bills from Supabase, then go to Step 1 */
  const startForUser = useCallback(async (s: Session) => {
    const { budget } = await api.getBudget(s.accessToken);
    if (budget) {
      setBills({ rent: budget.rent, phone: budget.phone, other: budget.other, savingsBuffer: budget.savingsBuffer });
      setBillsLoadedFromAccount(true);
    } else {
      setBills(emptyBills);
      setBillsLoadedFromAccount(false);
    }
    setFlowKey((k) => k + 1);
    setCurrentScreen("bills");
  }, []);

  const handleAuthenticated = async (s: Session) => {
    saveSession(s);
    setSession(s);
    setLoginNotice(null);
    await startForUser(s);
  };

  /* If the tab was refreshed while logged in, pick up where we left off */
  useEffect(() => {
    const saved = loadSession();
    if (!saved) return;
    startForUser(saved)
      .catch((e) => {
        endSession(e instanceof ApiError && e.status === 401 ? { kind: "expired" } : null);
      })
      .finally(() => setRestoring(false));
  }, [startForUser, endSession]);

  // ── Actions that talk to the backend ───────────────────

  const saveBills = async (next: Bills) => {
    await guard(() => api.saveBudget(token, next));
    setBills(next);
    setBillsLoadedFromAccount(true);
    setCurrentScreen("income");
  };

  const calculateAndSave = async (exp: ExpenseEntry) => {
    if (!income) return;
    setExpense(exp);
    const { checkIn } = await guard(() => api.createCheckIn(token, income, exp));
    setLastCheckIn(checkIn);
    setCurrentScreen("result");
  };

  const loadCheckIns = useCallback(
    () => guard(() => api.listCheckIns(token)).then((r) => r.checkIns),
    [guard, token]
  );

  const wipeData = async () => {
    const { deleted } = await guard(() => api.wipeMyData(token));
    endSession({ kind: "wiped", checkIns: deleted.checkIns });
  };

  const logOut = () => {
    api.logout(token).catch(() => {}); // revoke on the server; we forget it either way
    endSession({ kind: "loggedOut" });
  };

  // ── Navigation helpers ─────────────────────────────────

  const goTo = (screen: Screen) => setCurrentScreen(screen);

  const openHistory = () => {
    if (currentScreen !== "history") setHistoryReturn(currentScreen);
    goTo("history");
  };

  const newCheckIn = () => {
    setIncome(null);
    setExpense(null);
    setLastCheckIn(null);
    setFlowKey((k) => k + 1);
    goTo("bills");
  };

  /** Top-right buttons on every logged-in screen */
  const actions = (
    <>
      <IconAction icon={History} label="View history" onClick={openHistory} active={currentScreen === "history"} />
      <IconAction icon={LogOut} label="Log out" onClick={logOut} />
    </>
  );

  // ── Render ─────────────────────────────────────────────

  if (restoring) {
    return (
      <main className="min-h-screen bg-offwhite font-sans flex items-center justify-center">
        <p className="text-slate text-sm animate-pulse">Loading your account…</p>
      </main>
    );
  }

  const loggedIn = session !== null;

  return (
    <main className="min-h-screen bg-offwhite font-sans">
      {/* Centred phone-width column — looks like a phone screen on desktop */}
      <div className="mx-auto max-w-[420px] min-h-screen">
        {(!loggedIn || currentScreen === "login") && (
          <LoginScreen notice={loginNotice} onAuthenticated={handleAuthenticated} />
        )}

        {loggedIn && currentScreen === "bills" && (
          <BillsScreen
            key={`bills-${flowKey}`}
            bills={bills}
            loadedFromAccount={billsLoadedFromAccount}
            onSave={saveBills}
            actions={actions}
          />
        )}

        {loggedIn && currentScreen === "income" && (
          <IncomeScreen
            key={`income-${flowKey}`}
            income={income}
            onIncomeChange={setIncome}
            onBack={() => goTo("bills")}
            onContinue={() => goTo("expense")}
            actions={actions}
          />
        )}

        {loggedIn && currentScreen === "expense" && (
          <ExpenseScreen
            key={`expense-${flowKey}`}
            expense={expense}
            onBack={() => goTo("income")}
            onCalculate={calculateAndSave}
            actions={actions}
          />
        )}

        {loggedIn && currentScreen === "result" && lastCheckIn && (
          <ResultScreen
            email={email}
            checkIn={lastCheckIn}
            onBack={() => goTo("expense")}
            onEditExpense={() => goTo("expense")}
            onViewHistory={openHistory}
            onNewCheckIn={newCheckIn}
            onWipeData={wipeData}
            actions={actions}
          />
        )}

        {loggedIn && currentScreen === "history" && (
          <HistoryScreen
            email={email}
            loadCheckIns={loadCheckIns}
            onBack={() => goTo(historyReturn === "history" ? "bills" : historyReturn)}
            onNewCheckIn={newCheckIn}
            onWipeData={wipeData}
            actions={actions}
          />
        )}
      </div>
    </main>
  );
}
