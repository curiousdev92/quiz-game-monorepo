"use client";

import { motion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import Spinner from "./Spinner";
import StrokeText from "./StrokeText";

type VariantTypes = "primary" | "danger" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: ReactNode;
  loading?: boolean;
  variant?: VariantTypes;
  progress?: boolean;
  progressDuration?: number;
  height?: number;
  fontSize?: number;
};

export default function Button(props: ButtonProps): React.JSX.Element {
  const {
    children,
    label,
    onClick,
    loading,
    progress,
    progressDuration = 0,
    id,
    className,
    variant = "primary",
    height = 28,
    fontSize = 18,
    disabled,
    type = "button",
    ...buttonProps
  } = props;
  const content = label ?? children;

  const wrapperStyle =
    "p-1 pb-1.5 rounded-xl border border-[#764220] bg-[#FFDA4E] shadow-[0px_4px_12px_0px_#00000029,0px_-4px_0px_0px_#764220_inset,0px_6px_12px_0px_#00000033] relative before:absolute before:top-0.5 before:bottom-0.5 before:left-0 before:right-0 before:bg-linear-to-b before:from-[#FFA22B] before:to-[#B86B42] before:rounded-[10px]";
  const elementStyle =
    "cursor-pointer flex justify-center w-full p-3 text-center text-white font-[1000] text-sm bg-linear-to-b rounded-lg relative z-1 before:absolute before:bg-linear-to-b before:from-system-white/40 before:to-transparent before:h-5 before:rounded-md before:left-[5.5px] before:top-0.75 before:right-[5.5px] after:absolute after:inset-1 after:rounded-md after:-z-1 after:shadow-[0px_2px_2px_0px_#00000040] overflow-hidden disabled:cursor-not-allowed disabled:opacity-60";
  const variants: Record<VariantTypes, string> = {
    primary: "to-[#206281] from-[#3984B0] border border-[#13516F] stroke-[#13516F] after:bg-[#2E8DD3]",
    secondary: "to-[#537A40] from-[#7BAC3C] border border-[#355323] stroke-[#355323] after:bg-[#89AD41]",
    danger: "to-[#B03939] from-[#812020] border border-[#6F1313] stroke-[#6F1313] after:bg-[#D32E2E]",
  };

  return (
    <div className={`${wrapperStyle} ${className}`}>
      <button
        onClick={onClick}
        className={`${elementStyle} ${variants[variant]}`}
        disabled={disabled || loading || (progress && progressDuration > 0)}
        id={id}
        type={type}
        {...buttonProps}
      >
        {loading ? (
          <Spinner size="s" />
        ) : (
          <StrokeText label={content} height={height} fontSize={fontSize} strokeWidth={6} />
        )}
        {progress && progressDuration ? (
          <motion.span
            className="absolute bg-system-black/40 left-0 top-0 right-0 bottom-0 overflow-hidden w-full"
            style={{ animationDuration: `${progressDuration}ms` }}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: progressDuration / 1000 }}
          ></motion.span>
        ) : null}
      </button>
    </div>
  );
}
