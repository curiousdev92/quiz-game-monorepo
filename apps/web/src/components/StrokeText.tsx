import { FC, ReactNode, SVGAttributes } from "react";

type PropTypes = {
  label: ReactNode;
  color?: SVGAttributes<SVGTextElement>["fill"];
  strokeWidth?: SVGAttributes<SVGTextElement>["strokeWidth"];
  fontWeight?: SVGAttributes<SVGTextElement>["fontWeight"];
  fontSize?: SVGAttributes<SVGTextElement>["fontSize"];
  height?: SVGAttributes<SVGTextElement>["height"];
  strokeColor?: SVGAttributes<SVGTextElement>["stroke"];
};

const StrokeText: FC<PropTypes> = (props) => {
  const { label, color, fontWeight, strokeWidth, fontSize = 14, height = 20, strokeColor } = props;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={"100%"} height={height}>
      <text
        x="50%"
        y="50%"
        fill={color || "white"}
        strokeWidth={strokeWidth || "4"}
        strokeLinecap="round"
        strokeLinejoin="round"
        fontSize={fontSize}
        fontWeight={fontWeight}
        paintOrder={"stroke fill"}
        dominantBaseline="middle"
        textAnchor="middle"
        stroke={strokeColor}
      >
        {label}
      </text>
    </svg>
  );
};

export default StrokeText;
