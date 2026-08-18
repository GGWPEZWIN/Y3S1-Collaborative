import { NAV_ITEMS } from "../constants/waste";

export default function Sidebar({ active, onSelect }) {
  return (
    <aside className="hidden md:block w-64 shrink-0 min-h-screen bg-white">
      <nav className="p-4 space-y-1 sticky top-20">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              aria-current={isActive ? "page" : undefined}
              className={
                "w-full flex items-center gap-4 px-4 py-3 rounded-lg text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 " +
                (isActive
                  ? "bg-green-100 text-green-800 font-medium"
                  : "text-slate-700 hover:bg-slate-100")
              }
            >
              <item.icon size={22} strokeWidth={1.8} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
