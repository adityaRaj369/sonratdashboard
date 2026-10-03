import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary:
        "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
      secondary:
        "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
      ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      outline:
        "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
      destructive:
        "bg-rose-600 text-white shadow-sm hover:bg-rose-500",
    };
    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-3.5 text-sm",
      lg: "h-10 px-4 text-sm",
      icon: "h-9 w-9",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-ring disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
