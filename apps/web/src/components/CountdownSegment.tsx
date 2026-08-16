import { FC } from "react";

type PropTypes = { value: number; label: string; theme?: "blue" | "dark" };

const CountdownSegment: FC<PropTypes> = (props) => {
  const { value, label, theme } = props;

  return (
    <div
      className={`flex flex-col items-center backdrop-blur-2xl text-white font-black shadow-[0px_-3px_0px_0px_#00000066_inset] ${
        theme === "blue" ? "bg-linear-to-b from-[#2D8CD2] to-[#40B2E2] gap-1.5 w-12" : "bg-system-black/20 w-10"
      } py-2.5 rounded-lg`}
    >
      <span className="text-sm">{value}</span>
      <span className="text-[10px]">{label}</span>
    </div>
  );
};

export default CountdownSegment;
