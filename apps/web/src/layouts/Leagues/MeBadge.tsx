import { Badge } from "@/components/ui";
import { LeagueWithMe } from "@/lib/api";

/** Rank/score badge shown on every league entity's title (overall, weekly, campaign). */
export default function MeBadge({ league }: { league: LeagueWithMe }): React.JSX.Element {
  return <Badge tone="brand">{league.myRank ? `#${league.myRank} · ${league.myScore} امتیاز` : "بدون رتبه"}</Badge>;
}
