import type { ButtonHTMLAttributes } from "react";
import { cloneElement, isValidElement } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; size?: "default" | "lg" };
const styles = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#16324f] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#234a70] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#187764]";
export function Button({ asChild, size = "default", className = "", children, ...props }: ButtonProps) { const sizeStyle = size === "lg" ? " h-12 px-5" : " h-10"; if (asChild && isValidElement<{ className?: string }>(children)) return cloneElement(children, { className: `${styles}${sizeStyle} ${className} ${children.props.className ?? ""}` }); return <button className={`${styles}${sizeStyle} ${className}`} {...props}>{children}</button>; }
