"use client";

import { ChevronLeft, Loader2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }): React.JSX.Element {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return (
    <input
      className={`rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 ${className}`}
      {...props}
    />
  );
}

/** Label + input, stacked — the standard form-field shape used across auth/admin forms. */
export function Field({ label, children }: { label: ReactNode; children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

export function Spinner(): React.JSX.Element {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
    </div>
  );
}

/** Standard top bar: back link + optional icon + title. Used at the top of every inner page. */
export function PageHeader({
  title,
  icon: Icon,
  backHref = "/",
}: {
  title: string;
  icon?: LucideIcon;
  backHref?: string;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <Link href={backHref} className="text-slate-400 hover:text-slate-600">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-black">
        {Icon && <Icon className="h-6 w-6 text-brand-600" />}
        {title}
      </h1>
    </div>
  );
}

/** Small pill label — status, count, category, etc. */
export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "correct" | "wrong";
  className?: string;
}): React.JSX.Element {
  const tones = {
    neutral: "bg-slate-100 text-slate-600",
    brand: "bg-brand-50 text-brand-700",
    correct: "bg-correct-soft text-green-700",
    wrong: "bg-wrong-soft text-red-700",
  };
  return (
    <div
      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold min-w-fit ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

/** Square icon tile — used as the leading avatar/icon in list rows and cards. */
export function IconTile({
  icon: Icon,
  emoji,
  tone = "neutral",
  size = "md",
}: {
  icon?: LucideIcon;
  emoji?: string;
  tone?: "neutral" | "brand";
  size?: "md" | "lg";
}): React.JSX.Element {
  const tones = { neutral: "bg-slate-100 text-slate-600", brand: "bg-brand-50 text-brand-600" };
  const sizes = { md: "h-12 w-12", lg: "h-14 w-14" };
  return (
    <div className={`grid shrink-0 place-items-center rounded-xl ${sizes[size]} ${tones[tone]}`}>
      {Icon ? <Icon className="h-6 w-6" /> : <span className="text-2xl">{emoji}</span>}
    </div>
  );
}

/** Centered placeholder message for empty lists. */
export function EmptyState({ text, icon: Icon }: { text: string; icon?: LucideIcon }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
      {Icon && <Icon className="h-8 w-8" />}
      <p>{text}</p>
    </div>
  );
}

/** Grid tile used for the home-page nav shortcuts. */
export function NavTile({
  href,
  icon: Icon,
  label,
  tone = "neutral",
  wide = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  tone?: "neutral" | "brand";
  wide?: boolean;
}): React.JSX.Element {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    brand: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  };
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-4 text-center font-medium transition ${tones[tone]} ${wide ? "col-span-2" : ""}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

/** Numeric stat tile — dashboards, profile summaries. */
export function StatTile({ label, value }: { label: string; value: number | string }): React.JSX.Element {
  return (
    <Card className="text-center">
      <p className="text-3xl font-black text-brand-600">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </Card>
  );
}
