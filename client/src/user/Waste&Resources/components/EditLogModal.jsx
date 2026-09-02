import { useState } from "react";
import { RotateCcw } from "lucide-react";
import Modal from "./Modal";
import NumberField from "./NumberField";

/* ==================================================================
   EDIT LOG
   ------------------------------------------------------------------
   Scanned masses carry roughly 20-30% error even in the published
   literature, so a user correction is the mechanism that makes an
   estimate trustworthy rather than a number to argue with.

   The first save snapshots the pre-edit values (see ledgerStore), so
   a corrected scan keeps the model's original prediction for later
   evaluation.
   ================================================================== */

const FIELDS = [
  { key: "foodWaste", label: "Food waste", suffix: "g", hint: "Leftovers on the plate" },
  { key: "plastic", label: "Plastic items", suffix: null, hint: "Bottles, bags, straws, cutlery" },
  { key: "water", label: "Water", suffix: "L", hint: "Shower, washing, drinking" },
  { key: "disposables", label: "Disposable amenities", suffix: null, hint: "Toiletries, slippers, razors" },
];

export default function EditLogModal({ log, onClose, onSave }) {
  const [values, setValues] = useState(() => ({
    foodWaste: Number(log.foodWaste) || 0,
    plastic: Number(log.plastic) || 0,
    water: Number(log.water) || 0,
    disposables: Number(log.disposables) || 0,
  }));
  const [saving, setSaving] = useState(false);

  const set = (key) => (v) => setValues((prev) => ({ ...prev, [key]: v }));

  const original = log.original || null;
  const changed = FIELDS.some((f) => values[f.key] !== (Number(log[f.key]) || 0));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(log, values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Edit log · ${log.date}`} onClose={onClose}>
      {log.source === "cv" && (
        <p className="text-slate-500">
          This entry came from a plate scan. Correcting it keeps the original estimate on
          record so the model can be measured against real weights.
        </p>
      )}

      <div className="mt-6 space-y-5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <NumberField
              label={f.label}
              hint={f.hint}
              suffix={f.suffix}
              value={values[f.key]}
              onChange={set(f.key)}
            />
            {original && original[f.key] !== values[f.key] && (
              <button
                onClick={() => set(f.key)(original[f.key])}
                className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 focus:outline-none focus:underline"
              >
                <RotateCcw size={13} aria-hidden="true" />
                Originally {original[f.key]}
                {f.suffix || ""}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-200 hover:bg-slate-50 py-3.5 text-base font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!changed || saving}
          className="rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950 text-white py-3.5 text-base font-medium transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}
