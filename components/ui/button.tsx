import type { ButtonHTMLAttributes } from "react";
import { cloneElement, isValidElement } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: "default" | "lg" | "sm";
};

const defaultStyles =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f97316]";

export function Button({ asChild, size = "default", className = "", children, ...props }: ButtonProps) {
  const sizeStyle =
    size === "lg"
      ? " h-12 px-6 text-base"
      : size === "sm"
      ? " h-9 px-3 text-xs"
      : " h-10 px-4 text-sm";

  const baseClassName = `${defaultStyles} ${sizeStyle} ${className}`;

  if (asChild && isValidElement<{ className?: string }>(children)) {
    return cloneElement(children, {
      className: `${baseClassName} ${children.props.className ?? ""}`,
    });
  }

  return (
    <button className={baseClassName} {...props}>
      {children}
    </button>
  );
}
