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
import Score from "./Score";

type StandingTypes = {
  token: string;
  league: LeagueWithMe;
};

export default function CurrentLeague({ token, league }: StandingTypes): JSX.Element {
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
        <Score score={league.myScore} />
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
