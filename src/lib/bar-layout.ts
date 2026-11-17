import type { Team } from "./sheet-model";

export function layoutTeamBars(teams: Team[]) {
  const minimum = Math.min(0, ...teams.map((team) => team.totalCents));
  const maximum = Math.max(0, ...teams.map((team) => team.totalCents));
  const roughStep = (Math.max(Math.abs(minimum), maximum) || 10_000) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = Math.max(1, [1, 2, 5, 10].find((factor) => factor * magnitude >= roughStep)! * magnitude);
  const lower = Math.floor(minimum / step) * step;
  const upper = maximum === minimum ? step * 4 : Math.ceil(maximum / step) * step;
  const y = (value: number) => 430 - (value - lower) / (upper - lower) * 370;
  const zeroY = y(0);
  const slotWidth = 552 / Math.max(teams.length, 1);
  const width = Math.min(64, slotWidth * 0.66);

  return {
    zeroY,
    ticks: Array.from({ length: Math.round((upper - lower) / step) + 1 }, (_, index) => {
      const value = lower + index * step;
      return { value, y: y(value) };
    }),
    bars: teams.map((team, index) => ({
      team,
      x: 76 + slotWidth * (index + 0.5),
      y: Math.min(zeroY, y(team.totalCents)),
      width,
      height: Math.abs(y(team.totalCents) - zeroY),
      valueY: y(team.totalCents),
      labelY: y(team.totalCents) + (team.totalCents < 0 ? 23 : -14),
      labelWidth: slotWidth - 8,
    })),
  };
}
