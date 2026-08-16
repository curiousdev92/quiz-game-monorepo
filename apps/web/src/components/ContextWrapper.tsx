"use client";

import RedRibbonImage from "@pub/images/red-ribbon.svg";
import YellowRibbonImage from "@pub/images/yellow-ribbon.png";
import Image from "next/image";
import { FC, ReactNode } from "react";

import Button from "@/components/Button";
import StrokeText from "@/components/StrokeText";
import { preventClickBubble } from "@/lib/helper";

type PropTypes = {
  ribbonType: "red" | "yellow";
  content: ReactNode;
  title: string;
  className?: string;
  hasCTA?: boolean;
  ctaLabel?: string;
  onCTAClick?: () => void;
};

const ContextWrapper: FC<PropTypes> = (props) => {
  const { content, ribbonType, title, className, hasCTA = false, ctaLabel = "متوجه شدم", onCTAClick } = props;

  return (
    <div
      className={`relative grow ${ribbonType === "red" ? "pt-10" : "pt-4"} ${className}`}
      onClick={preventClickBubble}
    >
      {/* Top Ribbon */}
      <div className="absolute z-1 left-0 right-0 flex justify-center" style={{ top: ribbonType === "red" ? 0 : -16 }}>
        <Image
          src={ribbonType === "red" ? RedRibbonImage : YellowRibbonImage}
          alt="title banner"
          className="min-h-16"
        />
      </div>

      {/* Title */}
      <div className="absolute z-1 left-0 right-0" style={{ top: ribbonType === "red" ? 12 : 0 }}>
        <StrokeText
          label={title}
          color={ribbonType === "red" ? "white" : "#39251A"}
          fontWeight={900}
          fontSize={18}
          height={28}
          strokeColor={ribbonType === "red" ? "#dd0835" : "#FEDF70"}
          strokeWidth={6}
        />
      </div>

      {/* Background container */}
      <div
        style={{ border: "6px outset #B57842" }}
        className="relative bg-[#FEF8B0] rounded-4xl shadow-[0_0_0_3px_#39251A,0_0_2px_4px_#ffd47b_inset] p-2 min-h-60 max-h-full overflow-auto"
      >
        <div
          className={`text-center font-black text-[#39251A] leading-7 mx-2 ${hasCTA ? "pb-8" : "pb-4"} ${ribbonType === "red" ? "pt-8" : "pt-10"}`}
        >
          {content}
        </div>
      </div>

      {/* CTA */}

      {hasCTA ? (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-1/2">
          <Button variant="primary" label={ctaLabel} onClick={onCTAClick} fontSize={14} />
        </div>
      ) : null}
    </div>
  );
};

export default ContextWrapper;
