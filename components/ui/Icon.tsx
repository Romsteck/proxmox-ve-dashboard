"use client";

import React from "react";
import clsx from "clsx";
import { LucideIcon } from "lucide-react";

export type IconProps = {
  icon: LucideIcon;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

export function Icon({ icon: IconComponent, size = "md", className }: IconProps) {
  return (
    <IconComponent
      className={clsx(
        sizeClasses[size],
        "flex-shrink-0",
        className
      )}
    />
  );
}

export default Icon;