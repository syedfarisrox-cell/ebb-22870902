/**
 * IncomeScreen — Step 2 of 3
 *
 * Lets the user log an income entry: amount, source, and date.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, TrendingUp, Banknote, Briefcase, Calendar } from "lucide-react";
import { getTodayISO } from "@/lib/utils";
import type { IncomeEntry } from "@/types";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { ScreenCard } from "@/components/ScreenCard";

interface IncomeScreenProps {
  income: IncomeEntry | null;
  onIncomeChange: (income: IncomeEntry) => void;
  onBack: () => void;
  onContinue: () => void;
  actions?: ReactNode;
}

export function IncomeScreen({ income, onIncomeChange, onBack, onContinue, actions }: IncomeScreenProps) {
  const [amount, setAmount] = useState(income?.amount ? String(income.amount) : "");
  const [source, setSource] = useState(income?.source ?? "");
  const [date, setDate] = useState(income?.date ?? getTodayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!amount || Number(amount) <= 0) e.amount = "Please enter an amount greater than 0.";
    if (!source.trim()) e.source = "What was this income from?";
    if (!date) e.date = "Please pick a date.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const showError = (field: string): string | undefined =>
    touched[field] ? errors[field] : undefined;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ amount: true, source: true, date: true });
    if (validate()) {
      onIncomeChange({ amount: Number(amount), source: source.trim(), date });
      onContinue();
    }
  };

  return (
    <ScreenCard
      title="Log income"
      subtitle="How much did you earn and from where?"
      icon={TrendingUp}
      step={2} totalSteps={3}
      onBack={onBack}
      actions={actions}
      footer={<Button type="submit" form="income-form" icon={ArrowRight}>Continue</Button>}
    >
      <form id="income-form" onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5" noValidate>
        <InputField
          id="income-amount" label="Amount" type="number" value={amount}
          onChange={setAmount}
          onBlur={() => { setTouched((t) => ({ ...t, amount: true })); validate(); }}
          icon={Banknote} prefix="$" placeholder="e.g. 350"
          error={showError("amount")}
        />
        <InputField
          id="income-source" label="Source" type="text" value={source}
          onChange={setSource}
          onBlur={() => { setTouched((t) => ({ ...t, source: true })); validate(); }}
          icon={Briefcase} placeholder='e.g. "Uber shift" or "Café shift"'
          error={showError("source")}
        />
        <InputField
          id="income-date" label="Date" type="date" value={date}
          onChange={setDate}
          onBlur={() => { setTouched((t) => ({ ...t, date: true })); validate(); }}
          icon={Calendar}
          error={showError("date")}
        />
      </form>
    </ScreenCard>
  );
}
