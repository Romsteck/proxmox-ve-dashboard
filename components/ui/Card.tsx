"use client";

import React from "react";
import clsx from "clsx";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
  interactive?: boolean;
};

export function Card({ className, children, padded = true, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900",
        interactive && "transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
        padded ? "p-4" : "",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("mb-3 flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx("text-sm font-semibold text-gray-900 dark:text-gray-100", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("space-y-3", className)} {...props}>
      {children}
    </div>
  );
}

export default Card;