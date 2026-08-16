"use client";

import { Gamepad2, GiftIcon, Lock, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/Button";
import Card from "@/components/Card";
import ContextWrapper from "@/components/ContextWrapper";
import Modal from "@/components/Modal";
import Spinner from "@/components/Spinner";
import StrokeText from "@/components/StrokeText";
import { Badge } from "@/components/ui";
import { api, QuestView } from "@/lib/api";
import { showError } from "@/lib/toast";
import { useGlobalStore } from "@/store/store";

import Score from "../Leagues/Score";

const BLUR_STYLE = {
  maskImage: "linear-gradient(rgb(15, 13, 55), rgb(15, 13, 55), transparent)",
};

type Proptypes = {
  referral: {
    code: string;
    uses: number;
    signups: number;
  };
  token: string;
};

const ProfilePage = (props: Proptypes) => {
  const { referral, token } = props;
  const router = useRouter();
  const user = useGlobalStore((st) => st.user);
  const [copied, setCopied] = useState(false);
  const [breakdown, setBreakdown] = useState<Awaited<ReturnType<typeof api.scoreBreakdown>> | null>(null);
  const [modal, setModal] = useState<"none" | "exit">("none");
  const [collecting, setCollecting] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<QuestView[] | null>(null);

  const hideModal = () => setModal("none");

  const logout = () => router.replace("/api/auth/logout");

  const copy = (): void => {
    navigator.clipboard?.writeText(referral.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const loadMilestones = (t: string): void => {
    api
      .quests(t)
      .then((qs) =>
        setMilestones(qs.filter((q) => q.verify === "REFERRAL_SIGNUPS").sort((a, b) => (a.goal ?? 0) - (b.goal ?? 0))),
      )
      .catch(showError);
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
    } catch (e) {
      showError(e); // button re-enables so the user can retry
    } finally {
      setCollecting(null);
    }
  };

  const rewardLabel = (q: QuestView): string =>
    q.rewardRounds > 0 ? `${q.rewardRounds} دور` : `${q.rewardScore} امتیاز`;

  useEffect(() => {
    loadMilestones(token);
    api.scoreBreakdown(token).then(setBreakdown).catch(showError);
  }, []);

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="z-10 p-4 flex sticky top-0 items-center">
          <div className="absolute inset-0 -z-1 backdrop-blur" style={BLUR_STYLE} />
          {/* <button onClick={showConfirmExitModal}>
            <Image src={LogoutIcon} alt="leagues icon" width={62} />
          </button> */}
          <div className="grow flex flex-col items-center gap-2">
            <StrokeText
              label={user?.displayName}
              color="gold"
              strokeColor="darkblue"
              fontSize={20}
              fontWeight={1000}
              height={28}
            />
            <Score score={breakdown?.total ?? 0} />
          </div>
          {/* <Link href={"/leagues"}>
            <Image
              src={LeaguesIcon}
              alt="leagues icon"
              width={64}
              height={62}
              className="min-w-16"
            />
          </Link> */}
        </header>
        <div className="px-4 flex flex-col gap-4">
          <Card>
            <p className="text-sm font-semibold text-slate-700">دعوت دوستان</p>
            {referral ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-blue-800 grow w-full">
                    {referral.code}
                  </code>
                  <Button
                    label={copied ? "کپی شد!" : "کپی"}
                    onClick={copy}
                    variant={copied ? "secondary" : "primary"}
                    disabled={copied}
                    fontSize={13}
                    height={18}
                    className="shrink"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">{referral.signups} ثبت‌نام با کد شما</p>
              </>
            ) : (
              <Spinner size="m" />
            )}
          </Card>
          {milestones && milestones.length > 0 && (
            <Card>
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
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        show={modal === "exit"}
        content={
          <ContextWrapper
            content="آیا مطمئنید میخواهید از حساب کاربری خود خارج شوید؟"
            ribbonType="red"
            title="خروج از حساب کاربری"
            hasCTA
            ctaLabel="میخوام خارج بشم"
            onCTAClick={logout}
          />
        }
        closeButton
        handleCloseModal={hideModal}
      />
    </>
  );
};

export default ProfilePage;
