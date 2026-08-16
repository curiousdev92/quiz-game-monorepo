import type { ImportedQuestion } from "./api";

type Row = Record<string, unknown>;

/** Case-insensitive, trimmed header lookup across several accepted names. */
function pick(lowerRow: Row, keys: string[]): unknown {
  for (const key of keys) {
    const v = lowerRow[key];
    if (v !== undefined && v !== null && `${v}`.trim() !== "") return v;
  }
  return undefined;
}

/** Accepts A–D (any case), 1–4, or 0–3. Returns -1 when missing/invalid (backend reports the row). */
function toCorrectIndex(v: unknown): number {
  if (v === undefined || v === null || `${v}`.trim() === "") return -1;
  const s = `${v}`.trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(s)) return s.charCodeAt(0) - 65;
  const n = Number(s);
  if (Number.isInteger(n)) {
    if (n >= 1 && n <= 4) return n - 1;
    if (n >= 0 && n <= 3) return n;
  }
  return -1;
}

/**
 * Parse a .xlsx / .xls / .csv file (first sheet) into normalized question rows.
 * xlsx (SheetJS) is large, so it's loaded on demand — only when an admin actually imports.
 */
export async function parseQuestionsFile(buf: ArrayBuffer): Promise<ImportedQuestion[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });

  const out: ImportedQuestion[] = [];
  for (const raw of json) {
    // normalize keys to lowercase/trimmed
    const row: Row = {};
    for (const k of Object.keys(raw)) row[k.trim().toLowerCase()] = raw[k];

    const text = pick(row, ["text", "question", "question text"]);
    const a = pick(row, ["choicea", "choice a", "a", "option a", "optiona", "choice1", "option1"]);
    const b = pick(row, ["choiceb", "choice b", "b", "option b", "optionb", "choice2", "option2"]);
    const c = pick(row, ["choicec", "choice c", "c", "option c", "optionc", "choice3", "option3"]);
    const d = pick(row, ["choiced", "choice d", "d", "option d", "optiond", "choice4", "option4"]);
    const correct = pick(row, ["correct", "answer", "correct answer", "correctindex"]);
    const category = pick(row, ["category", "topic"]);
    const difficulty = pick(row, ["difficulty", "level"]);

    // skip fully empty lines
    if (!text && !a && !b && !c && !d) continue;

    out.push({
      text: `${text ?? ""}`.trim(),
      choices: [a, b, c, d].map((x) => `${x ?? ""}`.trim()),
      correctIndex: toCorrectIndex(correct),
      category: category ? `${category}`.trim() : undefined,
      difficulty: difficulty !== undefined && `${difficulty}`.trim() !== "" ? Number(difficulty) : undefined,
    });
  }
  return out;
}

/** A CSV template string users can fill in. */
export const QUESTIONS_TEMPLATE_CSV =
  "text,choiceA,choiceB,choiceC,choiceD,correct,category,difficulty\n" +
  "What is 2+2?,3,4,5,6,B,math,1\n" +
  "Capital of France?,Berlin,Madrid,Paris,Rome,C,geography,1\n";

export function downloadTemplate(): void {
  const blob = new Blob([QUESTIONS_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "questions-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
