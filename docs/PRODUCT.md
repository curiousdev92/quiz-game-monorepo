# Quiz Game — Product Requirements (PRD)

Phone-OTP trivia game where players answer timed multiple-choice questions, earn points, and
compete on weekly and all-time leaderboards, with leagues, referrals, prizes, and collectible quests.
A single admin manages content and settings.

- **Status:** MVP complete (auth → gameplay → leaderboards → leagues/referrals/prizes → weekly close/admin) + quests + CSV/Excel question import.
- **Companion docs:** [ARCHITECTURE.md](ARCHITECTURE.md) · [API.md](API.md) · [DATA-MODEL.md](DATA-MODEL.md) · [DATABASE.md](DATABASE.md) · [../README.md](../README.md).

---

## 1. Goals

- Give players a fast, replayable trivia loop that rewards regular play (weekly competition).
- Drive acquisition virally through referrals and shareable quests.
- Let a non-technical admin run the whole thing: questions, timing, prizes, quests, fulfillment.

**Success signals:** returning weekly players, referral sign-ins per inviter, quest completion rate, questions answered per session.

## 2. Users & roles

| Role       | Who                                     | Can                                                                                                 |
| ---------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Player** | Anyone with a phone number              | Log in, play rounds, collect quests, view leaderboards/league/prizes, invite friends                |
| **Admin**  | One allow-listed phone (`ADMIN_PHONES`) | Everything in the admin panel. **May play to preview questions, but never scores, ranks, or wins.** |

There is exactly **one** admin account, and **no** player can reach admin pages (enforced server-side).

## 3. Features & requirements

### 3.1 Authentication (phone OTP)

- Log in with a phone number; receive a 6-digit OTP; verify to get a session (JWT, 7-day).
- New numbers are auto-registered on first successful verification (find-or-create).
- OTP delivery via Kavenegar SMS in production; a fixed dev code is used locally.
- **AC:** wrong/expired code → rejected; returning number → same account; session persists across reloads.

### 3.2 Onboarding / acquisition capture

- On sign-up, capture UTM source/medium/campaign, landing path, and referral code.
- **AC:** these are stored once, at first sign-up, and never overwritten.

### 3.3 Core gameplay

- From the intro screen, the player taps **Start**, sees a **3-2-1 countdown**, then the round begins.
- A round serves N random active questions (N = admin setting), each with 4 options, under a single **game timer** (admin-configurable seconds).
- **Answer feedback:** correct pick turns **green** and advances immediately; wrong pick turns **red**, reveals the **correct** option, holds ~750ms, then advances.
- The server is authoritative: it hides correct answers until answered, enforces the deadline, and rejects double-answers.
- On finish (or timeout), the player sees a summary (correct count, round score).
- **AC:** a player can't score after time expires; each question is answered at most once; correct answers are never exposed pre-answer.

### 3.4 Scoring

- Points: configurable per correct answer, optional round-completion bonus.
- All points are recorded in an **append-only ledger** (source of truth), tagged with the ISO week.
- **AC:** totals are always reconstructable from the ledger; the leaderboard cache can be rebuilt to match exactly.

### 3.5 Leaderboards

- **Weekly** and **all-time** rankings, publicly viewable; players see their own rank.
- Names shown as display name or a masked phone (e.g. `0913***01`) for privacy.
- **AC:** admins never appear; ranks reflect the ledger.

### 3.6 Leagues

- Tiered leagues (Bronze/Silver/Gold…). Each player has one weekly membership; standings are scored from that week's points.
- Players are auto-enrolled on play (carry over their last league, else the lowest tier).
- At weekly close, each league's final ranks are frozen.
- **AC:** admins are never enrolled or shown in standings.

### 3.7 Referrals

- Every player has a shareable referral code. When an invited person **signs in**, it's attributed to the inviter.
- Optional referrer bonus points (admin-configurable) on the invitee's first completed round.
- **AC:** attribution counts only when the invited user actually signs in; the inviter is credited at most once per invitee.

### 3.8 Prizes & weekly close

- Prizes are defined by a **rank range** (e.g. rank 1, ranks 2–3) and are weekly-scoped.
- A scheduled **weekly close job** (Mon 00:05 UTC) freezes league ranks and creates **prize awards** from that week's overall ranking. Admin can also trigger it manually.
- Players preview which prize they'd win at their current rank and see awards they've received.
- Admin marks awards **Fulfilled/Cancelled**.
- **AC:** close is idempotent (re-running never duplicates awards); admins are excluded from the prize ranking.

### 3.9 Quests (collectible tasks)

- Each quest has: title, icon, description, reward score, a collect-by deadline, and a per-user state (**Locked / Collectible / Collected / Expired**).
- Two types:
  - **Challenge** — earn a target number of gameplay points (within the active window) to unlock.
  - **Action** — an external task (follow a page, invite friends, install the app…) with an optional link.
- **Action verification** (optional, extensible): _honor-system_ (collectible while active) or _referral signups_ (locked until N invited friends have signed in).
- Collecting adds the reward to the player's total (a ledger event → counts on leaderboards).
- **AC:** a quest can't be collected before it's unlocked or after its deadline, and only once per player.

### 3.10 Admin panel

- **Overview:** key stats + editable game settings (timer, questions/round, points, bonuses) + rebuild-leaderboard.
- **Questions:** create/edit, activate/deactivate (soft delete preserves history), and **bulk import from CSV/Excel** (per-row validation with an error report; downloadable template).
- **Quests:** create/activate/deactivate, including verification config.
- **Awards:** run the weekly close and mark prize awards fulfilled/cancelled.
- **AC:** all admin actions require the admin role; a deactivated question stays out of new rounds but keeps its past round history.

## 4. Cross-cutting rules

- **Weekly boundary:** ISO week (`YYYY-Www`) scopes all "weekly" data via a filter column — no per-week tables.
- **Ledger authority:** the score ledger is canonical; Redis leaderboards are a rebuildable cache.
- **Admin neutrality:** admins can play for QA but are excluded from every competitive surface (leaderboards, leagues, prizes, referral credit).
- **Privacy:** phone numbers are masked on public surfaces.
- **History integrity:** questions are soft-deleted, not hard-deleted, so past rounds stay intact.

## 5. Out of scope (MVP)

Social/OAuth login, friends lists, real-time/head-to-head multiplayer, in-app purchases, push notifications, native mobile apps, and automated verification of non-referral external actions (Instagram follow, app install — honor-system for now).

## 6. Tech overview

Turborepo monorepo. **Next.js 15 / React 19 + Tailwind v4** frontend; **NestJS 11** API with **Prisma/PostgreSQL** and **Redis + BullMQ** (leaderboard cache, weekly-close scheduler). See `README.md` for setup and `CLAUDE.md` for the API/route map.

## 7. Glossary

- **weekKey** — ISO week identifier, e.g. `2026-W29`.
- **ScoreEvent** — one row in the append-only points ledger.
- **Round / RoundQuestion** — a play session and its per-question snapshot.
- **Weekly close** — the job that finalizes ranks and awards prizes for a finished week.
