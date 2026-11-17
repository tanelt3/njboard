"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { layoutTeamBubbles } from "@/lib/bubble-layout";
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

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
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
          {data?.teams.length ? <BubbleChart teams={topTeams} /> : (
            <div className="empty-state" role="status">
              {loading && !data && <span className="loading-orbit" />}
              <p>{data ? "No initiatives yet." : loading ? "Loading team savings…" : "Waiting for data."}</p>
            </div>
          )}
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
