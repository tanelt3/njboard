import { parse } from "csv-parse/sync";
import type { SheetTable } from "./sheet-model";

export function parseSheetCsv(csv: string): SheetTable {
  const records = (parse(csv, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][]).filter((row) => row.some((cell) => cell.trim() !== ""));

  if (!records.length) return { headers: [], rows: [] };
  const [firstRow, ...rows] = records;
  const width = records.reduce((max, row) => Math.max(max, row.length), 0);
  return {
    headers: Array.from({ length: width }, (_, i) => firstRow[i]?.trim() || `Column ${i + 1}`),
    rows: rows.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? "")),
  };
}
