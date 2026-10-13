/**
 * ResultScreen — Shows safe-to-spend or a calm "hold on" warning.
 *
 * A3 upgrade: every number on this screen came back from the Python backend
 * AFTER it was saved to Supabase, so what you see is what's in the database.
 */
import { useState, useEffect, type ReactNode } from "react";
import {
  CheckCircle2, AlertTriangle, ShieldCheck, ArrowLeft, Wallet, TrendingUp,
  TrendingDown, ChevronDown, History, Plus, Database,
} from "lucide-react";
import { formatAUD } from "@/lib/utils";
import type { CheckIn } from "@/types";
import { Button } from "@/components/Button";
import { ScreenCard } from "@/components/ScreenCard";
import { WipeDataControl } from "@/components/WipeDataControl";
import NumberTicker from "@/components/ui/number-ticker-02";

interface ResultScreenProps {
  email: string;
  checkIn: CheckIn;
  onBack: () => void;
  onEditExpense: () => void;
  onViewHistory: () => void;
  onNewCheckIn: () => void;
  onWipeData: () => Promise<void>;
  actions?: ReactNode;
}

export function ResultScreen({
  email, checkIn, onBack, onEditExpense, onViewHistory, onNewCheckIn, onWipeData, actions,
}: ResultScreenProps) {
  const { income, expense, bills, safeBefore, safeToSpend } = checkIn;
  const isPositive = checkIn.outcome === "success";
  const totalBills = bills.rent + bills.phone + bills.other;

  /* Animate the safe-to-spend number from safeBefore → safeToSpend */
  const [displayValue, setDisplayValue] = useState(safeBefore);
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setDisplayValue(safeToSpend), prefersReduced ? 0 : 50);
    return () => clearTimeout(timer);
  }, [safeToSpend]);

  const savedAt = new Date(checkIn.createdAt).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <ScreenCard
      onBack={isPositive ? onBack : undefined}
      actions={actions}
      footer={<WipeDataControl onWipe={onWipeData} />}
    >
      {isPositive ? (
        <div className="flex flex-col items-center text-center mb-6">
          <CheckCircle2 className="text-primary mb-4" size={48} strokeWidth={1.5} />
          <h2 className="text-lg font-semibold text-navy mb-2">Your safe-to-spend</h2>
          <NumberTicker
            value={displayValue}
            currency="AUD"
            decimals={2}
            className="text-5xl font-extrabold text-primary tracking-tight mb-4"
          />
          <div className="bg-mint-soft/60 rounded-2xl px-5 py-3 max-w-sm">
            <p className="text-sm text-navy leading-relaxed">
              {safeBefore > safeToSpend
                ? `Your safe-to-spend dropped from ${formatAUD(safeBefore)} to ${formatAUD(safeToSpend)} because you logged a ${formatAUD(expense.amount)} ${expense.category} expense.`
                : `Based on your ${formatAUD(income.amount)} income from "${income.source}", minus ${formatAUD(totalBills)} in bills and ${formatAUD(bills.savingsBuffer)} savings buffer, this is what's left.`}
            </p>
          </div>

          {/* Expandable calculation breakdown — uses <details> for keyboard accessibility */}
          <details className="mt-4 w-full max-w-sm group">
            <summary className="flex items-center justify-center gap-1 text-sm text-primary cursor-pointer select-none hover:text-primary-light transition-colors">
              <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
              How is this calculated?
            </summary>
            <div className="mt-3 bg-white rounded-xl border border-slate-light/20 p-4 text-left">
              <div className="space-y-2 text-sm">
                <Row label="Income" value={income.amount} />
                <Row label="− Rent" value={bills.rent} />
                <Row label="− Phone" value={bills.phone} />
                <Row label="− Other bills" value={bills.other} />
                <Row label="− Savings buffer" value={bills.savingsBuffer} />
                <Row label="− This expense" value={expense.amount} amber />
                <div className="border-t border-slate-light/20 pt-2 mt-2 flex justify-between">
                  <span className="text-navy font-semibold">= Safe-to-spend</span>
                  <span className="text-primary font-bold">{formatAUD(safeToSpend)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-light mt-3">Calculated by Ebb's server, so it's always worked out the same way.</p>
            </div>
          </details>

          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            <Button variant="secondary" icon={History} onClick={onViewHistory}>History</Button>
            <Button icon={Plus} onClick={onNewCheckIn}>New check-in</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center mb-6">
          <AlertTriangle className="text-amber mb-4" size={48} strokeWidth={1.5} />
          <h2 className="text-lg font-semibold text-navy mb-2">Hold on a moment</h2>
          <div className="bg-amber-soft/60 rounded-2xl px-5 py-4 max-w-sm mb-5">
            <p className="text-sm text-navy leading-relaxed">
              That {formatAUD(expense.amount)} {expense.category} expense would dip into your savings buffer of {formatAUD(bills.savingsBuffer)}. You've set that aside for emergencies — maybe adjust the amount or skip this one?
            </p>
          </div>
          <Button variant="warning" icon={ArrowLeft} onClick={onEditExpense} fullWidth={false}>
            Go back and edit expense
          </Button>
          <button
            type="button"
            onClick={onViewHistory}
            className="mt-3 text-sm text-primary hover:text-primary-light underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
          >
            View my history
          </button>
        </div>
      )}

      {/* ── Privacy Receipt ─────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="text-primary" size={20} />
          <h3 className="font-semibold text-navy text-sm">Privacy receipt</h3>
        </div>
        <p className="text-xs text-slate-light mb-3">Here's exactly what Ebb saved to your account ({savedAt}):</p>
        <ul className="space-y-1.5 text-xs text-slate mb-4">
          <li className="flex items-center gap-2"><Wallet size={14} className="text-primary" /> Account email: {email}</li>
          <li className="flex items-center gap-2"><Wallet size={14} className="text-primary" /> Rent: {formatAUD(bills.rent)}</li>
          <li className="flex items-center gap-2"><Wallet size={14} className="text-primary" /> Phone: {formatAUD(bills.phone)}</li>
          <li className="flex items-center gap-2"><Wallet size={14} className="text-primary" /> Other bills: {formatAUD(bills.other)}</li>
          <li className="flex items-center gap-2"><Wallet size={14} className="text-primary" /> Savings buffer: {formatAUD(bills.savingsBuffer)}</li>
          <li className="flex items-center gap-2"><TrendingUp size={14} className="text-primary" /> Income: {formatAUD(income.amount)} from "{income.source}" on {income.date}</li>
          <li className="flex items-center gap-2"><TrendingDown size={14} className="text-amber" /> Expense: {formatAUD(expense.amount)} ({expense.category}) on {expense.date}</li>
        </ul>
        <p className="text-xs text-slate-light leading-relaxed flex gap-2">
          <Database size={14} className="text-primary shrink-0 mt-0.5" />
          <span>
            Stored in Ebb's secure database, locked to your login so no one else can read it.
            Your password is handled by Supabase Auth and is never stored by Ebb. "Wipe my data" deletes all of it.
          </span>
        </p>
      </div>
    </ScreenCard>
  );
}

function Row({ label, value, amber = false }: { label: string; value: number; amber?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate">{label}</span>
      <span className={amber ? "text-amber font-medium" : "text-navy font-medium"}>{formatAUD(value)}</span>
    </div>
  );
}
