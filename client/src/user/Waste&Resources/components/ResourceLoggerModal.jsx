import { useState } from "react";
import Modal from "./Modal";
import Slider from "./Slider";
import Stepper from "./Stepper";
import { SHOWER_FLOW_L_PER_MIN } from "../constants/waste";

/* ==================================================================
   RESOURCE LOGGER  (F3)
   ================================================================== */

export default function ResourceLoggerModal({ onClose, onCommit }) {
  const [plastic, setPlastic] = useState(0);
  const [disposables, setDisposables] = useState(0);
  const [showerMin, setShowerMin] = useState(8);
  const [extraWater, setExtraWater] = useState(15);

  const water = Math.round(showerMin * SHOWER_FLOW_L_PER_MIN + extraWater);

  return (
    <Modal title="Resource Logger" onClose={onClose}>
      <p className="text-slate-500">
        Steppers and sliders keep entry under ten seconds. Values are cached locally and sync when
        you regain signal.
      </p>

      <div className="mt-6 space-y-6">
        <Stepper
          label="Single-use plastic items"
          hint="Bottles, straws, bags, cutlery"
          value={plastic}
          onChange={setPlastic}
        />
        <Stepper
          label="Disposable amenities"
          hint="Toiletry sachets, slippers, razors"
          value={disposables}
          onChange={setDisposables}
        />
        <Slider
          label="Shower duration"
          value={showerMin}
          onChange={setShowerMin}
          min={0}
          max={25}
          step={0.5}
          format={(v) => `${v} min`}
          note={`≈ ${Math.round(showerMin * SHOWER_FLOW_L_PER_MIN)}L at ${SHOWER_FLOW_L_PER_MIN}L/min`}
        />
        <Slider
          label="Other water use"
          value={extraWater}
          onChange={setExtraWater}
          min={0}
          max={120}
          step={5}
          format={(v) => `${v} L`}
          note="Basin, laundry, bottled water"
        />
      </div>

      <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 px-5 py-4 flex items-center justify-between">
        <span className="text-base text-slate-500">Total water today</span>
        <span className="text-2xl font-bold tabular-nums">{water}L</span>
      </div>

      <button
        onClick={() =>
          onCommit({
            type: "Resource",
            source: "manual",
            foodWaste: 0,
            plastic,
            water,
            disposables,
            showerMin,
          })
        }
        className="mt-6 w-full rounded-lg bg-slate-950 hover:bg-slate-800 text-white py-3.5 text-base font-medium transition-colors"
      >
        Save to ledger
      </button>
    </Modal>
  );
}
