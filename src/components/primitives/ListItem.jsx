import React from "react";

const baseClasses =
  "flex items-center justify-between py-2 px-4 rounded-xl border transition-all gap-4 cursor-pointer h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary";

function ListItem({
  selected = false,
  used = false,
  disabled = false,
  onClick,
  className = "",
  children,
  ...props
}) {
  const stateClassName = selected
    ? "border-m3-outline-variant/30 bg-m3-surface-container-high text-m3-on-surface"
    : used
      ? "border-m3-outline-variant/10 bg-m3-surface-container-low/40 text-m3-on-surface-variant hover:bg-m3-surface-container hover:border-m3-outline-variant/20"
      : "border-m3-outline-variant/15 bg-m3-surface-container-lowest text-m3-on-surface hover:bg-m3-surface-container-low hover:border-m3-outline-variant/30";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected || undefined}
      className={[baseClasses, stateClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export { ListItem };
export default ListItem;
