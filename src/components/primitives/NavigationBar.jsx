import React from "react";

function NavigationBar({
  className = "",
  children,
  ...props
}) {
  return (
    <nav
      className={["fixed bottom-0 left-0 right-0 h-20 z-40 md:static flex border-t border-m3-outline-variant/30 bg-m3-surface-container w-full", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </nav>
  );
}

function NavigationBarItem({
  selected = false,
  disabled = false,
  onClick,
  icon,
  label,
  id,
  className = "",
  children,
  ...props
}) {
  const itemClassName = [
    "flex-1 flex flex-col items-center justify-center h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2",
    disabled ? "disabled:opacity-30 disabled:cursor-not-allowed" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const iconClassName = [
    "flex items-center justify-center w-14 h-7 rounded-xl transition-all",
    selected
      ? "bg-m3-primary-container text-m3-on-primary-container border border-m3-primary/20 shadow-sm"
      : "text-m3-on-surface-variant hover:bg-m3-surface-container-low",
  ].join(" ");

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={itemClassName}
      aria-current={selected ? "page" : undefined}
      {...props}
    >
      <div className={iconClassName} aria-hidden="true">
        {icon}
      </div>
      <span className={`text-[11px] font-bold mt-1 tracking-wide transition-all ${selected ? 'text-m3-on-surface' : 'text-m3-on-surface-variant'}`}>
        {label}
      </span>
      {children}
    </button>
  );
}

export { NavigationBar, NavigationBarItem };
export default NavigationBar;
