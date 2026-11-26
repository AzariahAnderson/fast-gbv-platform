"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  id: string;
  label: string;
  /** Small trailing hint inside the label, e.g. "10+ characters". */
  hint?: string;
  autoComplete: string;
  minLength?: number;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Password input with a show/hide toggle. Typed one-handed on a phone in
 * a bad moment: the toggle sits inside comfortable thumb reach, carries a
 * real aria-label, and the field itself keeps FAST's quiet surfaces.
 */
export function PasswordField({
  id,
  label,
  hint,
  autoComplete,
  minLength,
  value,
  onChange,
  invalid,
  describedBy,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim"
      >
        {label}
        {hint ? (
          <span className="font-medium normal-case tracking-normal text-faint"> ({hint})</span>
        ) : null}
      </label>
      <span className="relative block">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="min-h-12 w-full rounded-2xl border-2 border-taupe bg-taupe/15 pl-4 pr-12 text-base text-foreground focus:border-brand focus:outline-none aria-[invalid=true]:border-brand"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-dim hover:text-brand focus-visible:text-brand"
        >
          {visible ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </span>
    </div>
  );
}
