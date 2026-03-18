import React from "react";

const VARIANT_CLASSES: Record<ButtonProps["variant"], string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-slate-200 text-slate-700 hover:bg-slate-300",
  danger: "bg-red-100 text-red-700 hover:bg-red-200",
  warning: "bg-amber-600 text-white hover:bg-amber-700",
  ghost: "text-blue-600 hover:text-blue-700",
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 rounded text-sm",
  md: "px-4 py-2 rounded-lg text-sm",
  lg: "w-full px-6 py-3 rounded-lg text-base font-bold",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: "primary" | "secondary" | "danger" | "warning" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export default function Button({
  variant,
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} transition disabled:opacity-50 ${className}`}
      {...rest}
    >
      {loading ? "..." : children}
    </button>
  );
}
