export default function Metric({ label, value }) {
  return (
    <div>
      <dt className="text-base text-slate-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold">{value}</dd>
    </div>
  );
}
