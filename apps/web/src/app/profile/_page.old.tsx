"use client";

import { Check, Copy, Gamepad2, Gift, Gift as GiftIcon, Lock, LogOut, Trophy, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import { PageHeader, Card, Badge } from "@/components/ui";
import { api, QuestView } from "@/lib/api";
import { getCookie } from "@/lib/helper";
import { useGlobalStore } from "@/store/store";

// Friendly labels for each ScoreReason category.
const REASON_LABELS: Record<string, string> = {
  CORRECT_ANSWER: "پاسخ‌های درست",
  ROUND_BONUS: "پاداش‌های دور",
  REFERRAL_CREDIT: "پاداش دعوت",
  QUEST_REWARD: "پاداش ماموریت",
  LEAGUE_REWARD: "پاداش‌های لیگ",
  ADMIN_ADJUSTMENT: "اصلاحات",
};

export default function MePage(): React.JSX.Element {
  const token = getCookie("token");
  const router = useRouter();
  const user = useGlobalStore((st) => st.user);
  const [referral, setReferral] = useState<{
    code: string;
    uses: number;
    signups: number;
  } | null>(null);
  const [today, setToday] = useState<{
    rank: number | null;
    score: number;
  } | null>(null);
  const [prize, setPrize] = useState<Awaited<ReturnType<typeof api.prizePreview>> | null>(null);
  const [breakdown, setBreakdown] = useState<Awaited<ReturnType<typeof api.scoreBreakdown>> | null>(null);
  const [invitees, setInvitees] = useState<Awaited<ReturnType<typeof api.invitees>> | null>(null);
  const [milestones, setMilestones] = useState<QuestView[] | null>(null);
  const [collecting, setCollecting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadMilestones = (t: string): void => {
    api
      .quests(t)
      .then((qs) =>
        setMilestones(qs.filter((q) => q.verify === "REFERRAL_SIGNUPS").sort((a, b) => (a.goal ?? 0) - (b.goal ?? 0))),
      )
      .catch(() => {});
  };

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api
      .myReferral(token)
      .then(setReferral)
      .catch(() => {});
    api
      .myRank(token, "weekly")
      .then(setToday)
      .catch(() => {});
    api
      .prizePreview(token)
      .then(setPrize)
      .catch(() => {});
    api
      .scoreBreakdown(token)
      .then(setBreakdown)
      .catch(() => {});
    api
      .invitees(token)
      .then(setInvitees)
      .catch(() => {});
    loadMilestones(token);
  }, [token]);

  if (!token) return <Spinner size="m" />;

  const copy = (code: string): void => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const collectMilestone = async (id: string): Promise<void> => {
    if (!token) return;
    setCollecting(id);
    try {
      await api.collectQuest(token, id);
      loadMilestones(token);
      api
        .scoreBreakdown(token)
        .then(setBreakdown)
        .catch(() => {});
    } catch {
      // ignore — button re-enables so the user can retry
    } finally {
      setCollecting(null);
    }
  };

  const rewardLabel = (q: QuestView): string =>
    q.rewardRounds > 0 ? `${q.rewardRounds} دور` : `${q.rewardScore} امتیاز`;

  return (
    <main className="flex flex-1 flex-col gap-5 p-4">
      <PageHeader title="پروفایل من" icon={User} />

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">{user?.displayName ?? user?.phone}</p>
          {user?.isAdmin && <Badge tone="brand">مدیر</Badge>}
        </div>
        <button
          onClick={() => router.replace("/api/auth/logout")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
          خروج
        </button>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-700">دعوت دوستان</p>
        {referral ? (
          <>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-slate-100 px-3 py-2 font-mono text-brand-700">{referral.code}</code>
              <button
                onClick={() => copy(referral.code)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "کپی شد!" : "کپی"}
              </button>
            </div>
            <p className="text-xs text-slate-400">{referral.signups} ثبت‌نام با کد شما</p>
          </>
        ) : (
          <Spinner size="m" />
        )}
      </Card>

      {milestones && milestones.length > 0 && (
        <Card className="flex flex-col gap-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Trophy className="h-4 w-4" />
            هدف‌های دعوت
          </p>
          <div className="flex flex-col gap-2">
            {milestones.map((q) => {
              const goal = q.goal ?? 0;
              const progress = Math.min(q.progress ?? 0, goal);
              const pct = goal > 0 ? Math.round((progress / goal) * 100) : 0;
              const collected = q.state === "COLLECTED";
              const collectible = q.state === "COLLECTIBLE";
              return (
                <div key={q.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{q.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{goal} دعوت</p>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          {q.rewardRounds > 0 ? (
                            <Gamepad2 className="h-3.5 w-3.5" />
                          ) : (
                            <GiftIcon className="h-3.5 w-3.5" />
                          )}
                          {rewardLabel(q)}
                        </p>
                      </div>
                    </div>
                    {collected ? (
                      <Badge tone="correct">دریافت شد</Badge>
                    ) : collectible ? (
                      <Button
                        className="px-3 py-1.5 text-sm"
                        disabled={collecting === q.id}
                        onClick={() => collectMilestone(q.id)}
                      >
                        {collecting === q.id ? "…" : "دریافت"}
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Lock className="h-3.5 w-3.5" />
                        {progress}/{goal}
                      </span>
                    )}
                  </div>
                  {!collected && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">لیگ امروز</p>
          <p className="text-lg font-bold">{today?.score ?? 0} امتیاز</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">رتبه</p>
          <p className="text-lg font-bold">{today?.rank ? `#${today.rank}` : "—"}</p>
        </div>
      </Card>

      {breakdown && breakdown.byReason.length > 0 && (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">جزئیات امتیاز</p>
            <p className="text-lg font-bold text-brand-600">{breakdown.total} امتیاز</p>
          </div>
          <div className="flex flex-col gap-1">
            {breakdown.byReason.map((r) => (
              <div key={r.reason} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{REASON_LABELS[r.reason] ?? r.reason}</span>
                <span className="font-semibold text-slate-800">{r.points} امتیاز</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {invitees && invitees.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Users className="h-4 w-4" />
            دعوتی‌های شما ({invitees.length})
          </p>
          <div className="flex flex-col gap-2">
            {invitees.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-800">{u.name}</span>
                {u.hasPlayed ? (
                  <Badge tone="correct">یک دور بازی کرده</Badge>
                ) : (
                  <Badge tone="neutral">ثبت‌نام کرده</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {prize && prize.prizes.length > 0 && (
        <Card className="border-brand-200 bg-brand-50">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Gift className="h-4 w-4" />
            در مسیر برنده شدن
          </p>
          {prize.prizes.map((p) => (
            <p key={p.id} className="font-bold text-brand-700">
              {p.name}
            </p>
          ))}
          <p className="mt-1 text-xs text-slate-500">با رتبه فعلی شما #{prize.rank}</p>
        </Card>
      )}

      <Button variant="secondary" onClick={() => router.push("/leagues")}>
        <Trophy className="h-4 w-4" />
        مشاهده لیگ‌ها
      </Button>
    </main>
  );
}
