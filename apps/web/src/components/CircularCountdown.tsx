"use client";

import { motion } from "motion/react";
import { FC, useEffect, useState } from "react";

type PropTypes = { duration: number; onFinish: () => void; size?: number };

const CircularCountdown: FC<PropTypes> = (props) => {
  const { size = 180, duration, onFinish } = props;
  const [number, setNumber] = useState(duration);
  const strokeWidth = 5;
  const baseSize = 180;
  const scaleFactor = size / baseSize;
  const r = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * r;
  const fontSize = (100 / 1.4) * scaleFactor;

  const strokeColor = number <= duration / 8 ? "#da3036" : number <= duration / 2 ? "#fb7f05" : "#EEFF00";

  useEffect(() => {
    let id = setInterval(() => {
      setNumber((prev) => {
        if (prev <= 1) {
          onFinish?.();
          clearInterval(id);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className="mx-auto">
      <motion.ellipse
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: circumference }}
        transition={{ duration, ease: "linear" }}
        rx={r}
        ry={r}
        cx={"50%"}
        cy={"50%"}
        strokeWidth={strokeWidth}
        stroke={strokeColor}
        fill="transparent"
        strokeLinecap={"round"}
        strokeDasharray={circumference}
        className={`circle -scale-x-[1] origin-center rotate-90 ${number === 0 ? "opacity-0" : "opacity-100"}`}
      />
      <ellipse
        rx={r}
        ry={r}
        cx={"50%"}
        cy={"50%"}
        strokeWidth={strokeWidth}
        stroke={`${strokeColor}60`}
        fill="transparent"
        strokeLinecap={"round"}
        strokeDasharray={circumference}
        className={`circle -scale-x-[1] origin-center rotate-90`}
      />
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        alignmentBaseline="middle"
        fill={strokeColor}
        fontSize={fontSize}
        paintOrder={"stroke fill"}
        fontWeight={700}
        // stroke={"mediumblue"}
        // strokeWidth={6}
        dy={10 * scaleFactor}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        key={number}
      >
        {number}
      </motion.text>
    </svg>
  );
};

export default CircularCountdown;
