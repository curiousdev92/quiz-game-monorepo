import { Medal } from "lucide-react";

type View = "overall" | "current" | "previous";

const MEDAL_COLORS: Record<number, string> = {
  1: "text-yellow-500",
  2: "text-slate-400",
  3: "text-amber-600",
};

export default function RankMark({ rank }: { rank: number }): React.JSX.Element {
  if (rank <= 3) return <Medal className={`h-5 w-5 ${MEDAL_COLORS[rank]}`} />;
  return <span className="text-sm font-bold text-slate-500">{rank}</span>;
}
