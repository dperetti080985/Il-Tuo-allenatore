import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={clsx(
        "rounded-lg px-4 py-2 text-sm font-medium transition",
        variant === "primary" && "bg-brand-500 text-white hover:bg-brand-700",
        variant === "secondary" && "bg-slate-100 text-slate-800 hover:bg-slate-200",
        className
      )}
      {...props}
    />
  );
}
