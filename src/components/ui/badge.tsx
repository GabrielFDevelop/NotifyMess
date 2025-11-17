import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "warning" | "danger" | "urgent";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const base = "badge";
  const variants: Record<string, string> = {
    default: "badge-default",
    warning: "badge-warning",
    danger: "badge-danger",
    urgent: "badge-urgent",
  };
  return <span className={cn(base, variants[variant], className)}>{children}</span>;
}