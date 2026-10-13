/**
 * WipeDataControl — The "Wipe my data" button with its inline confirmation.
 *
 * Used on the Result and History screens. In A2 this only cleared React
 * state. In A3 it calls DELETE /api/my-data, which deletes every row this
 * user owns in Supabase (bills + all check-ins) and ends the session.
 *
 * Props:
 *   onWipe — async function that performs the wipe. Errors are shown inline.
 */
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/Button";

interface WipeDataControlProps {
  onWipe: () => Promise<void>;
}

export function WipeDataControl({ onWipe }: WipeDataControlProps) {
  const [confirming, setConfirming] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWipe = async () => {
    setWiping(true);
    setError(null);
    try {
      await onWipe();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't wipe your data. Please try again.");
      setWiping(false);
    }
  };

  if (!confirming) {
    return (
      <Button variant="warning" icon={Trash2} onClick={() => setConfirming(true)}>
        Wipe my data
      </Button>
    );
  }

  return (
    <div className="text-center animate-fade-in">
      <p className="text-sm text-slate mb-3">
        This permanently deletes your saved bills and every check-in from Ebb's database. Continue?
      </p>
      {error && (
        <p role="alert" className="text-sm text-amber mb-3">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          fullWidth={false}
          disabled={wiping}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
        <Button variant="warning" icon={Trash2} loading={wiping} onClick={handleWipe}>
          Yes, wipe it
        </Button>
      </div>
    </div>
  );
}
