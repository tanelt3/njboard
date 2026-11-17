import assert from "node:assert/strict";
import test from "node:test";
import { layoutTeamBars } from "../src/lib/bar-layout.ts";

const teamsFor = (amounts) => amounts.map((amount, index) => ({ name: `Team ${index + 1}`, totalCents: amount * 100, initiatives: 1 }));

test("bar heights compare exact savings on a linear scale starting at zero", () => {
  const teams = teamsFor([100000, 3000, 1070, 500, 150, 100]);
  const { bars, zeroY } = layoutTeamBars(teams);
  assert.equal(bars.length, teams.length);
  bars.forEach((bar, index) => {
    assert.deepEqual(bar.team, teams[index]);
    assert.ok(Math.abs(bar.y + bar.height - zeroY) < 1e-9);
    assert.ok(Math.abs(bar.height / bars[0].height - teams[index].totalCents / teams[0].totalCents) < 1e-9);
    assert.ok(bar.labelY >= 0 && bar.labelY < 480);
  });
});

test("negative savings extend below zero and labels stay within the chart", () => {
  for (const amounts of [[100, 0, -100], [-100, -200], [0.01, -0.01]]) {
    const { bars, zeroY } = layoutTeamBars(teamsFor(amounts));
    for (const bar of bars) {
      assert.ok(bar.team.totalCents >= 0 ? bar.valueY <= zeroY : bar.valueY > zeroY);
      assert.ok(bar.height >= 0 && Number.isFinite(bar.height));
      assert.ok(bar.labelY >= 0 && bar.labelY < 480);
    }
  }
});

test("empty and all-zero data have a finite axis without fabricated savings", () => {
  for (const teams of [[], teamsFor([0, 0, 0, 0, 0, 0])]) {
    const { bars, ticks, zeroY } = layoutTeamBars(teams);
    assert.equal(bars.length, teams.length);
    assert.ok(Number.isFinite(zeroY));
    assert.ok(ticks.every((tick) => Number.isFinite(tick.y)));
    assert.ok(bars.every((bar) => bar.height === 0));
  }
});
