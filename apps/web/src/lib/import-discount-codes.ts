import type { ImportedDiscountCode } from "./api";

type Row = Record<string, unknown>;

/** Case-insensitive, trimmed header lookup across several accepted names. */
function pick(lowerRow: Row, keys: string[]): unknown {
  for (const key of keys) {
    const v = lowerRow[key];
    if (v !== undefined && v !== null && `${v}`.trim() !== "") return v;
  }
  return undefined;
}

/**
 * Parse a .xlsx / .xls / .csv file (first sheet) into normalized discount-code rows.
 * xlsx (SheetJS) is large, so it's loaded on demand — only when an admin actually imports.
 */
export async function parseDiscountCodesFile(buf: ArrayBuffer): Promise<ImportedDiscountCode[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });

  const out: ImportedDiscountCode[] = [];
  for (const raw of json) {
    // normalize keys to lowercase/trimmed
    const row: Row = {};
    for (const k of Object.keys(raw)) row[k.trim().toLowerCase()] = raw[k];

    const code = pick(row, ["code", "discount code"]);
    const type = pick(row, ["discount type", "type"]);
    const percent = pick(row, ["discount percent", "percent", "percentage"]);
    const title = pick(row, ["discount title", "title", "name"]);

    // skip fully empty lines
    if (!code && !type && !percent && !title) continue;

    out.push({
      code: `${code ?? ""}`.trim(),
      type: `${type ?? ""}`.trim(),
      percent: percent !== undefined && `${percent}`.trim() !== "" ? Number(percent) : NaN,
      title: `${title ?? ""}`.trim(),
    });
  }
  return out;
}

/** A CSV template string admins can fill in. */
export const DISCOUNT_CODES_TEMPLATE_CSV =
  "code,discount type,discount percent,discount title\n" +
  "SAVE10-A,مایکت,10,10% off your next order\n" +
  "SAVE25-A,کافه بازار,25,25% off your next order\n";

export function downloadDiscountCodesTemplate(): void {
  const blob = new Blob([DISCOUNT_CODES_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "discount-codes-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
