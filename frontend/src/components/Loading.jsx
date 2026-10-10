import { LoaderCircle } from "lucide-react";

export function Loading({ label = "Loading" }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle size={18} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
