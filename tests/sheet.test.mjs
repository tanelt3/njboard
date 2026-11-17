import assert from "node:assert/strict";
import test from "node:test";
import { parseSheetCsv } from "../src/lib/sheet-csv.ts";
import { parseMoney, summarizeSheet } from "../src/lib/sheet-model.ts";

test("groups repeated teams and counts initiatives without losing empty optional cells", () => {
  const table = parseSheetCsv('Team,Initiative topic / introduction,Value / savings (€ per year),Responsible person\r\nTeam 1,Saving time,100,\r\nTeam 2,Saving electricity,30,\r\nTeam 3,Saving on food,70,\r\nTeam 2,Saving on internet,120,');
  const summary = summarizeSheet(table);
  assert.equal(summary.totalCents, 32000);
  assert.equal(summary.initiativeCount, 4);
  assert.deepEqual(summary.teams.map((team) => [team.name, team.totalCents, team.initiatives]), [["Team 2", 15000, 2], ["Team 1", 10000, 1], ["Team 3", 7000, 1]]);
  assert.equal(table.rows[0][3], "");
});

test("preserves quoted commas, embedded newlines, quotes and UTF-8 headers", () => {
  const table = parseSheetCsv('\uFEFFTeam,Value / savings (€ per year),Notes\r\nTeam 1,"1 234,56 €","First, second\nSay ""hello"""\r\n,,,\r\n');
  assert.equal(table.headers[0], "Team");
  assert.equal(table.rows.length, 1);
  assert.equal(table.rows[0][2], 'First, second\nSay "hello"');
  assert.equal(summarizeSheet(table).totalCents, 123456);
});

test("reads European and US currency and preserves zero and negative adjustments", () => {
  for (const [text, expected] of [["€1,099", 109900], ["1.099,50 €", 109950], ["1,099.50", 109950], ["100,50", 10050], ["0", 0], ["", 0], ["−20,50", -2050], ["(10.00)", -1000], ["EUR 2 000", 200000], ["not a number", null], ["#VALUE!", null]]) {
    assert.equal(parseMoney(text), expected, text);
  }
});

test("invalid values are flagged and unassigned teams are still counted", () => {
  const result = summarizeSheet(parseSheetCsv('Team,Value / savings (€ per year)\n,20\nTeam 2,#VALUE!\nTeam 2,0'));
  assert.equal(result.totalCents, 2000);
  assert.equal(result.initiativeCount, 3);
  assert.equal(result.invalidValues, 1);
  assert.equal(result.teams[0].name, "Unassigned");
});

test("empty sheets are valid but changed required headers are rejected", () => {
  assert.deepEqual(summarizeSheet(parseSheetCsv("\n")), { teams: [], totalCents: 0, initiativeCount: 0, invalidValues: 0 });
  assert.throws(() => summarizeSheet(parseSheetCsv("Name,Unrelated\nA,5")), /Team/);
});
