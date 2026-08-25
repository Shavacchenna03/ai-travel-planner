import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const control = "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-[#16324f] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#187764] focus:ring-3 focus:ring-[#d8eee8] disabled:bg-slate-50";
export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) { return <label htmlFor={htmlFor} className="text-sm font-semibold text-[#29455f]">{children}</label>; }
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={`${control} ${className}`} {...props} />; }
export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select className={`${control} ${className}`} {...props}>{children}</select>; }
export function FieldError({ message }: { message?: string }) { return message ? <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p> : null; }
