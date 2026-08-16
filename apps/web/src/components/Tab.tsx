type TabValue = string;

export interface TabItem<T extends TabValue = string> {
  label: React.ReactNode;
  value: T;
}

interface TabsProps<T extends TabValue = string> {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  tabClassName?: string;
}

export function Tabs<T extends TabValue>({ items, value, onChange, className = "", tabClassName = "" }: TabsProps<T>) {
  const activeClass = "inset-shadow-[0_0_6px_#00000065] border border-[#00000045] text-[#39251a]";

  const inactiveClass = "text-[#39251a90]";

  return (
    <div
      className={`relative z-1 flex gap-2 rounded-xl border border-[#764220] bg-[#FFDA4E] p-1 shadow-[0px_4px_12px_0px_#00000029,0px_-4px_0px_0px_#764220_inset,0px_6px_12px_0px_#00000033] before:absolute before:top-0.5 before:right-0 before:bottom-0.5 before:left-0 before:-z-1 before:rounded-[10px] before:bg-linear-to-b before:from-[#FFA22B] before:to-[#B86B42] ${className}`}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`flex w-full cursor-pointer justify-center rounded-lg bg-linear-to-b p-2 text-center text-sm font-[1000] transition-colors ${
            value === item.value ? activeClass : inactiveClass
          } ${tabClassName}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
