import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/ui";
import { LeagueWithMe } from "@/lib/api";
import { formatRange } from "@/lib/helper";

import MeBadge from "./MeBadge";
import Standings from "./Standings";

function BackButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 self-start text-sm text-slate-500 hover:text-slate-700"
    >
      <ChevronLeft className="h-4 w-4" />
      همه لیگ‌ها
    </button>
  );
}

export default function LeagueList({
  token,
  leagues,
  emptyText,
  final,
}: {
  token: string;
  leagues: LeagueWithMe[];
  emptyText: string;
  final?: boolean;
}): React.JSX.Element {
  const [selected, setSelected] = useState<LeagueWithMe | null>(null);

  if (selected) {
    return (
      <div className="flex flex-col gap-3">
        <BackButton onClick={() => setSelected(null)} />
        <Standings token={token} league={selected} />
      </div>
    );
  }
  if (leagues.length === 0) return <EmptyState text={emptyText} icon={Trophy} />;
  // Single league → show its board directly.
  if (leagues.length === 1) return <Standings token={token} league={leagues[0]} />;

  return (
    <ul className="flex flex-col gap-2">
      {leagues.map((l) => (
        <li key={l.id}>
          <button
            onClick={() => setSelected(l)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-brand-400"
          >
            <div>
              <p className="font-medium">{l.title}</p>
              <p className="text-xs text-slate-400">{formatRange(l.startsAt, l.endsAt)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <MeBadge league={l} />
              <span className="flex items-center gap-0.5 text-xs text-slate-400">
                {l.frozenAt ? "نهایی" : "زنده"}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
