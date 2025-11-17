import * as React from "react";
import { cn } from "../../lib/utils";

type Variant = "default" | "secondary" | "destructive" | "surface";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  const base = "button";
  const variants: Record<Variant, string> = {
    default: "button-default",
    secondary: "button-secondary",
    destructive: "button-destructive",
    surface: "button-surface",
  };
  const sizes: Record<Size, string> = {
    sm: "button-sm",
    md: "button-md",
    lg: "button-lg",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}