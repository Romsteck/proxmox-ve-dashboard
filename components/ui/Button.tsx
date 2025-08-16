"use client";

import React from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
const variants: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600",
  secondary:
    "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
  ghost:
    "bg-transparent text-gray-800 hover:bg-gray-100 focus:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      aria-busy={loading || undefined}
      {...props}
    >
      {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      <span className={clsx(loading && "opacity-80")}>{children}</span>
      {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
      {loading ? (
        <span
          className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}

export default Button;