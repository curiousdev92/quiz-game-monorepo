"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ContextWrapper from "@/components/ContextWrapper";
import Countdown from "@/components/Countdown";
import { Tabs } from "@/components/Tab";
import { formatRange } from "@/lib/helper";
import { showError } from "@/lib/toast";

import { EmptyState, Spinner } from "../../components/ui";
import { ActiveLeague, api, type LeagueWithMe } from "../../lib/api";
import Header from "../Header";
import LeagueList from "./LeagueList";
import LeagueStandings from "./LeagueStandings";
import MeBadge from "./MeBadge";

type View = "overall" | "current" | "previous";

interface LeaguesData {
  overall: LeagueWithMe | null;
  current: LeagueWithMe[];
  previousGroups: Array<{
    parent: LeagueWithMe | null;
    leagues: LeagueWithMe[];
  }>;
}

export default function LeaguesPage({
  token,
  activeLeague,
}: {
  token: string;
  activeLeague: ActiveLeague | null;
}): React.JSX.Element {
  const [data, setData] = useState<LeaguesData | null>(null);
  const router = useRouter();
  const [tab, setTab] = useState<View>("current");

  useEffect(() => {
    api
      .leagues(token)
      .then(setData)
      .catch((e) => {
        setData({ overall: null, current: [], previousGroups: [] });
        showError(e);
      });
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-5 p-4">
      {/* <PageHeader title="لیگ‌ها" icon={Trophy} /> */}
      <Header
        infoModalContent={"بزن روی «بازی دوباره» و بعد ازتموم شدن  شمارش معکوس مسابقه رو بترکون"}
        hasInfo
        onBackClick={router.back}
        middleContent={
          activeLeague ? <Countdown targetDate={new Date(activeLeague.endsAt).getTime()} theme="dark" /> : null
        }
      />

      <ContextWrapper
        className="pt-10 max-h-[calc(var(--window-inner-height)-87px-96px)]"
        ribbonType={"red"}
        content={
          <div className="flex flex-col gap-3">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { label: "کلی", value: "overall" },
                { label: "فعلی", value: "current" },
                { label: "قبلی", value: "previous" },
              ]}
            />

            {!data ? (
              <Spinner />
            ) : tab === "overall" ? (
              data.overall ? (
                <LeagueStandings token={token} league={data.overall} />
              ) : (
                <EmptyState text="هنوز کمپین کلی ساخته نشده است." />
              )
            ) : tab === "current" ? (
              <LeagueList token={token} leagues={data.current} emptyText="فعلا لیگ فعالی وجود ندارد." />
            ) : (
              <PreviousAccordion token={token} groups={data.previousGroups} />
            )}
          </div>
        }
        title={"رده‌بندی"}
      />
    </main>
  );
}

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

/** Previous leagues grouped as accordions: overall campaign → its finished weekly leagues. */
function PreviousAccordion({
  token,
  groups,
}: {
  token: string;
  groups: Array<{ parent: LeagueWithMe | null; leagues: LeagueWithMe[] }>;
}): React.JSX.Element {
  const [selected, setSelected] = useState<LeagueWithMe | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  if (selected) {
    return (
      <div className="flex flex-col gap-3">
        <BackButton onClick={() => setSelected(null)} />
        <LeagueStandings token={token} league={selected} />
      </div>
    );
  }

  if (groups.length === 0) return <EmptyState text="هنوز لیگ تمام‌شده‌ای وجود ندارد." icon={Trophy} />;

  return (
    <ul className="flex flex-col gap-2">
      {groups.map((g, i) => {
        const key = g.parent?.id ?? `ungrouped-${i}`;
        const isOpen = openId === key;
        return (
          <li key={key} className="rounded-xl border border-slate-200 bg-white">
            <button
              onClick={() => setOpenId(isOpen ? null : key)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="font-medium">{g.parent?.title ?? "لیگ‌های دیگر"}</p>
                <p className="text-xs text-slate-400">
                  {g.parent ? formatRange(g.parent.startsAt, g.parent.endsAt) : "وابسته به کمپین نیست"} ·{" "}
                  {g.leagues.length} لیگ
                </p>
              </div>
              <div className="flex items-center gap-3">
                {g.parent && <MeBadge league={g.parent} />}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>
            {isOpen && (
              <ul className="flex flex-col gap-1 border-t border-slate-200 px-3 py-2">
                {g.leagues.length === 0 ? (
                  <li className="px-2 py-2 text-sm text-slate-400">هنوز لیگ هفتگی در این کمپین نیست.</li>
                ) : (
                  g.leagues.map((l) => (
                    <li key={l.id}>
                      <button
                        onClick={() => setSelected(l)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-medium">{l.title}</p>
                          <p className="text-xs text-slate-400">{formatRange(l.startsAt, l.endsAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <MeBadge league={l} />
                          <span className="text-xs text-slate-400">نهایی</span>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
