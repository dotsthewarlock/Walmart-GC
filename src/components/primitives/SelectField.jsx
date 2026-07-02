import React from "react";

const variantClasses = {
  outlined:
    "border border-m3-outline-variant bg-m3-surface-container text-m3-on-surface hover:border-m3-outline focus:border-m3-primary focus:bg-m3-surface-container-lowest",
  filled:
    "border border-transparent bg-m3-surface-container-low text-m3-on-surface hover:bg-m3-surface-container focus:bg-m3-surface-container-lowest focus:border-m3-primary",
};

const densityClasses = {
  standard: "min-h-[48px] px-3.5 py-3 text-sm",
  compact: "min-h-[40px] px-3 py-2 text-xs",
};

const stateClasses =
  "transition-[background-color,color,border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:border-m3-outline-variant/50 disabled:bg-m3-surface-container-low disabled:text-m3-on-surface-variant/70";

function SelectField({
  variant = "outlined",
  density = "standard",
  invalid = false,
  className = "",
  ...props
}) {
  const baseClassName = [
    "w-full rounded-xl align-middle cursor-pointer placeholder:text-m3-on-surface-variant/70",
    variantClasses[variant] || variantClasses.outlined,
    densityClasses[density] || densityClasses.standard,
    stateClasses,
    invalid ? "border-m3-error focus:border-m3-error focus-visible:ring-m3-error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <select className={baseClassName} aria-invalid={invalid || undefined} {...props} />;
}

export { SelectField };
export default SelectField;
