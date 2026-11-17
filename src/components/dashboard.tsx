"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { layoutTeamBubbles } from "@/lib/bubble-layout";
import { layoutTeamBars } from "@/lib/bar-layout";
import type { DashboardData, Team } from "@/lib/sheet-model";

const REFRESH_MS = 30_000;
const GOAL_KEY = "njboard.goal.v1";
const DEFAULT_GOAL = { title: "Annual savings goal", amount: 6000 };
const COLORS = ["#FF9408", "#095D66", "#23C172", "#FFD59D", "#000000", "#B6E5D5"];
const money = (cents: number) => new Intl.NumberFormat("en-IE", {
  style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2,
}).format(cents / 100);
const countLabel = (count: number) => `${count} ${count === 1 ? "initiative" : "initiatives"}`;

function Icon({ name }: { name: "edit" | "close" }) {
  const paths = {
    edit: "m14 5 5 5 M4 20l5-1L20 8a2.12 2.12 0 0 0-5-5L4 14z",
    close: "m6 6 12 12 M6 18 18 6",
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function BubbleChart({ teams }: { teams: Team[] }) {
  const circles = useMemo(() => layoutTeamBubbles(teams), [teams]);

  return (
    <svg className="bubble-chart" viewBox="0 0 640 540" role="img" aria-label="Annual savings by team. Bubble sizes are adjusted for readability; labels show exact savings.">
      {circles.map((circle, index) => {
        const team = circle.team;
        const dark = index === 1 || index === 4;
        const labelSize = Math.min(25, Math.max(20, circle.r / 5.5));
        const valueSize = Math.min(51, Math.max(28, circle.r / 2.7));
        const countSize = Math.min(19, Math.max(16, circle.r / 6.5));
        const maxNameLength = Math.max(6, Math.floor(circle.r * 1.6 / (labelSize * 0.62)));
        const name = team.name.length > maxNameLength ? `${team.name.slice(0, maxNameLength - 1)}…` : team.name;
        return (
          <g key={team.name}>
            <title>{team.name}: {money(team.totalCents)} · {countLabel(team.initiatives)}</title>
            <circle cx={circle.x} cy={circle.y} r={circle.r} fill={COLORS[index]} />
            <text x={circle.x} y={circle.y - valueSize * 0.85} textAnchor="middle" fill={dark ? "#FFFFFF" : "#000000"} fontSize={labelSize} fontWeight="600">{name}</text>
            <text x={circle.x} y={circle.y + valueSize * 0.35} textAnchor="middle" fill={dark ? "#FFFFFF" : "#000000"} fontSize={Math.min(valueSize, circle.r * 1.65 / (money(team.totalCents).length * 0.6))} fontWeight="800" letterSpacing="-1">{money(team.totalCents)}</text>
            <text x={circle.x} y={circle.y + valueSize * 1.18} textAnchor="middle" fill={dark ? "#FFFFFF" : "#000000"} fontSize={countSize} opacity="0.75">{countLabel(team.initiatives)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function BarChart({ teams }: { teams: Team[] }) {
  const { bars, ticks, zeroY } = useMemo(() => layoutTeamBars(teams), [teams]);
  const axisMoney = (cents: number) => new Intl.NumberFormat("en-IE", {
    style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1,
  }).format(cents / 100);

  return (
    <svg className="bar-chart" viewBox="0 0 640 540" role="img" aria-label="Annual savings by team. Bar heights use a linear euro scale; labels show exact savings.">
      {ticks.map((tick) => (
        <g key={tick.value} className="bar-tick" aria-hidden="true">
          <line x1="76" x2="628" y1={tick.y} y2={tick.y} stroke="#ded9cf" strokeDasharray="3 6" />
          <text x="62" y={tick.y + 5} textAnchor="end" fill="#8b877e" fontSize="14">{axisMoney(tick.value)}</text>
        </g>
      ))}
      <line x1="76" x2="628" y1={zeroY} y2={zeroY} stroke="#bcb5a8" />
      {bars.map((bar, index) => {
        const amount = money(bar.team.totalCents);
        const name = bar.team.name.length > 10 ? `${bar.team.name.slice(0, 9)}…` : bar.team.name;
        return (
          <g className="team-bar" key={bar.team.name}>
            <title>{bar.team.name}: {amount} · {countLabel(bar.team.initiatives)}</title>
            <rect x={bar.x - bar.width / 2} y={bar.y} width={bar.width} height={bar.height} rx="5" fill={COLORS[index]} />
            {bar.height < 2 && <line x1={bar.x - bar.width / 2} x2={bar.x + bar.width / 2} y1={bar.valueY} y2={bar.valueY} stroke={COLORS[index]} strokeWidth="2" />}
            <text className="bar-amount" x={bar.x} y={bar.labelY} textAnchor="middle" fill="#000000" fontSize={Math.min(22, bar.labelWidth / (amount.length * 0.62))} fontWeight="800">{amount}</text>
            <text x={bar.x} y="480" textAnchor="middle" fill="#000000" fontSize="17" fontWeight="600">{name}</text>
            <text x={bar.x} y="504" textAnchor="middle" fill="#8b877e" fontSize="13">{countLabel(bar.team.initiatives)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [chartType, setChartType] = useState<"bubbles" | "bars">("bubbles");
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [goalError, setGoalError] = useState("");
  const goalDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(GOAL_KEY) || "null");
      if (stored && typeof stored.title === "string" && stored.title.trim() && typeof stored.amount === "number" && Number.isFinite(stored.amount) && stored.amount > 0) {
        setGoal({ title: stored.title === "Aastane säästueesmärk" ? DEFAULT_GOAL.title : stored.title, amount: stored.amount });
      }
    } catch { /* Use the initial goal when storage is unavailable. */ }
  }, []);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;
    async function refresh() {
      if (inFlight || !active) return;
      inFlight = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 18_000);
      setLoading(true);
      try {
        const response = await fetch("/api/sheet", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Google Sheets is unavailable.");
        const nextData: DashboardData = await response.json();
        if (active) { setData(nextData); setError(null); }
      } catch {
        if (active) setError("Could not refresh the data. Retrying automatically.");
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
        if (active) setLoading(false);
      }
    }
    void refresh();
    const onVisible = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(onVisible, REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => { active = false; controller?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
  }, [refreshKey]);

  const topTeams = useMemo(() => data?.teams.slice(0, 6) ?? [], [data]);
  const total = data?.totalCents ?? 0;
  const percentage = total / (goal.amount * 100) * 100;
  const progress = Math.max(0, Math.min(100, percentage));

  function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const amount = Number(form.get("amount"));
    if (!title || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) { setGoalError("Enter a title and a positive target of up to €1 billion."); return; }
    const nextGoal = { title, amount };
    setGoal(nextGoal);
    try { localStorage.setItem(GOAL_KEY, JSON.stringify(nextGoal)); setGoalError(""); goalDialog.current?.close(); }
    catch { setGoalError("Your goal is applied, but this browser could not save it for your next visit."); }
  }

  return (
    <main className="board" aria-label="Team savings dashboard">
      {error && (
        <div className="notice" role="alert">
          <span>{error} {data ? "Showing the last available data." : "Data is currently unavailable."}</span>
          <button disabled={loading} onClick={() => setRefreshKey((key) => key + 1)}>Retry</button>
        </div>
      )}
      {data && data.invalidValues > 0 && (
        <p className="notice" role="status">{data.invalidValues} unreadable savings {data.invalidValues === 1 ? "value is" : "values are"} excluded from the total.</p>
      )}

      <div className="board-content">
        <section className="chart-pane" aria-label="Team contributions">
          <div className="chart-toolbar">
            <div className="chart-toggle" role="group" aria-label="Chart type">
              <button type="button" aria-pressed={chartType === "bubbles"} aria-controls="team-chart" onClick={() => setChartType("bubbles")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="8" cy="9" r="5" /><circle cx="17" cy="16" r="4" /><circle cx="6" cy="19" r="2" /></svg>
                Bubbles
              </button>
              <button type="button" aria-pressed={chartType === "bars"} aria-controls="team-chart" onClick={() => setChartType("bars")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
                Bars
              </button>
            </div>
          </div>
          <div id="team-chart">
          {data?.teams.length ? (chartType === "bubbles" ? <BubbleChart teams={topTeams} /> : <BarChart teams={topTeams} />) : (
            <div className="empty-state" role="status">
              {loading && !data && <span className="loading-orbit" />}
              <p>{data ? "No initiatives yet." : loading ? "Loading team savings…" : "Waiting for data."}</p>
            </div>
          )}
          </div>
        </section>

        <section className="ranking" aria-label="Savings by team">
          <p className="total-value">{data ? money(total) : "—"}</p>
          <p className="total-caption">TOTAL{data ? ` · ${data.teams.length} ${data.teams.length === 1 ? "TEAM" : "TEAMS"}` : ""}</p>
          <ul className="ranking-list">
            {topTeams.map((team, index) => (
              <li className={`ranking-row ${index === 0 ? "is-leading" : ""}`} key={team.name}>
                <span className="team-name"><span className="team-dot" style={{ background: COLORS[index] }} />{team.name}</span>
                <span className="team-share">{total > 0 ? `${(team.totalCents / total * 100).toLocaleString("en-GB", { maximumFractionDigits: 1 })}%` : "—"}</span>
                <span className="team-value">{money(team.totalCents)}</span>
              </li>
            ))}
          </ul>
          {data && data.teams.length > 6 && <p className="ranking-note">Top 6 teams shown. Total includes all teams.</p>}
        </section>

        <section className="goal-section" aria-labelledby="goal-title">
          <div className="goal-heading">
            <h1 id="goal-title">{goal.title}</h1>
            <button className="icon-button" aria-label="Edit goal" onClick={() => { setGoalError(""); goalDialog.current?.showModal(); }}><Icon name="edit" /></button>
          </div>
          <p className="goal-subtitle">{data ? `${data.teams.length} ${data.teams.length === 1 ? "team" : "teams"}` : "Teams"} · goal {money(goal.amount * 100)}</p>
          <div className="gauge" role="img" aria-label={data ? `${Math.round(percentage)} percent of goal reached: ${money(total)} of ${money(goal.amount * 100)}` : "Goal progress is loading"}>
            <svg viewBox="0 0 320 195" aria-hidden="true">
              <path d="M30 165 A130 130 0 0 1 290 165" fill="none" stroke="#E7E2D6" strokeWidth="26" strokeLinecap="round" />
              <path d="M30 165 A130 130 0 0 1 290 165" fill="none" stroke="#FF9408" strokeWidth="26" strokeLinecap="round" pathLength="100" strokeDasharray={`${progress} 100`} opacity={progress > 0 ? 1 : 0} />
            </svg>
            <div className="gauge-label">
              <strong>{data ? Math.round(percentage).toLocaleString("en-GB") : "—"}<span>%</span></strong>
              <p>{data ? money(total) : "—"} <span>of {money(goal.amount * 100)}</span></p>
            </div>
          </div>
        </section>
      </div>

      <dialog ref={goalDialog} className="goal-dialog" aria-labelledby="goal-dialog-title">
        <form onSubmit={saveGoal} key={`${goal.title}-${goal.amount}`}>
          <div className="goal-heading"><h2 id="goal-dialog-title">Edit goal</h2><button type="button" className="icon-button" aria-label="Close" onClick={() => goalDialog.current?.close()}><Icon name="close" /></button></div>
          <label htmlFor="goal-name">Goal title</label>
          <input id="goal-name" name="title" defaultValue={goal.title} required maxLength={80} />
          <label htmlFor="goal-amount">Target amount in euros</label>
          <input id="goal-amount" name="amount" type="number" min="0.01" max="1000000000" step="0.01" defaultValue={goal.amount} required />
          <p className="dialog-hint">Saved in this browser.</p>
          {goalError && <p className="notice" role="alert">{goalError}</p>}
          <button type="submit" className="save-button">Save goal</button>
        </form>
      </dialog>
    </main>
  );
}
