"use client";

import BronzeRankImage from "@pub/images/bronze.png";
import GoldRankImage from "@pub/images/gold.png";
import SilverRankImage from "@pub/images/silver.png";
import { motion } from "motion/react";
import Image from "next/image";
import { FC } from "react";

import Score from "./Score";

type PropTypes = {
  rank: number | string;
  name: string;
  score: number | string;
  variant?: "purple" | "blue" | "gold" | "silver" | "bronze";
  isMe?: boolean;
  autofocus?: boolean;
};

const RankItem: FC<PropTypes> = (props) => {
  const { name, rank, score, variant = "blue", isMe = false, autofocus } = props;
  const textStyle = "text-white font-black text-xs";

  const variants = {
    blue: "from-[#2E8DD3] to-[#42B5E4]",
    purple: "from-[#8B2ED3] to-[#D7A3FF]",
    gold: "from-[#CE721C] to-[#E7B939]",
    silver: "from-[#767373] to-[#C1C1C1]",
    bronze: "from-[#713E24] to-[#D77646]",
  };

  const medals = {
    gold: GoldRankImage,
    silver: SilverRankImage,
    bronze: BronzeRankImage,
    blue: null,
    purple: null,
  };

  const top3 = ["gold", "silver", "bronze"].includes(variant);

  return (
    <motion.article
      initial={isMe ? { scale: 1.1 } : undefined}
      animate={isMe ? { scale: 1, transition: { duration: 0.75, delay: 0.5 } } : undefined}
      ref={(el) => {
        if (el && isMe && autofocus) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }}
      className={`bg-linear-to-b ${variants[isMe ? "purple" : "blue"]} shadow-[0px_-20px_0px_0px_#0003_inset] min-h-10 w-full rounded-lg p-2 ps-3 flex items-center justify-between relative overflow-hidden`}
    >
      {isMe ? (
        <motion.span
          className="w-12 h-11 bg-white/50 absolute -left-20 skew-x-[-50deg] origin-right"
          initial={{ transition: { duration: 20, delay: 0.5 } }}
          animate={{ right: -70, transition: { duration: 0.75, delay: 0.5 } }}
        ></motion.span>
      ) : null}
      <div className="flex items-center gap-1.5">
        <div
          className={`${textStyle} size-6 flex justify-center items-center rounded-full relative z-1`}
          style={{ borderColor: variant }}
        >
          {top3 && medals?.[variant] ? (
            <Image
              src={medals[variant]}
              alt={`${variant} medal image`}
              width={48}
              height={48}
              className="absolute z-[-1]"
              style={{
                filter: `drop-shadow(0 0 6px ${variant.replace("bronze", "#713E24")}) drop-shadow(0 0 3px ${variant.replace("bronze", "#713E24")})`,
              }}
            />
          ) : null}
          {rank}
        </div>
        <p className={`${textStyle}`}>
          {name} {isMe ? <span className="text-xs text-gray-300">(شما)</span> : null}
        </p>
      </div>
      <Score score={+score} />
    </motion.article>
  );
};

export default RankItem;
