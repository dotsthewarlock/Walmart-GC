import React from "react";

function Dialog({
  open = true,
  className = "",
  overlayClassName = "",
  titleId,
  children,
  ...props
}) {
  if (!open) {
    return null;
  }

  const overlayClasses = [
    "fixed inset-0 bg-m3-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4",
    overlayClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const panelClasses = [
    "relative flex w-full flex-col gap-4 border border-m3-outline-variant/30 bg-m3-surface shadow-2xl",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={overlayClasses}>
      <div
        className={panelClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export { Dialog };
export default Dialog;
