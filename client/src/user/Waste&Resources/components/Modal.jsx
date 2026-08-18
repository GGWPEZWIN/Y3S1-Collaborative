import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ title, children, onClose, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900 bg-opacity-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={
          "bg-white rounded-xl w-full p-6 my-auto " + (wide ? "max-w-2xl" : "max-w-md")
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
