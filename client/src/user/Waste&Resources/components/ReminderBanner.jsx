import { Bell, X } from "lucide-react";

/**
 * F4 — raised by the geofence when the traveller returns to their lodging,
 * and also on any page visit where today's ledger is still empty.
 */
export default function ReminderBanner({ onDismiss }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
      <Bell size={20} className="text-green-700 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-green-900 break-words">You haven&apos;t logged today yet</p>
        <p className="text-green-800 mt-0.5">
          Complete today&apos;s ledger while the day is still fresh.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-green-700 hover:text-green-900 p-1"
        aria-label="Dismiss reminder"
      >
        <X size={18} />
      </button>
    </div>
  );
}
