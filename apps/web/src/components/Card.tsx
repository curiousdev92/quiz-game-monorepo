import { ReactNode } from "react";

const Card = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <div
      style={{ border: "6px outset #B57842" }}
      className={`relative py-5 bg-[#FEF8B0] grow rounded-4xl shadow-[0_0_0_3px_#39251A,0_0_2px_4px_#ffd47b_inset] p-2 max-h-full overflow-auto ${className}`}
    >
      <div className={`font-black text-[#39251A] leading-7 mx-2`}>{children}</div>
    </div>
  );
};

export default Card;
