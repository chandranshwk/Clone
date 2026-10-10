import { CircleAlert } from "lucide-react";

export function InlineError({ children }) {
  if (!children) return null;
  return (
    <div className="notice notice-error" role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
