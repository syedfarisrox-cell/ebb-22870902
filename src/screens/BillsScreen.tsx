/**
 * BillsScreen — Step 1 of 3
 *
 * Collects the user's regular bills: rent, phone, other, and savings buffer.
 *
 * A3 upgrade: the bills are loaded from Supabase when you log in, and saved
 * back (PUT /api/budget) when you press Continue.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Home, Smartphone, Receipt, PiggyBank } from "lucide-react";
import type { Bills } from "@/types";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { ScreenCard } from "@/components/ScreenCard";
import { Notice } from "@/components/Notice";

interface BillsScreenProps {
  bills: Bills;
  /** True when these bills were loaded from the user's saved account */
  loadedFromAccount: boolean;
  /** Saves the bills to Supabase (via the Python backend), then moves on */
  onSave: (bills: Bills) => Promise<void>;
  actions?: ReactNode;
}

export function BillsScreen({ bills, loadedFromAccount, onSave, actions }: BillsScreenProps) {
  /* Saved bills show their real value (including 0); a brand-new user sees empty boxes */
  const initial = (n: number) => (loadedFromAccount || n > 0 ? String(n) : "");
  const [rent, setRent] = useState(initial(bills.rent));
  const [phone, setPhone] = useState(initial(bills.phone));
  const [other, setOther] = useState(initial(bills.other));
  const [savings, setSavings] = useState(initial(bills.savingsBuffer));
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (rent === "" || Number(rent) < 0) e.rent = "Please enter your rent (0 if none).";
    if (phone === "" || Number(phone) < 0) e.phone = "Please enter your phone cost (0 if none).";
    if (other === "" || Number(other) < 0) e.other = "Enter 0 if you have no other bills.";
    if (savings === "" || Number(savings) < 0) e.savings = "Enter 0 if you don't want a buffer.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const showError = (field: string): string | undefined =>
    touched[field] ? errors[field] : undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ rent: true, phone: true, other: true, savings: true });
    if (!validate()) return;
    setSaving(true);
    setServerError(null);
    try {
      await onSave({ rent: Number(rent), phone: Number(phone), other: Number(other), savingsBuffer: Number(savings) });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Couldn't save your bills. Please try again.");
      setSaving(false);
    }
  };

  return (
    <ScreenCard
      title="Set up your bills"
      subtitle="Tell us about your regular expenses so Ebb can calculate what's safe to spend."
      step={1} totalSteps={3}
      actions={actions}
      footer={<Button type="submit" form="bills-form" icon={ArrowRight} loading={saving}>Save & continue</Button>}
    >
      {loadedFromAccount && (
        <Notice tone="success" className="mb-5">
          Welcome back! Your saved bills are loaded from your account. Update them if anything changed.
        </Notice>
      )}
      {serverError && <Notice tone="warning" className="mb-5">{serverError}</Notice>}
      <form id="bills-form" onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5" noValidate>
        <InputField id="rent" label="Rent / board" type="number" value={rent}
          onChange={setRent} icon={Home} prefix="$" placeholder="e.g. 250" autoComplete="off"
          error={showError("rent")} />
        <InputField id="phone" label="Phone plan" type="number" value={phone}
          onChange={setPhone} icon={Smartphone} prefix="$" placeholder="e.g. 45"
          error={showError("phone")} />
        <InputField id="other" label="Other regular bills" type="number" value={other}
          onChange={setOther} icon={Receipt} prefix="$" placeholder="e.g. 60"
          error={showError("other")} />
        <InputField id="savings" label="Savings buffer" type="number" value={savings}
          onChange={setSavings} icon={PiggyBank} prefix="$" placeholder="e.g. 200"
          error={showError("savings")} />

        <p className="text-xs text-slate-light -mt-2">
          Your savings buffer is money you'd like to set aside and not touch. Enter 0 if you don't want one.
        </p>
      </form>
    </ScreenCard>
  );
}