import React from "react";

const variantClasses = {
  surface: "bg-m3-surface text-m3-on-surface",
  container: "bg-m3-surface-container text-m3-on-surface border border-m3-outline-variant/20",
  "container-low": "bg-m3-surface-container-low text-m3-on-surface border border-m3-outline-variant/20",
  "container-lowest": "bg-m3-surface-container-lowest text-m3-on-surface border border-m3-outline-variant/20",
  outlined: "bg-m3-surface text-m3-on-surface border border-m3-outline-variant/30",
  dashed: "bg-m3-surface-container-low text-m3-on-surface border border-dashed border-m3-outline-variant",
};

const shapeClasses = {
  none: "",
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
};

function Surface({
  as: Tag = "div",
  variant = "surface",
  shape = "md",
  className = "",
  ...props
}) {
  const baseClassName = [
    variantClasses[variant] || variantClasses.surface,
    shapeClasses[shape] || shapeClasses.md,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Tag className={baseClassName} {...props} />;
}

export { Surface };
export default Surface;
