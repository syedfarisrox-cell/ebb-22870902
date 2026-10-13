"use client";

import NumberFlow, { type Value } from "@number-flow/react";

type NumberTickerProps = {
  value: Value;
  currency?: string;
  decimals?: number;
  className?: string;
};

/**
 * NumberTicker 02 - Money Flow
 * Premium currency display with smooth high-fidelity rolls.
 * Installed from 21st.dev — default currency set to AUD for Ebb.
 */
export default function NumberTicker({
  value,
  currency = "AUD",
  decimals = 2,
  className,
}: NumberTickerProps) {
  return (
    <div className="inline-flex items-center gap-3">
      <NumberFlow
        value={value}
        locales="en-AU"
        format={{
          style: "currency",
          currency: currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }}
        className={className}
      />
    </div>
  );
}