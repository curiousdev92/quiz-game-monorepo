"use client";

import { Award, Check, HelpCircle, LayoutDashboard, Map as MapIcon, Snowflake, Trophy, Wrench, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import Button from "@/components/Button";
import { Badge, Card, PageHeader, Spinner, StatTile } from "@/components/ui";
import {
  api,
  type AdminGameConfig,
  type AdminPrizeAward,
  type AdminQuest,
  type AdminQuestion,
  type League,
  type QuestType,
  type QuestVerify,
} from "@/lib/api";
import { downloadDiscountCodesTemplate, parseDiscountCodesFile } from "@/lib/import-discount-codes";
import { downloadTemplate, parseQuestionsFile } from "@/lib/import-questions";
import { showError } from "@/lib/toast";
import { useGlobalStore } from "@/store/store";

type Tab = "overview" | "questions" | "quests" | "leagues" | "awards";

const TAB_ICONS: Record<Tab, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  questions: HelpCircle,
  quests: MapIcon,
  leagues: Trophy,
  awards: Award,
};

const TAB_LABELS: Record<Tab, string> = {
  overview: "نمای کلی",
  questions: "سوال‌ها",
  quests: "ماموریت‌ها",
  leagues: "لیگ‌ها",
  awards: "جوایز",
};

const FIELD =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500";

export default function AdminPage({ token }: { token: string }): React.JSX.Element {
  const router = useRouter();
  const user = useGlobalStore((st) => st.user);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    // if (!token || !user?.isAdmin) router.replace("/");
    if (user?.isAdmin === false) {
      router.replace("/profile");
    }
  }, [token, user, router]);

  if (!token || !user?.isAdmin) return <Spinner />;

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <PageHeader title="مدیریت" icon={Wrench} />

      <div className="grid grid-cols-5 gap-1 rounded-xl bg-slate-100 p-1 text-xs">
        {(["overview", "questions", "quests", "leagues", "awards"] as Tab[]).map((t) => {
          const Icon = TAB_ICONS[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 font-semibold capitalize transition ${
                tab === t ? "bg-brand-600 text-white" : "text-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" />
              {TAB_LABELS[t]}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <Overview token={token} />}
      {tab === "questions" && <Questions token={token} />}
      {tab === "quests" && <Quests token={token} />}
      {tab === "leagues" && <Leagues token={token} />}
      {tab === "awards" && <Awards token={token} />}
    </main>
  );
}

function Overview({ token }: { token: string }): React.JSX.Element {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.admin.stats>> | null>(null);
  const [cfg, setCfg] = useState<AdminGameConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    api.admin.stats(token).then(setStats);
    api.admin.gameConfig(token).then(setCfg);
  }, [token]);
  useEffect(load, [load]);

  async function save(): Promise<void> {
    if (!cfg) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.admin.updateGameConfig(token, cfg);
      setMsg("ذخیره شد ✓");
    } catch (e) {
      showError(e);
      setMsg("ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  }

  if (!stats || !cfg) return <Spinner />;

  const fields: Array<[keyof Omit<AdminGameConfig, "difficultyMix" | "pointsPerDifficulty">, string]> = [
    ["gameDurationSeconds", "زمان بازی (ثانیه)"],
    ["roundBonus", "پاداش دور"],
    ["referralBonus", "پاداش دعوت"],
  ];

  const PAGE_SIZE = 12;
  const mixTotal = cfg.difficultyMix.reduce((sum: any, m: { count: any }) => sum + m.count, 0);

  function setMixCount(difficulty: number, count: number): void {
    if (!cfg) return;
    const rest = cfg.difficultyMix.filter((m: { difficulty: number }) => m.difficulty !== difficulty);
    setCfg({
      ...cfg,
      difficultyMix: [...rest, { difficulty, count }].sort((a, b) => a.difficulty - b.difficulty),
    });
  }

  function setTierPoints(difficulty: number, points: number): void {
    if (!cfg) return;
    const rest = cfg.pointsPerDifficulty.filter((p: { difficulty: number }) => p.difficulty !== difficulty);
    setCfg({
      ...cfg,
      pointsPerDifficulty: [...rest, { difficulty, points }].sort((a, b) => a.difficulty - b.difficulty),
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="کاربران" value={stats.users} />
        <StatTile label="سوال‌های فعال" value={stats.activeQuestions} />
        <StatTile label="دورهای بازی‌شده" value={stats.rounds} />
        <StatTile label="جوایز در انتظار" value={stats.pendingAwards} />
      </div>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-700">تنظیمات بازی</p>
        {fields.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">{label}</span>
            <input
              type="number"
              value={cfg[key]}
              onChange={(e) => setCfg({ ...cfg, [key]: Number(e.target.value) })}
              className={`${FIELD} w-24 text-right`}
            />
          </label>
        ))}

        <div className="mt-1 border-t border-slate-200 pt-3">
          <p className="text-sm text-slate-700">
            ترکیب سختی سوال‌ها <span className="text-slate-400">(هر صفحه شامل {PAGE_SIZE} سوال)</span>
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {[1, 2, 3].map((d) => {
              const count = cfg.difficultyMix.find((m: { difficulty: number }) => m.difficulty === d)?.count ?? 0;
              return (
                <label key={d} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">درجه سختی {d}</span>
                  <input
                    type="number"
                    min={0}
                    max={PAGE_SIZE}
                    value={count}
                    onChange={(e) => setMixCount(d, Math.max(0, Number(e.target.value)))}
                    className={`${FIELD} w-24 text-right`}
                  />
                </label>
              );
            })}
          </div>
          <p className={`mt-2 text-xs ${mixTotal === PAGE_SIZE ? "text-slate-400" : "text-red-600"}`}>
            مجموع: {mixTotal} / {PAGE_SIZE} {mixTotal !== PAGE_SIZE && `— باید برابر باشد با ${PAGE_SIZE}`}
          </p>
        </div>

        <div className="mt-1 border-t border-slate-200 pt-3">
          <p className="text-sm text-slate-700">امتیاز هر پاسخ درست بر اساس سختی</p>
          <div className="mt-2 flex flex-col gap-2">
            {[1, 2, 3].map((d) => {
              const points =
                cfg.pointsPerDifficulty.find((p: { difficulty: number }) => p.difficulty === d)?.points ?? 0;
              return (
                <label key={d} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">درجه سختی {d}</span>
                  <input
                    type="number"
                    min={0}
                    value={points}
                    onChange={(e) => setTierPoints(d, Math.max(0, Number(e.target.value)))}
                    className={`${FIELD} w-24 text-right`}
                  />
                </label>
              );
            })}
          </div>
        </div>

        <Button onClick={save} disabled={saving || mixTotal !== PAGE_SIZE}>
          {saving ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </Button>
        {msg && <p className="text-center text-sm text-slate-500">{msg}</p>}
      </Card>

      {/* <Button
        variant="secondary"
        onClick={() => api.admin.rebuildLeaderboard(token).then(() => setMsg("جدول امتیازها بازسازی شد ✓"))}
      >
        بازسازی کش جدول امتیازها
      </Button> */}
    </>
  );
}

const EMPTY = {
  text: "",
  choices: ["", "", "", ""],
  correctIndex: 0,
  category: "",
};

function Questions({ token }: { token: string }): React.JSX.Element {
  const [list, setList] = useState<AdminQuestion[] | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);

  const load = useCallback(() => api.admin.listQuestions(token).then(setList), [token]);
  useEffect(() => {
    void load();
  }, [load]);

  async function create(): Promise<void> {
    setBusy(true);
    try {
      await api.admin.createQuestion(token, {
        text: form.text,
        choices: form.choices,
        correctIndex: form.correctIndex,
        category: form.category || undefined,
      });
      setForm({ ...EMPTY, choices: ["", "", "", ""] });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(q: AdminQuestion): Promise<void> {
    if (q.isActive) await api.admin.deleteQuestion(token, q.id);
    else await api.admin.updateQuestion(token, q.id, { isActive: true });
    await load();
  }

  const IMPORT_CHUNK_SIZE = 300; // keeps each request small regardless of file size

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const rows = await parseQuestionsFile(await file.arrayBuffer());
      setImportProgress({ done: 0, total: rows.length });
      const merged = {
        created: 0,
        failed: 0,
        errors: [] as Array<{ row: number; message: string }>,
      };
      for (let offset = 0; offset < rows.length; offset += IMPORT_CHUNK_SIZE) {
        const chunk = rows.slice(offset, offset + IMPORT_CHUNK_SIZE);
        const result = await api.admin.importQuestions(token, chunk);
        merged.created += result.created;
        merged.failed += result.failed;
        merged.errors.push(
          ...result.errors.map((er: { row: number; message: string }) => ({
            ...er,
            row: er.row + offset,
          })),
        );
        setImportProgress({
          done: Math.min(offset + IMPORT_CHUNK_SIZE, rows.length),
          total: rows.length,
        });
      }
      setImportResult(merged);
      await load();
    } catch {
      setImportResult({
        created: 0,
        failed: 0,
        errors: [{ row: 0, message: "خواندن فایل ممکن نشد" }],
      });
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  const valid = form.text.trim() && form.choices.every((c) => c.trim());

  return (
    <>
      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-700">ورود از CSV / Excel</p>
        <div className="flex gap-2">
          <label className="flex-1 cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-500">
            {importing
              ? importProgress
                ? `در حال ورود… ${importProgress.done}/${importProgress.total}`
                : "در حال ورود…"
              : "انتخاب فایل"}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onImportFile}
              disabled={importing}
              className="hidden"
            />
          </label>
          <button
            onClick={downloadTemplate}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium hover:bg-slate-200"
          >
            قالب
          </button>
        </div>
        <p className="text-xs text-slate-400">
          ستون‌ها: <code className="text-slate-500">text, choiceA, choiceB, choiceC, choiceD, correct</code> (A–D),
          اختیاری <code className="text-slate-500">category, difficulty</code>.
        </p>
        {importResult && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-green-700">وارد شد: {importResult.created} سوال.</p>
            {importResult.failed > 0 && (
              <>
                <p className="text-red-700">رد شد: {importResult.failed} ردیف:</p>
                <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-slate-500">
                  {importResult.errors.map((er, i) => (
                    <li key={i}>
                      ردیف {er.row}: {er.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-slate-700">سوال جدید</p>
        <input
          placeholder="متن سوال"
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          className={FIELD}
        />
        {form.choices.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => setForm({ ...form, correctIndex: i })}
              title="علامت‌گذاری پاسخ درست"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                form.correctIndex === i ? "bg-correct text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {String.fromCharCode(65 + i)}
            </button>
            <input
              placeholder={`گزینه ${String.fromCharCode(65 + i)}`}
              value={c}
              onChange={(e) => {
                const choices = [...form.choices];
                choices[i] = e.target.value;
                setForm({ ...form, choices });
              }}
              className={`flex-1 ${FIELD}`}
            />
          </div>
        ))}
        <input
          placeholder="Category (اختیاری)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className={FIELD}
        />
        <p className="text-xs text-slate-400">
          برای تعیین پاسخ درست، روی حرف گزینه بزنید (فعلا {String.fromCharCode(65 + form.correctIndex)}).
        </p>
        <Button onClick={create} disabled={!valid || busy}>
          {busy ? "در حال افزودن…" : "افزودن سوال"}
        </Button>
      </Card>

      {!list ? (
        <Spinner />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((q) => (
            <li
              key={q.id}
              className={`rounded-xl border border-slate-200 bg-white px-4 py-3 ${q.isActive ? "" : "opacity-60"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{q.text}</p>
                  <p className="text-xs text-slate-400">
                    {q.category ?? "بدون دسته‌بندی"} · پاسخ {String.fromCharCode(65 + q.correctIndex)}
                  </p>
                </div>
                <button
                  onClick={() => toggle(q)}
                  className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold ${
                    q.isActive ? "bg-slate-100 text-slate-600" : "bg-correct-soft text-green-700"
                  }`}
                >
                  {q.isActive ? "غیرفعالسازی" : "فعالسازی"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const EMPTY_QUEST = {
  title: "",
  icon: "🎯",
  description: "",
  type: "ACTION" as QuestType,
  rewardScore: 20,
  rewardRounds: 0,
  targetScore: 30,
  actionUrl: "",
  verify: "NONE" as QuestVerify,
  verifyTarget: 1,
  minDwellSeconds: 0,
  shopGameCode: "",
  shopSkuKind: "",
  shopSkuId: "",
  deadline: "",
};

function Quests({ token }: { token: string }): React.JSX.Element {
  const [list, setList] = useState<AdminQuest[] | null>(null);
  const [form, setForm] = useState({ ...EMPTY_QUEST });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.admin.listQuests(token).then(setList), [token]);
  useEffect(() => {
    void load();
  }, [load]);

  async function create(): Promise<void> {
    setBusy(true);
    try {
      await api.admin.createQuest(token, {
        title: form.title,
        icon: form.icon || undefined,
        description: form.description || undefined,
        type: form.type,
        rewardScore: Number(form.rewardScore),
        rewardRounds: Number(form.rewardRounds),
        targetScore: form.type === "CHALLENGE" ? Number(form.targetScore) : undefined,
        actionUrl: form.type === "ACTION" && form.actionUrl ? form.actionUrl : undefined,
        verify: form.type === "ACTION" ? form.verify : undefined,
        verifyTarget:
          form.type === "ACTION" && form.verify === "REFERRAL_SIGNUPS" ? Number(form.verifyTarget) : undefined,
        minDwellSeconds: form.type === "ACTION" && form.verify === "NONE" ? Number(form.minDwellSeconds) : undefined,
        shopGameCode: form.type === "ACTION" && form.shopGameCode.trim() ? form.shopGameCode.trim() : undefined,
        shopSkuKind: form.type === "ACTION" && form.shopSkuKind.trim() ? form.shopSkuKind.trim() : undefined,
        shopSkuId: form.type === "ACTION" && form.shopSkuId.trim() ? form.shopSkuId.trim() : undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      });
      setForm({ ...EMPTY_QUEST });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(q: AdminQuest): Promise<void> {
    if (q.isActive) await api.admin.deleteQuest(token, q.id);
    else await api.admin.updateQuest(token, q.id, { isActive: true });
    await load();
  }

  return (
    <>
      <Card className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-slate-700">ماموریت جدید</p>
        <div className="flex gap-2">
          <input
            placeholder="🎯"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            className={`${FIELD} w-16 text-center text-xl`}
          />
          <input
            placeholder="عنوان"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={`${FIELD} flex-1`}
          />
        </div>
        <textarea
          placeholder="توضیحات"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={FIELD}
          rows={2}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as QuestType })}
            className={FIELD}
          >
            <option value="ACTION">اقدام (خارجی)</option>
            <option value="CHALLENGE">چالش (کسب امتیاز)</option>
          </select>
          <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
            امتیاز پاداش
            <input
              type="number"
              value={form.rewardScore}
              onChange={(e) => setForm({ ...form, rewardScore: Number(e.target.value) })}
              className={`${FIELD} w-20 text-right`}
            />
          </label>
        </div>
        <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
          دور اضافه پس از دریافت
          <input
            type="number"
            min={0}
            value={form.rewardRounds}
            onChange={(e) => setForm({ ...form, rewardRounds: Number(e.target.value) })}
            className={`${FIELD} w-24 text-right`}
          />
        </label>
        {form.type === "CHALLENGE" ? (
          <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
            امتیاز هدف برای باز شدن
            <input
              type="number"
              value={form.targetScore}
              onChange={(e) => setForm({ ...form, targetScore: Number(e.target.value) })}
              className={`${FIELD} w-24 text-right`}
            />
          </label>
        ) : (
          <>
            <input
              placeholder="لینک اقدام (اختیاری، مثلا https://instagram.com/...)"
              value={form.actionUrl}
              onChange={(e) => setForm({ ...form, actionUrl: e.target.value })}
              className={FIELD}
            />
            <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
              تایید
              <select
                value={form.verify}
                onChange={(e) => setForm({ ...form, verify: e.target.value as QuestVerify })}
                className={`${FIELD} flex-1`}
              >
                <option value="NONE">اعتماد به کاربر (دریافت در هر زمان)</option>
                <option value="REFERRAL_SIGNUPS">ثبت‌نام دعوتی‌ها (دوستان دعوت‌شده وارد شوند)</option>
              </select>
            </label>
            {form.verify === "REFERRAL_SIGNUPS" && (
              <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
                ثبت‌نام موردنیاز
                <input
                  type="number"
                  min={1}
                  value={form.verifyTarget}
                  onChange={(e) => setForm({ ...form, verifyTarget: Number(e.target.value) })}
                  className={`${FIELD} w-24 text-right`}
                />
              </label>
            )}
            {form.verify === "NONE" && (
              <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
                حداقل انتظار پس از باز کردن (ثانیه)
                <input
                  type="number"
                  min={0}
                  value={form.minDwellSeconds}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minDwellSeconds: Number(e.target.value),
                    })
                  }
                  className={`${FIELD} w-24 text-right`}
                />
              </label>
            )}
            {/* Shop-access: fill all three to make the button grant an external game SKU (by phone). */}
            <p className="mt-1 text-xs font-semibold text-slate-500">دسترسی فروشگاه (اختیاری)</p>
            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="game_code"
                value={form.shopGameCode}
                onChange={(e) => setForm({ ...form, shopGameCode: e.target.value })}
                className={FIELD}
              />
              <input
                placeholder="sku_kind"
                value={form.shopSkuKind}
                onChange={(e) => setForm({ ...form, shopSkuKind: e.target.value })}
                className={FIELD}
              />
              <input
                placeholder="sku_id"
                value={form.shopSkuId}
                onChange={(e) => setForm({ ...form, shopSkuId: e.target.value })}
                className={FIELD}
              />
            </div>
          </>
        )}
        <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
          مهلت (اختیاری)
          <input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className={`${FIELD} flex-1`}
          />
        </label>
        <Button onClick={create} disabled={!form.title.trim() || busy}>
          {busy ? "در حال افزودن…" : "افزودن ماموریت"}
        </Button>
      </Card>

      {!list ? (
        <Spinner />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((q) => (
            <li
              key={q.id}
              className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 ${
                q.isActive ? "" : "opacity-60"
              }`}
            >
              <span className="text-2xl">{q.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{q.title}</p>
                <p className="text-xs text-slate-400">
                  {q.type} · +{q.rewardScore}
                  {q.rewardRounds > 0 ? ` · +${q.rewardRounds} دور` : ""}
                  {q.type === "CHALLENGE" && q.targetScore ? ` · هدف ${q.targetScore}` : ""}
                  {q.type === "ACTION" && q.verify === "REFERRAL_SIGNUPS" ? ` · نیاز به ${q.verifyTarget} دعوت` : ""}
                  {q.type === "ACTION" && q.verify === "NONE" && q.minDwellSeconds > 0
                    ? ` · انتظار ${q.minDwellSeconds}s`
                    : ""}
                  {q.deadline ? ` · تا ${new Date(q.deadline).toLocaleDateString()}` : ""}
                </p>
              </div>
              <button
                onClick={() => toggle(q)}
                className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold ${
                  q.isActive ? "bg-slate-100 text-slate-600" : "bg-correct-soft text-green-700"
                }`}
              >
                {q.isActive ? "غیرفعال" : "فعال"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Leagues({ token }: { token: string }): React.JSX.Element {
  const [list, setList] = useState<League[] | null>(null);
  const [stats, setStats] = useState<Array<{
    type: string;
    percent: number;
    total: number;
    used: number;
  }> | null>(null);
  const [form, setForm] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    isOverall: false,
    roundAllowance: 3,
    parentLeagueId: "",
  });
  const [importingCodes, setImportingCodes] = useState(false);
  const [codeImportResult, setCodeImportResult] = useState<{
    created: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    api.admin.leagues(token).then(setList);
    api.admin.discountStats(token).then(setStats);
  }, [token]);
  useEffect(load, [load]);

  async function create(): Promise<void> {
    if (!form.title || !form.startsAt || !form.endsAt) return;
    await api.admin.createLeague(token, {
      title: form.title,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      isOverall: form.isOverall,
      roundAllowance: Number(form.roundAllowance),
      parentLeagueId: !form.isOverall && form.parentLeagueId ? form.parentLeagueId : undefined,
    });
    setForm({
      title: "",
      startsAt: "",
      endsAt: "",
      isOverall: false,
      roundAllowance: 3,
      parentLeagueId: "",
    });
    load();
  }

  async function freeze(l: League): Promise<void> {
    const r = await api.admin.freezeLeague(token, l.id);
    setMsg(`بسته شد "${l.title}": ${r.rewardsCreated} پاداش`);
    load();
  }

  async function onImportCodesFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setImportingCodes(true);
    setCodeImportResult(null);
    try {
      const rows = await parseDiscountCodesFile(await file.arrayBuffer());
      const result = await api.admin.importDiscountCodes(token, rows);
      setCodeImportResult(result);
      load();
    } catch {
      setCodeImportResult({
        created: 0,
        failed: 0,
        errors: [{ row: 0, message: "خواندن فایل ممکن نشد" }],
      });
    } finally {
      setImportingCodes(false);
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-slate-700">لیگ جدید</p>
        <input
          placeholder="عنوان"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={FIELD}
        />
        <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
          شروع
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            className={`${FIELD} flex-1`}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
          پایان
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            className={`${FIELD} flex-1`}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
          دور برای هر بازیکن
          <input
            type="number"
            min={0}
            value={form.roundAllowance}
            onChange={(e) => setForm({ ...form, roundAllowance: Number(e.target.value) })}
            className={`${FIELD} w-24 text-right`}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isOverall}
            onChange={(e) =>
              setForm({
                ...form,
                isOverall: e.target.checked,
                parentLeagueId: "",
              })
            }
          />
          کمپین کلی (فقط به نفر اول PS5 می‌دهد)
        </label>
        {!form.isOverall && (
          <label className="flex items-center justify-between gap-2 text-sm text-slate-500">
            کمپین مادر
            <select
              value={form.parentLeagueId}
              onChange={(e) => setForm({ ...form, parentLeagueId: e.target.value })}
              className={`${FIELD} flex-1`}
            >
              <option value="">— هیچ‌کدام —</option>
              {list
                ?.filter((l) => l.isOverall)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
            </select>
          </label>
        )}
        <Button onClick={create} disabled={!form.title || !form.startsAt || !form.endsAt}>
          ساخت لیگ
        </Button>
      </Card>

      {!list ? (
        <Spinner />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((l) => (
            <li key={l.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {l.title} {l.isOverall && <Badge tone="brand">کمپین</Badge>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(l.startsAt).toLocaleString()} → {new Date(l.endsAt).toLocaleString()}
                    {` · ${l.roundAllowance} دور برای هر بازیکن`}
                    {l.frozenAt ? " · بسته شد ✓" : ""}
                    {l.parentLeagueId && ` · در ${list?.find((p) => p.id === l.parentLeagueId)?.title ?? "کمپین"}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!l.frozenAt && (
                    <button
                      onClick={() => freeze(l)}
                      className="flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700"
                    >
                      <Snowflake className="h-3.5 w-3.5" />
                      بستن
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-700">مخزن کدهای تخفیف</p>
        {stats && stats.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {stats.map((s) => (
              <span key={`${s.type}:${s.percent}`} className="rounded-lg bg-slate-100 px-2 py-1">
                {s.type} {s.percent}%: {s.total - s.used} باقی‌مانده / {s.total}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <label className="flex-1 cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-500">
            {importingCodes ? "در حال ورود…" : "ورود از Excel"}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onImportCodesFile}
              disabled={importingCodes}
              className="hidden"
            />
          </label>
          <button
            onClick={downloadDiscountCodesTemplate}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium hover:bg-slate-200"
          >
            قالب
          </button>
        </div>
        <p className="text-xs text-slate-400">
          ستون‌ها: <code className="text-slate-500">code, discount type, discount percent, discount title</code>.
        </p>
        {codeImportResult && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-green-700">وارد شد: {codeImportResult.created} کد.</p>
            {codeImportResult.failed > 0 && (
              <>
                <p className="text-red-700">رد شد: {codeImportResult.failed} ردیف:</p>
                <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-slate-500">
                  {codeImportResult.errors.map((er, i) => (
                    <li key={i}>
                      ردیف {er.row}: {er.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Card>

      {msg && <p className="text-center text-sm text-slate-500">{msg}</p>}
    </>
  );
}

function Awards({ token }: { token: string }): React.JSX.Element {
  const [awards, setAwards] = useState<AdminPrizeAward[] | null>(null);
  const [weekKey, setWeekKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => api.admin.prizeAwards(token, weekKey || undefined).then(setAwards), [token, weekKey]);
  useEffect(() => {
    void load();
  }, [load]);

  async function close(): Promise<void> {
    setMsg("در حال بستن…");
    const r = await api.admin.closeWeek(token, weekKey || undefined);
    setMsg(`بسته شد ${r.weekKey}: ${r.awardsCreated ?? 0} جایزه`);
    await load();
  }

  async function setStatus(id: string, status: string): Promise<void> {
    await api.admin.updateAward(token, id, status);
    await load();
  }

  return (
    <>
      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-700">بستن هفتگی</p>
        <input
          placeholder="کلید هفته (خالی = هفته قبل)"
          value={weekKey}
          onChange={(e) => setWeekKey(e.target.value)}
          className={`${FIELD} font-mono`}
        />
        <Button onClick={close}>اجرای بستن هفتگی</Button>
        {msg && <p className="text-center text-sm text-slate-500">{msg}</p>}
      </Card>

      {!awards ? (
        <Spinner />
      ) : awards.length === 0 ? (
        <p className="py-6 text-center text-slate-400">{`هنوز جایزه‌ای ثبت نشده است.`}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {awards.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium">{a.prize.name}</p>
                <p className="text-xs text-slate-400">
                  {a.user.displayName ?? a.user.phone} · {a.weekKey} · {a.status}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setStatus(a.id, "FULFILLED")}
                  className="flex items-center gap-1 rounded-lg bg-correct-soft px-2 py-1 text-xs font-semibold text-green-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  تحویل شد
                </button>
                <button
                  onClick={() => setStatus(a.id, "CANCELLED")}
                  className="flex items-center gap-1 rounded-lg bg-wrong-soft px-2 py-1 text-xs font-semibold text-red-700"
                >
                  <X className="h-3.5 w-3.5" />
                  لغو
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
