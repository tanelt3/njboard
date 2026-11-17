import assert from "node:assert/strict";
import test from "node:test";
import { layoutTeamBubbles } from "../src/lib/bubble-layout.ts";

const teamsFor = (amounts) => amounts.map((amount, index) => ({
  name: `Team ${index + 1}`,
  totalCents: amount * 100,
  initiatives: index + 1,
}));

function assertReadableLayout(circles) {
  const radii = circles.map((circle) => circle.r);
  assert.ok(Math.max(...radii) / Math.min(...radii) <= 2 + 1e-9);
  assert.ok(Math.min(...radii) >= 60, "All six teams must have room for their labels");
  for (const [index, circle] of circles.entries()) {
    assert.ok(Number.isFinite(circle.x) && Number.isFinite(circle.y) && Number.isFinite(circle.r));
    assert.ok(circle.x - circle.r >= 0 && circle.x + circle.r <= 640);
    assert.ok(circle.y - circle.r >= 0 && circle.y + circle.r <= 540);
    for (const other of circles.slice(index + 1)) {
      assert.ok(Math.hypot(circle.x - other.x, circle.y - other.y) >= circle.r + other.r - 1e-9);
    }
  }
}

test("a €100,000 outlier keeps all six teams readable and preserves exact values", () => {
  const teams = teamsFor([100000, 3000, 1070, 500, 150, 100]);
  const original = structuredClone(teams);
  const circles = layoutTeamBubbles(teams);
  assert.equal(circles.length, 6);
  assertReadableLayout(circles);
  assert.deepEqual(teams, original);
  assert.deepEqual(circles.map((circle) => circle.team), original);
  for (let index = 1; index < circles.length; index++) {
    assert.ok(circles[index - 1].r > circles[index].r, "Savings order must remain visible");
  }
});

test("similar amounts keep their original area proportions", () => {
  const circles = layoutTeamBubbles(teamsFor([150, 100, 70]));
  assert.ok(Math.abs((circles[0].r / circles[2].r) ** 2 - 150 / 70) < 1e-9);
});

test("zero, negative, equal and extreme amounts produce finite visible circles", () => {
  for (const amounts of [[0, 0, 0, 0, 0, 0], [-100, -20, 0, 0, 10, 1000000000], [100, 100, 100, 100, 100, 100], [0.01, 1, 10, 100, 1000, 1000000000]]) {
    assertReadableLayout(layoutTeamBubbles(teamsFor(amounts)));
  }
});

test("empty and single-team sheets remain supported", () => {
  assert.deepEqual(layoutTeamBubbles([]), []);
  const circles = layoutTeamBubbles(teamsFor([100]));
  assert.equal(circles.length, 1);
  assertReadableLayout(circles);
});
