/**
 * @param {boolean} [empty]  true when this category was not part of the
 *   entry (e.g. a scan log's plastic/water/disposables). Shown distinctly
 *   from a real zero, so it reads as "not logged here" rather than
 *   "you used zero plastic today".
 */
export default function Metric({ label, value, empty }) {
  return (
    <div>
      <dt className="text-base text-slate-500">{label}</dt>
      <dd
        className={
          "mt-1 text-base " +
          (empty ? "font-normal italic text-slate-400" : "font-semibold")
        }
      >
        {empty ? "Not logged" : value}
      </dd>
    </div>
  );
}
