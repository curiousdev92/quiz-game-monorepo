"use client";

import { FC, InputHTMLAttributes, ReactNode } from "react";

const wrapperStyle =
  "flex p-1 pb-1.5 rounded-xl border border-[#764220] bg-[#FFDA4E] shadow-[0px_4px_12px_0px_#00000029,0px_-4px_0px_0px_#764220_inset,0px_6px_12px_0px_#00000033] relative before:absolute before:top-0.5 before:bottom-0.5 before:left-0 before:right-0 before:bg-linear-to-b before:from-[#FFA22B] before:to-[#B86B42] before:rounded-[10px]";
const elementStyle =
  "grow max-w-full p-2 font-[1000] text-sm bg-linear-to-b rounded-lg relative z-1 overflow-hidden disabled:cursor-not-allowed disabled:opacity-60 shadow-[3px_3px_6px_#00000033_inset,-3px_-3px_6px_#db873d33_inset] bg-white";

type PropTypes = {
  name: string;
  label: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

const TextField: FC<PropTypes> = ({ name, label, ...props }) => {
  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="mb-1 text-sm text-start">
        {label}
      </label>
      <div className={`${wrapperStyle}`}>
        <input type="text" id={name} name={name} className={elementStyle} {...props} />
      </div>
    </div>
  );
};

export default TextField;
