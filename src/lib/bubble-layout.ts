import { hierarchy, pack } from "d3-hierarchy";
import type { Team } from "./sheet-model";

const MAX_RADIUS_RATIO = 2;
const MIN_RADIUS = 60;

type BubbleNode = {
  team?: Team;
  weight?: number;
  children?: BubbleNode[];
};

export function layoutTeamBubbles(teams: Team[]) {
  if (!teams.length) return [];

  // D3 derives radius from sqrt(weight). Keep proportional areas for ordinary
  // values, but reduce the exponent when the radius spread would exceed 2:1.
  // Normalized weights only affect the layout; original team totals stay intact.
  const values = teams.map((team) => Math.max(team.totalCents, 1));
  const maxLog = Math.log(Math.max(...values));
  const spread = maxLog - Math.log(Math.min(...values));
  const exponent = spread > 0 ? Math.min(1, 2 * Math.log(MAX_RADIUS_RATIO) / spread) : 1;
  function packTeams(power: number) {
    const root = hierarchy<BubbleNode>({
      children: teams.map((team, index) => ({
        team,
        weight: Math.exp((Math.log(values[index]) - maxLog) * power),
      })),
    })
      .sum((node) => node.weight ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    return pack<BubbleNode>().size([640, 540]).padding(16)(root).leaves().map((node) => ({
      team: node.data.team!,
      x: node.x,
      y: node.y,
      r: node.r,
    }));
  }

  let circles = packTeams(exponent);
  if (circles.every((circle) => circle.r >= MIN_RADIUS)) return circles;

  // The chart shows up to six teams. If packing still leaves too little room
  // for labels, flatten the scale just enough to give each team a readable size.
  let lower = 0;
  let upper = exponent;
  circles = packTeams(lower);
  for (let iteration = 0; iteration < 12; iteration++) {
    const power = (lower + upper) / 2;
    const candidate = packTeams(power);
    if (candidate.every((circle) => circle.r >= MIN_RADIUS)) {
      lower = power;
      circles = candidate;
    } else {
      upper = power;
    }
  }
  return circles;
}
