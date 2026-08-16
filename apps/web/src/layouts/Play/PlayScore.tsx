import Image from "next/image";
import { FC } from "react";

type PropTypes = { score: number };

const PlayScore: FC<PropTypes> = ({ score }) => {
  return (
    <div className="rounded-full bg-system-black/40 py-0.5 ps-1.5 pe-6 relative min-h-6 flex items-center justify-center w-fit min-w-16">
      <Image alt="gold coin" src="/images/coin.png" width={24} height={24} className="absolute -left-1" />
      <span className="text-white text-body-sm font-black">{score}</span>
    </div>
  );
};

export default PlayScore;
