"use client";

import { Map, PartyPopper, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import CircularCountdown from "@/components/CircularCountdown";
import ContextWrapper from "@/components/ContextWrapper";
import Modal from "@/components/Modal";
import Spinner from "@/components/Spinner";
import StrokeText from "@/components/StrokeText";
import { AnswerResult, api, RoundQuestion, RoundSummary, StartedRound } from "@/lib/api";

import Button from "../../components/Button";
import PlayHeader from "./PlayHeader";

type Phase = "countdown" | "loading" | "playing" | "finished";

// Once only this many unanswered questions remain in the loaded pages, fetch the next
// page of 12 — so the round feels like one continuous stream until the timer ends it.
const PREFETCH_THRESHOLD = 3;
const animationDelay = 300;
const wrongAnswerDelay = 750;

const PlayPage = ({ roundData, token }: { roundData: StartedRound; token: string }) => {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("countdown");
  const [count, setCount] = useState(3);
  const round = roundData;
  const [questions, setQuestions] = useState<RoundQuestion[]>(roundData.questions);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [summary, setSummary] = useState<RoundSummary | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const finishing = useRef(false);
  const fetchingNext = useRef(false);
  const noMoreQuestions = useRef(false);

  // 3-2-1 countdown, then start the round.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      beginRound();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  const beginRound = useCallback(async () => {
    if (!token) return;
    setPhase("loading");
    try {
      setIdx(0);
      noMoreQuestions.current = false;
      fetchingNext.current = false;
      setTimeLeft(Math.max(0, Math.round((new Date(roundData.endsAt).getTime() - Date.now()) / 1000)));
      setPhase("playing");
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "شروع دور ممکن نشد.");
      setPhase("finished");
    }
  }, [token]);

  const finishGame = useCallback(async () => {
    if (!token || !round || finishing.current) return;
    finishing.current = true;
    try {
      setSummary(await api.finish(token, round.roundId));
    } finally {
      setPhase("finished");
    }
  }, [token, round]);

  // Game clock (server-authoritative deadline).
  useEffect(() => {
    if (phase !== "playing" || !round) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((new Date(round.endsAt).getTime() - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        void finishGame();
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, round, finishGame]);

  // Seamlessly fetch the next page of 12 once we're nearing the end of what's loaded.
  useEffect(() => {
    if (phase !== "playing" || !token || !round) return;
    if (noMoreQuestions.current || fetchingNext.current) return;
    if (questions.length - idx > PREFETCH_THRESHOLD) return;
    fetchingNext.current = true;
    api
      .nextQuestions(token, round.roundId)
      .then((r) => {
        if (r.questions.length === 0) noMoreQuestions.current = true;
        else setQuestions((qs) => [...qs, ...r.questions]);
      })
      .catch(() => {
        noMoreQuestions.current = true;
      })
      .finally(() => {
        fetchingNext.current = false;
      });
  }, [idx, questions.length, phase, token, round]);

  // If the question bank is exhausted and the player has caught up to the last loaded
  // question, there's nothing left to serve — wrap up early instead of hanging forever.
  useEffect(() => {
    if (phase !== "playing") return;
    if (idx < questions.length) return;
    if (noMoreQuestions.current) void finishGame();
  }, [idx, questions.length, phase, finishGame]);

  async function pick(i: number): Promise<void> {
    if (locked || !token || !round) return;
    const q = questions[idx];
    if (!q) return;
    setLocked(true);
    setSelected(i);
    try {
      const res = await api.answer(token, {
        roundId: round.roundId,
        roundQuestionId: q.roundQuestionId,
        answeredIndex: i,
      });
      setResult(res);
      // Correct → brief green flash then advance. Wrong → hold ~750ms showing the right answer.
      const delay = res.isCorrect ? 400 : 900;
      setTimeout(advance, delay);
    } catch {
      // Likely time expired — wrap up.
      void finishGame();
    }
  }

  function advance(): void {
    setSelected(null);
    setResult(null);
    setLocked(false);
    setIdx((n) => n + 1);
  }

  if (phase === "countdown") {
    return <Modal show={!!count} content={<CircularCountdown duration={3} onFinish={() => {}} />} />;
  }

  if (phase === "finished" && startError) {
    return (
      <main className="flex flex-1 flex-col justify-center gap-6 p-4 text-center">
        <TriangleAlert className="mx-auto h-14 w-14 text-wrong" />
        <h1 className="text-2xl font-black">امکان شروع دور وجود ندارد</h1>
        <p className="text-slate-600">{startError}</p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => router.push("/quests")}>
            <Map className="h-4 w-4" />
            گرفتن دور بیشتر
          </Button>
          <Button variant="secondary" onClick={() => router.push("/")}>
            بازگشت به خانه
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "loading" || !round) return <Spinner size="m" />;

  if (phase === "finished") {
    const correct = summary?.correctCount ?? 0;
    const total = summary?.totalCount ?? questions.length;
    return (
      <main className="flex flex-1 flex-col justify-center gap-6 p-4 text-center">
        <PartyPopper className="mx-auto h-14 w-14 text-cyan-400" />
        <StrokeText label={"دور تمام شد!"} fontSize={22} fontWeight={700} height={26} strokeColor="darkblue" />
        <div className="flex flex-col gap-2">
          <StrokeText label="امتیاز شما" fontWeight={600} color="lightgrey" />
          <p className="text-5xl font-black text-brand-600">
            <StrokeText
              label={230}
              fontSize={30}
              fontWeight={700}
              height={32}
              strokeColor="darkblue"
              color="lightgreen"
            />
          </p>
          <StrokeText label={`${correct} / ${total} پاسخ درست`} fontWeight={600} color="lightgrey" />
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={() => router.push("/leagues")}>دیدن لیگ‌ها</Button>
          <Button variant="secondary" onClick={() => router.push("/")}>
            بازگشت به خانه
          </Button>
        </div>
      </main>
    );
  }

  // playing
  const q = questions[idx];
  const pct = Math.round((timeLeft / round.durationSeconds) * 100);

  return (
    <main className="flex flex-1 flex-col gap-7 p-4">
      <PlayHeader startSeconds={round.durationSeconds} token={token} handleFinishGame={finishGame} />

      {!q ? (
        <Spinner size="m" />
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.section
              key={q.questionId}
              initial={{ x: 50, opacity: 0, filter: "blur(8px)" }}
              animate={{ x: 0, opacity: 1, filter: "blur(0)" }}
              exit={{ x: -50, opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: animationDelay / 1000 }}
              className="relative"
            >
              <ContextWrapper content={q?.text} title={`سوال ${idx + 1}`} ribbonType="yellow" hasCTA={false} />
            </motion.section>

            {/* Options */}
            <div className={`grid grid-cols-2 grid-rows-2 select-none gap-3 mt-7 ${locked ? "opacity-50" : ""}`}>
              {q.choices.map((ch, i) => {
                let variant: "primary" | "danger" | "secondary" = "primary";
                let disabled = locked;

                if (result) {
                  if (i === result.correctIndex) variant = "secondary";
                  else if (i === selected) variant = "danger";
                  else disabled = true;
                } else if (i === selected) {
                  variant = "primary";
                }

                return (
                  <div key={ch} className="relative z-10" onClick={() => pick(i)}>
                    <Button
                      label={ch}
                      variant={variant}
                      progress={variant === "danger"}
                      progressDuration={wrongAnswerDelay}
                      fontSize={ch.length > 18 ? 11 : 14}
                    />
                  </div>
                );
              })}
            </div>
          </AnimatePresence>
        </>
      )}
    </main>
  );
};

export default PlayPage;
