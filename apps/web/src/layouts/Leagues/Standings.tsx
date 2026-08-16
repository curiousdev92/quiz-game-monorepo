import { Trophy } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { JSX } from "react/jsx-runtime";

import Spinner from "@/components/Spinner";
import { EmptyState } from "@/components/ui";
import { api, LeaderboardEntry, LeagueWithMe } from "@/lib/api";
import { formatRange } from "@/lib/helper";
import { useGlobalStore } from "@/store/store";

import MeBadge from "./MeBadge";
import RankItem from "./RankItem";

type StandingTypes = {
  token: string;
  league: LeagueWithMe;
};

export default function Standings({ token, league }: StandingTypes): JSX.Element {
  const user = useGlobalStore((st) => st.user);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  const load = useCallback(
    () => api.leagueStandings(token, league.id).then((r) => setEntries(r.entries)),
    [token, league.id],
  );
  useEffect(() => {
    setEntries(null);
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm">
            {league.title}
            <span className="font-light text-xs ms-1 text-slate-500">
              ({formatRange(league.startsAt, league.endsAt)})
            </span>
          </p>
          <p className="text-xs text-slate-400">{league.frozenAt ? " · بسته شده" : ""}</p>
        </div>
        <MeBadge league={league} />
      </div>
      {!entries ? (
        <Spinner size="s" />
      ) : entries.length === 0 ? (
        <EmptyState text="هنوز امتیازی در این لیگ ثبت نشده است." icon={Trophy} />
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e) => {
            const isMe = e.userId === user?.id;
            return (
              // <li
              //   key={e.userId}
              //   className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              //     isMe
              //       ? "border-brand-400 bg-brand-50"
              //       : "border-slate-200 bg-white"
              //   }`}
              // >
              //   <span className="grid w-8 place-items-center">
              //     <RankMark rank={e.rank} />
              //   </span>
              //   <span className="flex-1 font-medium">
              //     {e.name}{" "}
              //     {isMe && (
              //       <span className="text-xs text-brand-600">(شما)</span>
              //     )}
              //   </span>
              //   <span className="font-bold text-brand-600">{e.score}</span>
              // </li>
              <RankItem
                key={e?.userId}
                rank={e?.rank}
                name={decodeURIComponent(e?.name)}
                score={e?.score}
                variant={e.rank === 1 ? "gold" : e.rank === 2 ? "silver" : e.rank === 3 ? "bronze" : "blue"}
                isMe={isMe}
                autofocus={e.rank > 6}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
