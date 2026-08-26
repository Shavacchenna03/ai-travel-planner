import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const control =
  "mt-2 h-12 w-full rounded-2xl border border-[#eae4d9] bg-white px-4 text-sm text-[#0f172a] shadow-xs outline-none transition-all placeholder:text-slate-400 focus:border-[#f97316] focus:ring-4 focus:ring-[#ffedd5] disabled:bg-slate-50 font-medium";

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-bold text-[#0f172a] tracking-tight">
      {children}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${control} ${className}`} {...props}>{children}</select>;
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1.5 text-xs font-semibold text-rose-600">{message}</p> : null;
}
