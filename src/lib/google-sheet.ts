import "server-only";
import { parseSheetCsv } from "./sheet-csv";
import { summarizeSheet, type DashboardData } from "./sheet-model";

export async function readGoogleSheet(): Promise<DashboardData> {
  const id = process.env.GOOGLE_SHEET_ID || "1MoumNmLTYB_VxDkO0rE2k-2p7wMuZy1g";
  const gid = process.env.GOOGLE_SHEET_GID || "1940995846";
  if (!/^[a-zA-Z0-9_-]+$/.test(id) || !/^\d+$/.test(gid)) {
    throw new Error("Invalid Google Sheet ID or sheet GID.");
  }

  const url = new URL(`https://docs.google.com/spreadsheets/d/${id}/export`);
  url.searchParams.set("format", "csv");
  url.searchParams.set("gid", gid);
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/csv")) {
    throw new Error("Could not read the Google Sheet. Check the link and sharing permissions.");
  }
  const table = parseSheetCsv(await response.text());
  return {
    ...summarizeSheet(table),
    fetchedAt: new Date().toISOString(),
  };
}
