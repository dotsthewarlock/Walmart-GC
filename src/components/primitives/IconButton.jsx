import React from "react";

const variantClasses = {
  standard:
    "border border-transparent bg-transparent text-m3-on-surface-variant hover:bg-m3-surface-container-low hover:text-m3-on-surface active:bg-m3-surface-container-low",
  filled:
    "border border-transparent bg-m3-primary text-m3-on-primary hover:bg-m3-primary/90 active:bg-m3-primary/85",
  tonal:
    "border border-m3-outline-variant/30 bg-m3-surface-container text-m3-on-surface hover:bg-m3-surface-container-high active:bg-m3-surface-container-high",
  outlined:
    "border border-m3-outline-variant bg-transparent text-m3-on-surface-variant hover:bg-m3-surface-container-low hover:text-m3-on-surface active:bg-m3-surface-container-low",
};

const sizeClasses = {
  standard: "size-12 text-lg",
  compact: "size-11 text-base",
};

function IconButton({
  variant = "standard",
  size = "standard",
  className = "",
  type = "button",
  disabled = false,
  children,
  ...props
}) {
  const baseClassName = [
    "inline-flex shrink-0 items-center justify-center rounded-full align-middle select-none transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
    variantClasses[variant] || variantClasses.standard,
    sizeClasses[size] || sizeClasses.standard,
    className,
  ]
    .filter(Boolean)
    .join(" ");

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

export { IconButton };
export default IconButton;
