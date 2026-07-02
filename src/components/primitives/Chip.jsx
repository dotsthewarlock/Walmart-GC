import React from "react";

const variantClasses = {
  filled:
    "border border-transparent bg-m3-primary text-m3-on-primary hover:bg-m3-primary/90 active:bg-m3-primary/85",
  tonal:
    "border border-m3-outline-variant/30 bg-m3-surface-container text-m3-on-surface hover:bg-m3-surface-container-high active:bg-m3-surface-container-high",
  outlined:
    "border border-m3-outline-variant bg-transparent text-m3-on-surface-variant hover:bg-m3-surface-container-low hover:text-m3-on-surface active:bg-m3-surface-container-low",
  elevated:
    "border border-m3-outline-variant/30 bg-m3-surface-container-lowest text-m3-on-surface hover:bg-m3-surface-container-low active:bg-m3-surface-container-low shadow-sm",
};

const sizeClasses = {
  standard: "min-h-[32px] px-3 py-1.5 text-xs font-medium",
  compact: "min-h-[28px] px-2.5 py-1 text-[11px] font-medium",
};

function Chip({
  variant = "tonal",
  size = "standard",
  selected = false,
  disabled = false,
  onClick,
  href,
  target,
  rel,
  className = "",
  type = "button",
  children,
  ...props
}) {
  const baseClassName = [
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full align-middle select-none transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
    variantClasses[variant] || variantClasses.tonal,
    sizeClasses[size] || sizeClasses.standard,
    selected ? "ring-1 ring-m3-primary/20" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = children;

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
        {content}
      </a>
    );
  }

  if (typeof onClick === "function") {
    return (
      <button
        className={baseClassName}
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected || undefined}
        {...props}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={baseClassName}
      aria-disabled={disabled || undefined}
      {...props}
    >
      {content}
    </span>
  );
}

function StatusChip({
  status = "neutral",
  size = "standard",
  className = "",
  indicatorClassName = "",
  onClick,
  href,
  target,
  rel,
  selected = false,
  disabled = false,
  children,
  ...props
}) {
  const statusClasses = {
    neutral: "text-m3-on-surface-variant",
    success: "!border-transparent !bg-m3-success-container !text-m3-on-success-container hover:!bg-m3-success-container/90 active:!bg-m3-success-container/85",
    warning: "!border-transparent !bg-m3-warning-container !text-m3-on-warning-container hover:!bg-m3-warning-container/90 active:!bg-m3-warning-container/85",
    danger: "!border-transparent !bg-m3-error-container !text-m3-error hover:!bg-m3-error-container/90 active:!bg-m3-error-container/85",
  };

  const dotClasses = {
    neutral: "bg-m3-outline",
    success: "bg-current",
    warning: "bg-current",
    danger: "bg-current",
  };

  const variant = status === "success" ? "filled" : status === "warning" ? "outlined" : status === "danger" ? "outlined" : "tonal";

  return (
    <Chip
      variant={variant}
      size={size}
      selected={selected}
      disabled={disabled}
      onClick={onClick}
      href={href}
      target={target}
      rel={rel}
      className={`${statusClasses[status] || statusClasses.neutral} ${className}`}
      {...props}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[status] || dotClasses.neutral} ${indicatorClassName}`}
        aria-hidden="true"
      />
      <span className="truncate">{children}</span>
    </Chip>
  );
}

export { Chip, StatusChip };
export default Chip;
