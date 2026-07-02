import React from "react";

const variantClasses = {
  filled:
    "border border-transparent bg-m3-primary text-m3-on-primary hover:bg-m3-primary/90 active:bg-m3-primary/85",
  tonal:
    "border border-m3-outline-variant/30 bg-m3-surface-container text-m3-on-surface hover:bg-m3-surface-container-high active:bg-m3-surface-container-high",
  outlined:
    "border border-m3-outline-variant bg-transparent text-m3-on-surface-variant hover:bg-m3-surface-container-low hover:text-m3-on-surface active:bg-m3-surface-container-low",
  text:
    "border border-transparent bg-transparent text-m3-primary hover:bg-m3-surface-container-low active:bg-m3-surface-container-low",
  elevated:
    "border border-m3-outline-variant/30 bg-m3-surface-container-lowest text-m3-on-surface hover:bg-m3-surface-container-low active:bg-m3-surface-container-low shadow-sm",
};

const densityClasses = {
  standard: "min-h-[48px] px-4 py-3 text-sm font-semibold",
  compact: "min-h-[40px] px-3 py-2 text-xs font-medium",
};

function Button({
  variant = "filled",
  density = "standard",
  className = "",
  href,
  target,
  rel,
  type = "button",
  disabled = false,
  children,
  ...props
}) {
  const baseClassName = [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full align-middle select-none transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
    variantClasses[variant] || variantClasses.filled,
    densityClasses[density] || densityClasses.standard,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <a
        className={baseClassName}
        href={disabled ? undefined : href}
        target={target}
        rel={rel}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : props.tabIndex}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={baseClassName}
      type={type}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export { Button };
export default Button;
