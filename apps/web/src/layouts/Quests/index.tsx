"use client";

import { Gamepad2, Gift, Map, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import Card from "@/components/Card";
import ContextWrapper from "@/components/ContextWrapper";
import { Badge, EmptyState, IconTile, Spinner } from "@/components/ui";
import { api, LeagueReward, QuestView } from "@/lib/api";
import { showError, showSuccess } from "@/lib/toast";

export default function QuestsPage({ token }: { token: string }): React.JSX.Element {
  const [quests, setQuests] = useState<QuestView[] | null>(null);
  const [rewards, setRewards] = useState<LeagueReward[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    api
      .quests(token)
      .then(setQuests)
      .catch((e) => {
        setQuests([]);
        showError(e);
      });
    api
      .myLeagueRewards(token)
      .then(setRewards)
      .catch((e) => {
        setRewards([]);
        showError(e);
      });
  }, [token]);
  useEffect(load, [load]);

  async function collectReward(r: LeagueReward, choice?: "POINTS" | "DISCOUNT"): Promise<void> {
    if (!token) return;
    setBusy(r.id);
    try {
      const res = await api.collectLeagueReward(token, r.id, choice);
      const bits = [`+${res.awardedPoints} امتیاز`];
      if (res.physicalPrize) bits.push(`🎁 ${res.physicalPrize}`);
      if (res.discountCode) bits.push(`کد ${res.discountCode}`);
      showSuccess(bits.join(" · "));
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  }

  async function collect(q: QuestView): Promise<void> {
    if (!token) return;
    setBusy(q.id);
    try {
      const r = await api.collectQuest(token, q.id);
      const bits: string[] = [];
      if (r.awardedScore > 0) bits.push(`+${r.awardedScore} امتیاز`);
      if (r.awardedRounds > 0) bits.push(`+${r.awardedRounds} دور`);
      showSuccess(bits.join(" · ") || "دریافت شد");
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  }

  async function redeem(q: QuestView): Promise<void> {
    if (!token) return;
    setBusy(q.id);
    try {
      const r = await api.redeemQuest(token, q.id);
      const bits: string[] = ["دسترسی فعال شد"];
      if (r.awardedScore > 0) bits.push(`+${r.awardedScore} امتیاز`);
      if (r.awardedRounds > 0) bits.push(`+${r.awardedRounds} دور`);
      showSuccess(bits.join(" · "));
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  }

  async function openTask(q: QuestView): Promise<number> {
    if (!token) return q.minDwellSeconds;
    try {
      const r = await api.openQuest(token, q.id);
      return r.collectibleInSeconds;
    } catch {
      return q.dwellRemaining ?? q.minDwellSeconds;
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <ContextWrapper
        content={
          <>
            {rewards && rewards.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Trophy className="h-4 w-4" />
                  پاداش‌های لیگ
                </p>
                {rewards.map((r) => (
                  <RewardCard
                    key={r.id}
                    reward={r}
                    busy={busy === r.id}
                    onCollect={(choice) => collectReward(r, choice)}
                  />
                ))}
              </div>
            ) : null}
          </>
        }
        ribbonType="red"
        title="ماموریتها"
      />

      {!quests ? (
        <Spinner />
      ) : quests.length === 0 ? (
        <EmptyState text="فعلا ماموریتی در دسترس نیست." icon={Map} />
      ) : (
        <ul className="flex flex-col gap-3">
          {quests.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              busy={busy === q.id}
              onCollect={() => collect(q)}
              onRedeem={() => redeem(q)}
              onOpen={() => openTask(q)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function QuestCard({
  quest,
  busy,
  onCollect,
  onRedeem,
  onOpen,
}: {
  quest: QuestView;
  busy: boolean;
  onCollect: () => void;
  onRedeem: () => void;
  onOpen: () => Promise<number>;
}): React.JSX.Element {
  // Honor-system dwell gate: player must open the link and wait before Collect unlocks.
  const needsDwell = quest.verify === "NONE" && quest.minDwellSeconds > 0;
  // Server reports progress < full ⇒ the player already opened it in a previous visit.
  const openedBefore = needsDwell && quest.dwellRemaining != null && quest.dwellRemaining < quest.minDwellSeconds;
  const [opened, setOpened] = useState(openedBefore);
  const [remaining, setRemaining] = useState<number | null>(
    needsDwell ? (quest.dwellRemaining ?? quest.minDwellSeconds) : null,
  );

  useEffect(() => {
    if (!opened || remaining == null || remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => (r == null ? r : Math.max(0, r - 1))), 1000);
    return () => clearInterval(t);
  }, [opened, remaining]);

  async function handleOpen(): Promise<void> {
    if (quest.actionUrl) window.open(quest.actionUrl, "_blank", "noopener,noreferrer");
    setOpened(true);
    const secs = await onOpen();
    setRemaining(secs);
  }

  // Whether the dwell timer still blocks collection.
  const dwellBlocked = needsDwell && (!opened || (remaining ?? 0) > 0);
  const collectedOrExpired = quest.state === "COLLECTED" || quest.state === "EXPIRED";
  // For dwell quests the server state stays LOCKED until reload, so trust the local timer once it hits 0.
  const canCollect = needsDwell
    ? opened && (remaining ?? 1) <= 0 && !collectedOrExpired
    : quest.state === "COLLECTIBLE";

  const badge = {
    COLLECTIBLE: { text: "آماده دریافت", tone: "correct" as const },
    COLLECTED: { text: "دریافت شد", tone: "neutral" as const },
    LOCKED: { text: "قفل", tone: "neutral" as const },
    EXPIRED: { text: "منقضی", tone: "wrong" as const },
  }[quest.state];

  const dim = quest.state === "COLLECTED" || quest.state === "EXPIRED";

  return (
    <Card className={dim ? "opacity-60" : ""}>
      <div className="flex items-start gap-3">
        <IconTile emoji={quest.icon} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold">{quest.title}</h3>
            <span className="shrink-0 text-right text-sm font-bold text-brand-600">
              {quest.rewardScore > 0 && <span>+{quest.rewardScore}</span>}
              {quest.rewardRounds > 0 && (
                <span className="flex items-center justify-end gap-0.5 text-xs text-green-700">
                  +{quest.rewardRounds}
                  <Gamepad2 className="h-3.5 w-3.5" />
                </span>
              )}
            </span>
          </div>
          {quest.description && <p className="mt-0.5 text-sm text-slate-500">{quest.description}</p>}

          {quest.state === "LOCKED" && quest.goal ? (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-brand-500"
                  style={{
                    width: `${Math.min(100, ((quest.progress ?? 0) / quest.goal) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {quest.progress ?? 0} / {quest.goal} {quest.progressUnit}
              </p>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <Badge tone={badge.tone}>{badge.text}</Badge>
            {quest.deadline && quest.state !== "COLLECTED" && (
              <span className="text-xs text-slate-400">· {deadlineLabel(quest.deadline)}</span>
            )}
            {quest.actionUrl && quest.state === "COLLECTIBLE" && !needsDwell && (
              <a
                href={quest.actionUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                باز کردن ماموریت ↗
              </a>
            )}
          </div>

          {/* Honor-system dwell flow: open the link, wait out the timer, then collect. */}
          {dwellBlocked ? (
            !opened ? (
              <button
                onClick={handleOpen}
                className="mt-3 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
              >
                باز کردن ماموریت ↗
              </button>
            ) : (
              <button
                disabled
                className="mt-3 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-500"
              >
                قابل دریافت تا {remaining ?? quest.minDwellSeconds}s…
              </button>
            )
          ) : canCollect && quest.shopAccess ? (
            <button
              onClick={onRedeem}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {busy ? "در حال فعال‌سازی…" : "دریافت دسترسی"}
            </button>
          ) : canCollect ? (
            <button
              onClick={onCollect}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {busy ? "در حال دریافت…" : "دریافت پاداش"}
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function RewardCard({
  reward,
  busy,
  onCollect,
}: {
  reward: LeagueReward;
  busy: boolean;
  onCollect: (choice?: "POINTS" | "DISCOUNT") => void;
}): React.JSX.Element {
  const collected = reward.status === "COLLECTED";
  const hasOption = reward.optionDiscountPercent != null || reward.optionPoints != null;

  return (
    <div className={collected ? "opacity-70" : "border-brand-300"}>
      <div className="flex items-start gap-3">
        <IconTile icon={reward.physicalPrize === "PlayStation 5" ? Gamepad2 : Gift} tone="brand" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">
            رتبه #{reward.rank} · {reward.league.title}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {reward.basePoints > 0 && `${reward.basePoints} امتیاز`}
            {reward.physicalPrize && `${reward.basePoints > 0 ? " + " : ""}${reward.physicalPrize}`}
          </p>

          {collected ? (
            <p className="mt-2 text-sm text-green-700">
              دریافت شد
              {reward.chosenOption ? ` · انتخاب ${reward.chosenOption.toLowerCase()}` : ""}
              {reward.discountCode ? ` · کد ${reward.discountCode}` : ""}
            </p>
          ) : hasOption ? (
            <>
              <p className="mt-2 text-xs text-slate-400">پاداش خود را انتخاب کنید:</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  disabled={busy}
                  onClick={() => onCollect("POINTS")}
                  className="rounded-xl bg-slate-100 py-2 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
                >
                  +{reward.optionPoints} امتیاز
                </button>
                <button
                  disabled={busy}
                  onClick={() => onCollect("DISCOUNT")}
                  className="rounded-xl bg-slate-100 py-2 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
                >
                  {reward.optionDiscountPercent}% کد تخفیف
                </button>
              </div>
            </>
          ) : (
            <button
              disabled={busy}
              onClick={() => onCollect()}
              className="mt-3 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {busy ? "در حال دریافت…" : "دریافت پاداش"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function deadlineLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "منقضی";
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days} روز باقی مانده`;
  const hours = Math.floor(ms / 3600000);
  if (hours >= 1) return `${hours} ساعت باقی مانده`;
  return `${Math.max(1, Math.floor(ms / 60000))} دقیقه باقی مانده`;
}
