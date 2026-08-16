# API reference

Base URL: `/api`. Auth via `Authorization: Bearer <jwt>` where noted. Access:
**pub** = public, **auth** = any logged-in user, **admin** = `AdminGuard`.

## Auth

| Method | Path                | Access | Notes                                                                                                                                                        |
| ------ | ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/auth/request-otp` | pub    | `{phone, mode?, fullName?, age?, referralCode?, utm*, landingPath?}`. `mode:"login"` (default) rejects unregistered phones; `mode:"signup"` allows creation. |
| POST   | `/auth/verify-otp`  | pub    | `{phone, code}` → `{token, user}`. Creates the user on first signup.                                                                                         |
| GET    | `/auth/me`          | auth   | Current user.                                                                                                                                                |

## Game

| Method | Path                   | Access | Notes                                                                                                 |
| ------ | ---------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| GET    | `/game/config`         | pub    | `{gameDurationSeconds}` for the intro.                                                                |
| POST   | `/game/start`          | auth   | Starts a round → first page of questions (correctIndex withheld).                                     |
| POST   | `/game/questions/next` | auth   | `{roundId}` → next page; `{questions:[]}` when the bank is exhausted.                                 |
| POST   | `/game/answer`         | auth   | `{roundId, roundQuestionId, answeredIndex}` → `{isCorrect, correctIndex, awardedPoints, roundScore}`. |
| POST   | `/game/finish`         | auth   | `{roundId}` → `{correctCount, totalCount, roundScore}` (+ optional bonus).                            |
| GET    | `/game/rounds`         | auth   | `{league, allowance, used, remaining}` for the Play button.                                           |

## Leaderboard

| Method | Path                                                         | Access | Notes                                                   |
| ------ | ------------------------------------------------------------ | ------ | ------------------------------------------------------- |
| GET    | `/leaderboard?scope=overall\|weekly&weekKey?&limit?&offset?` | pub    | `{scope, weekKey, entries:[{rank,userId,name,score}]}`. |
| GET    | `/leaderboard/me?scope=&weekKey?`                            | auth   | `{rank, score}`.                                        |
| GET    | `/leaderboard/periods`                                       | pub    | Days with scores, recent first.                         |
| GET    | `/leaderboard/me/breakdown`                                  | auth   | `{total, byReason:[{reason, points}]}`.                 |

## Leagues · referrals · prizes · quests

| Method | Path                                                  | Access | Notes                                                                                       |
| ------ | ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| GET    | `/leagues/active`                                     | pub    | `{title, startsAt, endsAt}` or `null` — the live league.                                    |
| GET    | `/leagues`                                            | auth   | `{overall, current, previousGroups}`, each decorated with `myRank`/`myScore`.               |
| GET    | `/leagues/:id/standings?weekKey&limit&offset`         | auth   | Ranked rows.                                                                                |
| POST   | `/referrals` (`/referrals/me`, `/referrals/invitees`) | auth   | Referral code, uses, invited users.                                                         |
| GET    | `/prizes`, `/prizes/me`, `/prizes/me/awards`          | auth   | Prize catalog, live-rank preview, awards.                                                   |
| GET    | `/quests` · POST `/quests/:id/collect`                | auth   | Quests + per-user state/progress; collect writes a reward.                                  |
| POST   | `/quests/:id/redeem`                                  | auth   | Shop-access quest: backend grants the external SKU (by phone), then awards the reward once. |

## Admin (`admin/*`, all admin)

| Method   | Path                                                            | Notes                                                              |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| GET      | `/admin/stats`                                                  | Dashboard counters.                                                |
| GET/PUT  | `/admin/game/config`                                            | Edit the singleton `GameConfig` (difficulty mix, points per tier). |
| GET/POST | `/admin/questions` · PATCH/DELETE `/admin/questions/:id`        | CRUD (DELETE = soft-deactivate).                                   |
| POST     | `/admin/questions/import`                                       | `{questions:[...]}` → `{created, failed, errors}`.                 |
| GET/POST | `/admin/quests` · PATCH/DELETE `/admin/quests/:id`              | Quest CRUD.                                                        |
| GET/POST | `/admin/discount-codes` · POST `/admin/discount-codes/import`   | Bulk discount codes.                                               |
| GET      | `/admin/prize-awards?weekKey` · PATCH `/admin/prize-awards/:id` | Fulfillment.                                                       |
| POST     | `/admin/close-week`                                             | `{weekKey?, sync?}` — run inline or enqueue on BullMQ.             |
| POST     | `/admin/leaderboard/rebuild`                                    | Recompute ZSETs from the ledger.                                   |
| POST     | `/admin/leagues/:id/freeze`                                     | End a league immediately.                                          |

Names on public boards are `displayName` or a masked phone (`0913***01`). User-facing error/validation
messages are returned in Persian.
