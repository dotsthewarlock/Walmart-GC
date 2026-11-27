import React from 'react';
import { Button } from './primitives/Button';

function ActionIcon({ name }) {
  if (name === 'wrench') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  if (name === 'external') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    );
  }
  if (name === 'download') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    );
  }
  if (name === 'upload') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    );
  }
  return null;
}

export function ActionButton({ id, onClick, icon, label, className = "", href, target, rel, disabled, variant = "tonal", compact }) {
  const content = (
    <>
      {icon && <ActionIcon name={icon} />}
      <span>{label}</span>
    </>
  );
  const mappedVariant = variant === "primary" ? "filled" : variant === "outlined" ? "outlined" : "tonal";
  const density = compact ? "compact" : "standard";

  return (
    <Button
      id={id}
      onClick={onClick}
      disabled={disabled}
      href={href}
      target={target}
      rel={rel}
      variant={mappedVariant}
      density={density}
      className={`w-full justify-center ${className}`}
      type="button"
    >
      {content}
    </Button>
  );
}
