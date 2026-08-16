"use client";

import { useEffect, useState } from "react";

import CircularCountdown from "@/components/CircularCountdown";
import { api, AuthUser } from "@/lib/api";
import { useGlobalStore } from "@/store/store";

import PlayScore from "./PlayScore";

type PropTypes = {
  token: string;
  startSeconds: number;
  handleFinishGame: () => void;
};

const PlayHeader = ({ token, startSeconds, handleFinishGame }: PropTypes) => {
  const user = useGlobalStore((st) => st.user) as AuthUser;
  const [rank, setRank] = useState<{
    rank: number | null;
    score: number;
  } | null>(null);

  useEffect(() => {
    api.myRank(token, "overall").then(setRank);
  }, []);

  return (
    <header className="flex items-start justify-between">
      <div className="flex gap-2 items-center">
        <div className="w-14">
          <img src="/images/profile.png" />
        </div>
        <div>
          <p className="text-white font-black mb-2">
            {user?.displayName ? decodeURIComponent(user.displayName) : "کاربر"}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-[#FEE072] font-black text-[14px]">امتیاز شما:</span>
            {/* <div ref={handleRef}></div> */}
            {rank?.score ? <PlayScore score={rank?.score} /> : null}
          </div>
        </div>
      </div>

      <div className="relative">
        <img
          alt="clock fantacy image"
          src={"/images/clock-bg.svg"}
          width={60}
          height={60}
          className="absolute -top-2 left-0"
        />

        <CircularCountdown duration={startSeconds} onFinish={handleFinishGame} size={60} />
      </div>
    </header>
  );
};

export default PlayHeader;
