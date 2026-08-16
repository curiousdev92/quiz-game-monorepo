import React, { useEffect, useState } from "react";

import CountdownSegment from "./CountdownSegment";

interface CountdownProps {
  targetDate: number; // Target date as a string (ISO format or any valid Date format)
  theme?: "blue" | "dark";
}

const Countdown: React.FC<CountdownProps> = ({ targetDate, theme = "blue" }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now - 12600000;

      if (distance <= 0) {
        clearInterval(interval);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex gap-1.5 items-center justify-center" dir="ltr">
      {/* Days */}
      <CountdownSegment value={timeLeft.days} label="روز" theme={theme} />
      <span className="text-white/80 font-black text-xs">:</span>
      {/* Hours */}
      <CountdownSegment value={timeLeft.hours} label="ساعت" theme={theme} />
      <span className="text-white/80 font-black text-xs">:</span>
      {/* Minutes */}
      <CountdownSegment value={timeLeft.minutes} label="دقیقه" theme={theme} />
      <span className="text-white/80 font-black text-xs">:</span>
      {/* Seconds */}
      <CountdownSegment value={timeLeft.seconds} label="ثانیه" theme={theme} />
    </div>
  );
};

export default Countdown;
