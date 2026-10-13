/**
 * HistoryScreen — NEW in A3.
 *
 * Loads every saved check-in from Supabase (GET /api/check-ins) and lists
 * them newest first. This is the screen that proves data is not just saved
 * but also retrieved: log out, log back in, and it's all still here.
 */
import { useEffect, useState, type ReactNode } from "react";
import { History, Plus, TrendingUp, TrendingDown, RefreshCw, PiggyBank } from "lucide-react";
import { cn, formatAUD } from "@/lib/utils";
import type { CheckIn } from "@/types";
import { Button } from "@/components/Button";
import { ScreenCard } from "@/components/ScreenCard";
import { Notice } from "@/components/Notice";
import { WipeDataControl } from "@/components/WipeDataControl";

interface HistoryScreenProps {
  email: string;
  loadCheckIns: () => Promise<CheckIn[]>;
  onBack?: () => void;
  onNewCheckIn: () => void;
  onWipeData: () => Promise<void>;
  actions?: ReactNode;
}

export function HistoryScreen({
  email, loadCheckIns, onBack, onNewCheckIn, onWipeData, actions,
}: HistoryScreenProps) {
  const [checkIns, setCheckIns] = useState<CheckIn[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    loadCheckIns()
      .then((rows) => { if (!cancelled) setCheckIns(rows); })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load your history.");
      });
    return () => { cancelled = true; };
  }, [loadCheckIns, reloadKey]);

  const latest = checkIns?.find((c) => c.outcome === "success");
  const protectedCount = checkIns?.filter((c) => c.outcome === "declined").length ?? 0;

  return (
    <ScreenCard
      title="Your history"
      subtitle={`Every check-in saved to ${email}.`}
      icon={History}
      onBack={onBack}
      actions={actions}
      footer={
        <div className="flex flex-col gap-3">
          <Button icon={Plus} onClick={onNewCheckIn}>New check-in</Button>
          {checkIns && checkIns.length > 0 && <WipeDataControl onWipe={onWipeData} />}
        </div>
      }
    >
      {error && (
        <Notice tone="warning" className="mb-5">
          {error}{" "}
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
          >
            <RefreshCw size={14} /> Try again
          </button>
        </Notice>
      )}

      {/* Loading skeleton */}
      {!checkIns && !error && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading your history">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white shadow-sm animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {checkIns && checkIns.length === 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-navy font-semibold mb-1">No check-ins yet</p>
          <p className="text-sm text-slate">Log some income and an expense, and it'll show up here.</p>
        </div>
      )}

      {checkIns && checkIns.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-light mb-1">Latest safe-to-spend</p>
              <p className="text-xl font-extrabold text-primary tracking-tight">
                {latest ? formatAUD(latest.safeToSpend) : "—"}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-light mb-1">Check-ins saved</p>
              <p className="text-xl font-extrabold text-navy tracking-tight">{checkIns.length}</p>
              {protectedCount > 0 && (
                <p className="text-xs text-amber mt-0.5 flex items-center gap-1">
                  <PiggyBank size={12} /> Buffer protected {protectedCount}×
                </p>
              )}
            </div>
          </div>

          {/* List */}
          <ul className="space-y-3" aria-label="Saved check-ins">
            {checkIns.map((c) => (
              <li key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-light mb-1.5">
                      {new Date(c.createdAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    <p className="text-sm text-navy flex items-center gap-1.5 truncate">
                      <TrendingUp size={14} className="text-primary shrink-0" />
                      {formatAUD(c.income.amount)} <span className="text-slate truncate">· {c.income.source}</span>
                    </p>
                    <p className="text-sm text-navy flex items-center gap-1.5">
                      <TrendingDown size={14} className="text-amber shrink-0" />
                      {formatAUD(c.expense.amount)} <span className="text-slate">· {c.expense.category}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "inline-block text-[11px] font-semibold rounded-full px-2 py-0.5 mb-1",
                        c.outcome === "success" ? "bg-mint-soft text-primary" : "bg-amber-soft text-amber"
                      )}
                    >
                      {c.outcome === "success" ? "Safe" : "Paused"}
                    </span>
                    <p className={cn("text-base font-bold", c.outcome === "success" ? "text-primary" : "text-slate-light line-through")}>
                      {formatAUD(c.safeToSpend)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-light text-center mt-4">
            "Paused" means Ebb stopped an expense that would have dipped into your savings buffer.
          </p>
        </>
      )}
    </ScreenCard>
  );
}
