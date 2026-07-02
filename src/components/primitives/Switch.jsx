import React from "react";

function Switch({ className = "", disabled = false, ...props }) {
  const baseClassName = [
    "relative inline-flex shrink-0 items-center justify-end w-[44px] h-[26px] align-middle",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={baseClassName}>
      <input
        type="checkbox"
        disabled={disabled}
        className="peer sr-only"
        {...props}
      />
      <span className="w-full h-full bg-m3-outline-variant/30 border border-m3-outline rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-m3-primary peer-focus-visible:ring-offset-2 peer-checked:bg-m3-primary peer-checked:border-m3-primary peer-disabled:opacity-50" />
      <span className="absolute top-1/2 -translate-y-1/2 left-[4px] w-[14px] h-[14px] bg-m3-outline rounded-full transition-all duration-200 peer-checked:translate-x-[18px] peer-checked:w-[20px] peer-checked:h-[20px] peer-checked:bg-m3-on-primary peer-checked:left-[3px] peer-disabled:opacity-50" />
    </span>
  );
}

export { Switch };
export default Switch;
