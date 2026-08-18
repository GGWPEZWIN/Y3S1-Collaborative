import { Leaf } from "lucide-react";

export default function TopBar({ user }) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
            <Leaf size={22} className="text-white" strokeWidth={2.2} />
          </div>
          <span className="text-2xl font-bold tracking-tight">GreenTrip Malaysia</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="text-base font-semibold">{user.name}</p>
            <p className="text-sm text-slate-500">
              Eco Score: {user.ecoScore.toLocaleString()}
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-slate-300 border border-slate-200 flex items-center justify-center">
            <span className="text-sm font-semibold text-slate-700">{initials}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
