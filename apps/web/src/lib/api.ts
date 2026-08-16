function apiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  if (typeof window !== "undefined") {
    try {
      const url = new URL(env);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        url.hostname = window.location.hostname;
      }
      return url.origin + "/api";
    } catch {
      /* fall through to env default */
    }
  }
  return env + "/api";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(apiBase() + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  } catch {
    // Network failure (API down, offline…) — normalize so every consumer gets
    // an ApiError with a user-presentable message instead of "Failed to fetch".
    throw new ApiError(0, "ارتباط با سرور برقرار نشد. لطفا دوباره تلاش کنید.");
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = Array.isArray(j.message) ? j.message.join(", ") : (j.message ?? msg);
    } catch {}

    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return null as T;
  // A controller that returns `null` yields a 200 with an empty body — res.json()
  // would throw "Unexpected end of JSON input", so parse the text and treat empty as null.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// --- Types (mirror the API responses) ---
export interface AuthUser {
  id: string;
  phone: string;
  displayName: string;
  isAdmin: boolean;
  isNew: boolean;
}
export interface GameConfig {
  gameDurationSeconds: number;
}
export interface DifficultyMixEntry {
  difficulty: number;
  count: number;
}
export interface PointsPerDifficultyEntry {
  difficulty: number;
  points: number;
}
export interface RoundQuestion {
  roundQuestionId: string;
  questionId: string;
  text: string;
  choices: string[];
  category: string | null;
}
export interface StartedRound {
  roundId: string;
  startedAt: string;
  endsAt: string;
  durationSeconds: number;
  questions: RoundQuestion[];
}
export interface AnswerResult {
  isCorrect: boolean;
  correctIndex: number;
  awardedPoints: number;
  roundScore: number;
}
export interface RoundSummary {
  roundId: string;
  status: string;
  correctCount: number;
  totalCount: number;
  roundScore: number;
}
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  score: number;
}

export const api = {
  requestOtp: (body: {
    phone: string;
    mode?: "login" | "signup";
    fullName?: string;
    age?: number;
    referralCode?: string;
    landingPath?: string;
  }) =>
    request<{ sent: true; ttlSeconds: number }>("/auth/request-otp", {
      method: "POST",
      body,
    }),
  verifyOtp: (body: { phone: string; code: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/verify-otp", {
      method: "POST",
      body,
    }),
  me: (token: string) => request<AuthUser & { createdAt: string }>("/auth/me", { token }),

  gameConfig: () => request<GameConfig>("/game/config"),
  // Public: currently-live league (title + window) for the intro-page countdown, or null.
  activeLeague: () => request<ActiveLeague | null>("/leagues/active"),
  roundBudget: (token: string) => request<RoundBudget>("/game/rounds", { token }),
  startRound: (token: string) => request<StartedRound>("/game/start", { method: "POST", token }),
  nextQuestions: (token: string, roundId: string) =>
    request<{ questions: RoundQuestion[] }>("/game/questions/next", {
      method: "POST",
      token,
      body: { roundId },
    }),
  answer: (token: string, body: { roundId: string; roundQuestionId: string; answeredIndex: number }) =>
    request<AnswerResult>("/game/answer", { method: "POST", token, body }),
  finish: (token: string, roundId: string) =>
    request<RoundSummary>("/game/finish", {
      method: "POST",
      token,
      body: { roundId },
    }),

  leaderboard: (scope: "overall" | "weekly", periodKey?: string) =>
    request<{
      scope: string;
      weekKey: string | null;
      entries: LeaderboardEntry[];
    }>(`/leaderboard?scope=${scope}&limit=50${periodKey ? `&weekKey=${periodKey}` : ""}`),
  myRank: (token: string, scope: "overall" | "weekly", periodKey?: string) =>
    request<{ scope: string; rank: number | null; score: number }>(
      `/leaderboard/me?scope=${scope}${periodKey ? `&weekKey=${periodKey}` : ""}`,
      { token },
    ),
  periods: () => request<Array<{ periodKey: string; current: boolean }>>("/leaderboard/periods"),

  leagues: (token: string) =>
    request<{
      overall: LeagueWithMe | null;
      current: LeagueWithMe[];
      previousGroups: Array<{
        parent: LeagueWithMe | null;
        leagues: LeagueWithMe[];
      }>;
    }>("/leagues", { token }),
  leagueStandings: (token: string, id: string) =>
    request<{ leagueId: string; entries: LeaderboardEntry[] }>(`/leagues/${id}/standings`, { token }),
  myLeagueRewards: (token: string) => request<LeagueReward[]>("/leagues/rewards/me", { token }),
  collectLeagueReward: (token: string, id: string, choice?: "POINTS" | "DISCOUNT") =>
    request<{
      awardedPoints: number;
      physicalPrize: string | null;
      discountCode: string | null;
    }>(`/leagues/rewards/${id}/collect`, {
      method: "POST",
      token,
      body: { choice },
    }),

  myReferral: (token: string) =>
    request<{ code: string; uses: number; signups: number }>("/referrals/me", {
      token,
    }),

  invitees: (token: string) =>
    request<Array<{ id: string; name: string; joinedAt: string; hasPlayed: boolean }>>("/referrals/invitees", {
      token,
    }),

  scoreBreakdown: (token: string) =>
    request<{
      total: number;
      byReason: Array<{ reason: string; points: number }>;
    }>("/leaderboard/me/breakdown", {
      token,
    }),

  prizePreview: (token: string) =>
    request<{
      weekKey: string;
      rank: number | null;
      score: number;
      prizes: Array<{ id: string; name: string; description: string | null }>;
    }>("/prizes/me", { token }),
  myAwards: (token: string) =>
    request<
      Array<{
        id: string;
        status: string;
        weekKey: string;
        prize: { name: string };
      }>
    >("/prizes/me/awards", {
      token,
    }),

  quests: (token: string) => request<QuestView[]>("/quests", { token }),
  openQuest: (token: string, id: string) =>
    request<{ collectibleInSeconds: number }>(`/quests/${id}/open`, {
      method: "POST",
      token,
    }),
  collectQuest: (token: string, id: string) =>
    request<{ awardedScore: number; awardedRounds: number; state: string }>(`/quests/${id}/collect`, {
      method: "POST",
      token,
    }),
  redeemQuest: (token: string, id: string) =>
    request<{ awardedScore: number; awardedRounds: number; state: string }>(`/quests/${id}/redeem`, {
      method: "POST",
      token,
    }),

  admin: {
    stats: (token: string) =>
      request<{
        weekKey: string;
        users: number;
        admins: number;
        questions: number;
        activeQuestions: number;
        rounds: number;
        finishedRounds: number;
        scoreEvents: number;
        pendingAwards: number;
      }>("/admin/stats", { token }),
    listQuestions: (token: string) => request<AdminQuestion[]>("/admin/questions", { token }),
    createQuestion: (token: string, body: NewQuestion) =>
      request<AdminQuestion>("/admin/questions", {
        method: "POST",
        token,
        body,
      }),
    importQuestions: (token: string, questions: ImportedQuestion[]) =>
      request<{
        created: number;
        failed: number;
        errors: Array<{ row: number; message: string }>;
      }>("/admin/questions/import", {
        method: "POST",
        token,
        body: { questions },
      }),
    updateQuestion: (token: string, id: string, body: Partial<NewQuestion>) =>
      request<AdminQuestion>(`/admin/questions/${id}`, {
        method: "PATCH",
        token,
        body,
      }),
    deleteQuestion: (token: string, id: string) =>
      request<AdminQuestion>(`/admin/questions/${id}`, {
        method: "DELETE",
        token,
      }),
    gameConfig: (token: string) => request<AdminGameConfig>("/admin/game/config", { token }),
    updateGameConfig: (token: string, body: Partial<AdminGameConfig>) =>
      request<AdminGameConfig>("/admin/game/config", {
        method: "PUT",
        token,
        body,
      }),
    prizeAwards: (token: string, weekKey?: string) =>
      request<AdminPrizeAward[]>(`/admin/prize-awards${weekKey ? `?weekKey=${weekKey}` : ""}`, { token }),
    updateAward: (token: string, id: string, status: string) =>
      request<{ id: string; status: string }>(`/admin/prize-awards/${id}`, {
        method: "PATCH",
        token,
        body: { status },
      }),
    closeWeek: (token: string, weekKey?: string) =>
      request<{ mode: string; weekKey: string; awardsCreated?: number }>("/admin/close-week", {
        method: "POST",
        token,
        body: { weekKey, sync: true },
      }),
    rebuildLeaderboard: (token: string) =>
      request<{ overallUsers: number; weeks: number }>("/admin/leaderboard/rebuild", { method: "POST", token }),
    listQuests: (token: string) => request<AdminQuest[]>("/admin/quests", { token }),
    createQuest: (token: string, body: NewQuest) =>
      request<AdminQuest>("/admin/quests", { method: "POST", token, body }),
    updateQuest: (token: string, id: string, body: Partial<NewQuest>) =>
      request<AdminQuest>(`/admin/quests/${id}`, {
        method: "PATCH",
        token,
        body,
      }),
    deleteQuest: (token: string, id: string) => request<AdminQuest>(`/admin/quests/${id}`, { method: "DELETE", token }),
    leagues: (token: string) => request<League[]>("/admin/leagues", { token }),
    createLeague: (token: string, body: NewLeague) =>
      request<League>("/admin/leagues", { method: "POST", token, body }),
    updateLeague: (token: string, id: string, body: Partial<NewLeague>) =>
      request<League>(`/admin/leagues/${id}`, { method: "PATCH", token, body }),
    deleteLeague: (token: string, id: string) => request<League>(`/admin/leagues/${id}`, { method: "DELETE", token }),
    freezeLeague: (token: string, id: string) =>
      request<{ frozen: boolean; rewardsCreated: number }>(`/admin/leagues/${id}/freeze`, { method: "POST", token }),
    leagueRewards: (token: string, id: string) =>
      request<
        Array<{
          rank: number;
          physicalPrize: string | null;
          basePoints: number;
          status: string;
          user: { phone: string; displayName: string | null };
        }>
      >(`/admin/leagues/${id}/rewards`, { token }),
    discountStats: (token: string) =>
      request<Array<{ type: string; percent: number; total: number; used: number }>>("/admin/discount-codes", {
        token,
      }),
    importDiscountCodes: (token: string, codes: ImportedDiscountCode[]) =>
      request<{
        created: number;
        failed: number;
        errors: Array<{ row: number; message: string }>;
      }>("/admin/discount-codes/import", {
        method: "POST",
        token,
        body: { codes },
      }),
  },
};

export interface RoundBudget {
  league: { id: string; title: string; endsAt: string } | null;
  allowance: number;
  used: number;
  remaining: number;
}
export interface League {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isOverall: boolean;
  frozenAt: string | null;
  roundAllowance: number;
  parentLeagueId: string | null;
}
export type LeagueWithMe = League & { myRank: number | null; myScore: number };
/** Public, non-sensitive view of the live league for the intro-page countdown. */
export interface ActiveLeague {
  title: string;
  startsAt: string;
  endsAt: string;
}
export interface NewLeague {
  title: string;
  startsAt: string;
  endsAt: string;
  isOverall?: boolean;
  roundAllowance?: number;
  parentLeagueId?: string;
}
export interface LeagueReward {
  id: string;
  rank: number;
  basePoints: number;
  physicalPrize: string | null;
  optionPoints: number | null;
  optionDiscountPercent: number | null;
  status: "PENDING" | "COLLECTED";
  chosenOption: string | null;
  discountCode: string | null;
  league: { title: string };
}

export type QuestType = "CHALLENGE" | "ACTION";
export type QuestVerify = "NONE" | "REFERRAL_SIGNUPS";
export type QuestState = "LOCKED" | "COLLECTIBLE" | "COLLECTED" | "EXPIRED";
export interface QuestView {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  type: QuestType;
  rewardScore: number;
  rewardRounds: number;
  actionUrl: string | null;
  verify: QuestVerify;
  shopAccess: boolean;
  deadline: string | null;
  state: QuestState;
  progress: number | null;
  goal: number | null;
  progressUnit: string | null;
  minDwellSeconds: number;
  dwellRemaining: number | null;
}
export interface AdminQuest {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  type: QuestType;
  rewardScore: number;
  rewardRounds: number;
  targetScore: number | null;
  actionUrl: string | null;
  verify: QuestVerify;
  verifyTarget: number | null;
  minDwellSeconds: number;
  shopGameCode: string | null;
  shopSkuKind: string | null;
  shopSkuId: string | null;
  startsAt: string;
  deadline: string | null;
  isActive: boolean;
}
export interface NewQuest {
  title: string;
  icon?: string;
  description?: string;
  type: QuestType;
  rewardScore: number;
  rewardRounds?: number;
  targetScore?: number;
  actionUrl?: string;
  verify?: QuestVerify;
  verifyTarget?: number;
  minDwellSeconds?: number;
  shopGameCode?: string;
  shopSkuKind?: string;
  shopSkuId?: string;
  deadline?: string;
  isActive?: boolean;
}

export interface AdminQuestion {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
  difficulty: number;
  category: string | null;
  isActive: boolean;
}
export interface NewQuestion {
  text: string;
  choices: string[];
  correctIndex: number;
  difficulty?: number;
  category?: string;
  isActive?: boolean;
}
export interface ImportedQuestion {
  text: string;
  choices: string[];
  correctIndex: number;
  category?: string;
  difficulty?: number;
}
export interface ImportedDiscountCode {
  code: string;
  type: string;
  percent: number;
  title: string;
}
export interface AdminGameConfig {
  gameDurationSeconds: number;
  roundBonus: number;
  referralBonus: number;
  difficultyMix: DifficultyMixEntry[];
  pointsPerDifficulty: PointsPerDifficultyEntry[];
}
export interface AdminPrizeAward {
  id: string;
  status: string;
  weekKey: string;
  prize: { name: string };
  user: { phone: string; displayName: string | null };
}

export { request };
