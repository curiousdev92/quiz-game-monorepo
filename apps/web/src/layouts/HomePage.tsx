"use client";

import IntroHeroImage from "@pub/images/intro-hero-image.png";
import PrizesImage from "@pub/images/prizes.png";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import Button from "@/components/Button";
import Countdown from "@/components/Countdown";
import StrokeText from "@/components/StrokeText";
import { ActiveLeague, api } from "@/lib/api";
import { useGlobalStore } from "@/store/store";

type ModeType = "intro" | "pre-game";

export default function HomePage({ activeLeague }: { activeLeague: ActiveLeague }) {
  const userStatus = useGlobalStore((st) => st.user);
  const router = useRouter();
  const defaultMode = useSearchParams().get("mode") as ModeType;
  const [mode, setMode] = useState<ModeType>(defaultMode ?? "intro");
  const isPreGame = mode === "pre-game";

  const onCTAClick = () => {
    if (!userStatus) {
      router.push("/login?ref=/?mode=pre-game");
    } else if (!isPreGame) {
      setMode("pre-game");
    } else {
      router.push("/play");
    }
  };

  return (
    <>
      <div className="grow mt-4">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            initial={{ opacity: 0, filter: "blur(8px)", y: 20 }}
            animate={{ opacity: 1, filter: "none", y: 0 }}
            exit={{ opacity: 0, filter: "blur(8px)", y: 20 }}
            key={mode}
          >
            {isPreGame ? (
              <Image src={PrizesImage} alt="intro-hero-image" className="max-w-[70%] mx-auto" loading="eager" />
            ) : (
              <Image src={IntroHeroImage} alt="intro-hero-image" className="max-w-[70%] mx-auto" loading="eager" />
            )}
          </motion.div>
        </AnimatePresence>

        {!isPreGame ? (
          <div className="mt-2 backdrop-blur-xl flex flex-col justify-center">
            <StrokeText
              label="10 هفته رقابت!"
              color="#FFD000"
              fontSize={24}
              fontWeight={1000}
              height={32}
              strokeColor="#0000004D"
            />
            <span className="h-0.5"></span>
            <StrokeText
              label="هر هفته ۵ تبلت برای ۵ نفر برتر"
              color="#FEEFA2"
              fontSize={20}
              fontWeight={1000}
              height={26}
              strokeColor="#0000004D"
            />
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex items-center gap-2.5 font-black text-base text-white text-center before:bg-linear-to-r before:from-white before:h-px before:grow after:bg-linear-to-l after:from-white after:h-px after:grow relative">
                زمان باقی مانده تا اتمام این لیگ
              </div>

              <Countdown targetDate={new Date(activeLeague.endsAt).getTime()} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <Button label={mode === "intro" ? "شروع مسابقه" : "بزن بریم"} className="w-full" onClick={onCTAClick} />
      </div>
    </>
  );
}
