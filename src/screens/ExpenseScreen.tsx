/**
 * ExpenseScreen — Step 3 of 3
 *
 * Lets the user log an expense: amount, category, and date.
 *
 * A3 upgrade: "Calculate" sends income + expense to the Python backend
 * (POST /api/check-ins). Python does the maths and saves the check-in
 * to Supabase, then the Result screen shows what came back.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, TrendingDown, Banknote, Tag, Calendar } from "lucide-react";
import { getTodayISO } from "@/lib/utils";
import type { ExpenseEntry, ExpenseCategory } from "@/types";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { ScreenCard } from "@/components/ScreenCard";
import { Notice } from "@/components/Notice";

const CATEGORIES: ExpenseCategory[] = ["Groceries", "Transport", "Eating out", "Bills", "Other"];

interface ExpenseScreenProps {
  expense: ExpenseEntry | null;
  onBack: () => void;
  /** Sends the expense to the backend to calculate + save */
  onCalculate: (expense: ExpenseEntry) => Promise<void>;
  actions?: ReactNode;
}

export function ExpenseScreen({ expense, onBack, onCalculate, actions }: ExpenseScreenProps) {
  const [amount, setAmount] = useState(expense?.amount ? String(expense.amount) : "");
  const [category, setCategory] = useState<ExpenseCategory | "">(expense?.category ?? "");
  const [date, setDate] = useState(expense?.date ?? getTodayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [calculating, setCalculating] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!amount || Number(amount) <= 0) e.amount = "Please enter an amount greater than 0.";
    if (!category) e.category = "Please pick a category.";
    if (!date) e.date = "Please pick a date.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const showError = (field: string): string | undefined =>
    touched[field] ? errors[field] : undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ amount: true, category: true, date: true });
    if (!validate()) return;
    setCalculating(true);
    setServerError(null);
    try {
      await onCalculate({ amount: Number(amount), category: category as ExpenseCategory, date });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Couldn't calculate right now. Please try again.");
      setCalculating(false);
    }
  };

  return (
    <ScreenCard
      title="Log expense"
      subtitle="What did you spend and on what?"
      icon={TrendingDown}
      step={3} totalSteps={3}
      onBack={onBack}
      actions={actions}
      footer={<Button type="submit" form="expense-form" icon={ArrowRight} loading={calculating}>Calculate & save</Button>}
    >
      {serverError && <Notice tone="warning" className="mb-5">{serverError}</Notice>}
      <form id="expense-form" onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5" noValidate>
        <InputField
          id="expense-amount" label="Amount" type="number" value={amount}
          onChange={setAmount}
          onBlur={() => { setTouched((t) => ({ ...t, amount: true })); validate(); }}
          icon={Banknote} prefix="$" placeholder="e.g. 65"
          error={showError("amount")}
        />
        <InputField
          id="expense-category" label="Category" type="text" value={category}
          onChange={(v) => setCategory(v as ExpenseCategory)}
          onBlur={() => { setTouched((t) => ({ ...t, category: true })); validate(); }}
          icon={Tag} options={CATEGORIES} placeholder="Select a category"
          error={showError("category")}
        />
        <InputField
          id="expense-date" label="Date" type="date" value={date}
          onChange={setDate}
          onBlur={() => { setTouched((t) => ({ ...t, date: true })); validate(); }}
          icon={Calendar}
          error={showError("date")}
        />
      </form>
    </ScreenCard>
  );
}

