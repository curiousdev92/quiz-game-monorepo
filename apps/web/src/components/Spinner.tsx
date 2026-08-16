import { FC } from "react";
type PropTypes = { size: "xs" | "s" | "m" | "l" };

const Spinner: FC<PropTypes> = ({ size = "m" }) => {
  const sizes = {
    xs: "w-4 h-4 border-1",
    s: "w-6 h-6 border-2",
    m: "w-8 h-8 border-4",
    l: "w-10 h-10 border-[6px]",
  };

  return (
    <div
      className={`${sizes[size]} border-transparent rounded-full animate-spin`}
      style={{ borderTopColor: "var(--color-zink-300)" }}
    ></div>
  );
};

export default Spinner;
