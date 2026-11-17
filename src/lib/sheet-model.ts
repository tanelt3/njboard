export type SheetTable = { headers: string[]; rows: string[][] };

export type Team = {
  name: string;
  totalCents: number;
  initiatives: number;
};

export type DashboardData = {
  teams: Team[];
  totalCents: number;
  initiativeCount: number;
  invalidValues: number;
  fetchedAt: string;
};

// Google Sheets exports formatted values, including both EU and US numbers.
export function parseMoney(value: string): number | null {
  let text = value.trim();
  if (!text) return 0;
  const accountingNegative = /^\(.*\)$/.test(text);
  if (accountingNegative) text = text.slice(1, -1);
  text = text.replace(/EUR|€/gi, "").replace(/[\s\u00a0\u202f']/g, "").replace(/−/g, "-");
  if (!/^[+-]?(?:\d[\d.,]*|[.,]\d+)$/.test(text)) return null;

  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const grouping = decimal === "," ? "." : ",";
    text = text.split(grouping).join("").replace(decimal, ".");
  } else if (/^[+-]?\d{1,3}([.,]\d{3})+$/.test(text)) {
    text = text.replace(/[.,]/g, "");
  } else {
    text = text.replace(",", ".");
  }

  const amount = Number(text) * (accountingNegative ? -1 : 1);
  const cents = Math.round(amount * 100);
  return Number.isFinite(amount) && Number.isSafeInteger(cents) ? cents : null;
}

export function summarizeSheet(table: SheetTable) {
  const teamColumn = table.headers.findIndex((header) => /^(team|meeskond)$/i.test(header.trim()));
  const valueColumn = table.headers.findIndex((header) => /value|savings|sääst|väärtus/i.test(header));
  if (table.headers.length && (teamColumn < 0 || valueColumn < 0)) {
    throw new Error('The sheet must include the columns "Team" and "Value / savings (€ per year)".');
  }

  const teams = new Map<string, Team>();
  let invalidValues = 0;
  for (const row of table.rows) {
    const name = row[teamColumn]?.trim() || "Unassigned";
    const amount = parseMoney(row[valueColumn] ?? "");
    if (amount === null) invalidValues += 1;
    const team = teams.get(name) ?? { name, totalCents: 0, initiatives: 0 };
    team.totalCents += amount ?? 0;
    team.initiatives += 1;
    teams.set(name, team);
  }
  const sorted = [...teams.values()].sort((a, b) => b.totalCents - a.totalCents || a.name.localeCompare(b.name, "en", { numeric: true }));
  return {
    teams: sorted,
    totalCents: sorted.reduce((sum, team) => sum + team.totalCents, 0),
    initiativeCount: table.rows.length,
    invalidValues,
  };
}
