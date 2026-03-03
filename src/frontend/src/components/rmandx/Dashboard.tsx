import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayEntry, UserSettings } from "../../backend.d";
import { useCountUp } from "../../hooks/useCountUp";
import type { ComputedStats } from "../../utils/computeStats";

interface DashboardProps {
  entries: DayEntry[];
  stats: ComputedStats;
  settings: UserSettings;
  onTargetAcquiredShown: () => void;
  targetAcquiredShown: boolean;
}

// HUD-style tooltip
const HudTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name?: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(5,6,8,0.95)",
        border: "1px solid rgba(0,245,255,0.3)",
        borderRadius: "4px",
        padding: "8px 12px",
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: "11px",
        boxShadow: "0 0 12px rgba(0,245,255,0.15)",
      }}
    >
      <div style={{ color: "#4a5068", marginBottom: "4px" }}>{label}</div>
      {payload.map((p) => (
        <div
          key={p.name ?? String(p.value)}
          style={{ color: p.value >= 0 ? "#00f5ff" : "#ff2d55" }}
        >
          {p.name ? `${p.name}: ` : ""}
          {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
};

function StampBadge({
  label,
  value,
  color,
}: { label: string; value: number; color: "cyan" | "green" | "amber" }) {
  const displayValue = value.toFixed(2);
  return (
    <div className="flex flex-col gap-1">
      <div className={`stamp-badge ${color}`}>{label}</div>
      <div
        className="font-orbitron font-black text-2xl"
        style={{
          color:
            color === "cyan"
              ? "#00f5ff"
              : color === "green"
                ? "#00ff88"
                : "#ffb800",
          textShadow: `0 0 12px ${color === "cyan" ? "#00f5ff66" : color === "green" ? "#00ff8866" : "#ffb80066"}`,
        }}
      >
        {displayValue}
      </div>
    </div>
  );
}

function WeekStrip({ entries }: { entries: DayEntry[] }) {
  // Get current week Mon-Fri
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const days: { abbrev: string; date: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + diffToMon + i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      abbrev: ["MON", "TUE", "WED", "THU", "FRI"][i],
      date: dateStr,
    });
  }

  const entryMap = new Map(entries.map((e) => [e.date, e]));

  return (
    <div className="flex gap-2">
      {days.map(({ abbrev, date }) => {
        const entry = entryMap.get(date);
        const pnl = entry?.pnlPct ?? null;
        const color =
          pnl === null ? "#4a5068" : pnl > 0 ? "#00ff88" : "#ff2d55";
        const bg =
          pnl === null
            ? "rgba(26,32,53,0.3)"
            : pnl > 0
              ? `rgba(0,255,136,${Math.min(0.12, Math.abs(pnl) * 0.04)})`
              : `rgba(255,45,85,${Math.min(0.12, Math.abs(pnl) * 0.04)})`;

        return (
          <div
            key={date}
            className="flex-1 rounded p-2 text-center"
            style={{
              background: bg,
              border: `1px solid ${pnl !== null ? `${color}33` : "#1a2035"}`,
              boxShadow: pnl !== null ? `0 0 6px ${color}22` : "none",
            }}
          >
            <div className="text-xs font-mono" style={{ color: "#4a5068" }}>
              {abbrev}
            </div>
            <div
              className="font-orbitron font-bold text-sm mt-1"
              style={{ color }}
            >
              {pnl !== null ? `${pnl > 0 ? "+" : ""}${pnl.toFixed(2)}%` : "--"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard({
  entries,
  stats,
  settings,
  onTargetAcquiredShown,
  targetAcquiredShown,
}: DashboardProps) {
  const [showTargetAcquired, setShowTargetAcquired] = useState(false);

  useEffect(() => {
    if (
      !targetAcquiredShown &&
      settings.weeklyGoal > 0 &&
      stats.weeklyPnl >= settings.weeklyGoal
    ) {
      setShowTargetAcquired(true);
      onTargetAcquiredShown();
      setTimeout(() => setShowTargetAcquired(false), 2500);
    }
  }, [
    stats.weeklyPnl,
    settings.weeklyGoal,
    targetAcquiredShown,
    onTargetAcquiredShown,
  ]);

  const progressPct =
    settings.weeklyGoal > 0
      ? Math.min(100, (stats.weeklyPnl / settings.weeklyGoal) * 100)
      : 0;

  // Monthly heatmap color scale
  const maxAbsPnl = useMemo(
    () => Math.max(...stats.monthlyReturns.map((m) => Math.abs(m.pnl)), 1),
    [stats.monthlyReturns],
  );

  // Session ranking
  const sessions = [
    { label: "London", emoji: "🇬🇧", value: stats.londonAvg },
    { label: "New York", emoji: "🇺🇸", value: stats.nyAvg },
    { label: "Asia", emoji: "🇯🇵", value: stats.asiaAvg },
  ].sort((a, b) => b.value - a.value);

  // Psych chart data (last 30 entries)
  const psychData = useMemo(() => {
    const sorted = [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
    return sorted.map((e) => ({
      date: e.date.slice(5),
      psych: Number(e.psych),
      pnl: e.pnlPct,
    }));
  }, [entries]);

  const totalPnlAnimated = useCountUp(stats.totalPnlPct, 1500, 2);
  const winRateAnimated = useCountUp(stats.winRate, 1500, 1);
  const profitFactorAnimated = useCountUp(stats.profitFactor, 1500, 2);
  const expectancyAnimated = useCountUp(stats.expectancy, 1500, 3);
  const weeklyAnimated = useCountUp(stats.weeklyPnl, 1000, 2);

  return (
    <div className="p-6 space-y-6 max-w-[1280px] mx-auto relative">
      {/* Target Acquired Overlay */}
      {showTargetAcquired && (
        <div className="target-acquired-overlay">
          <div
            className="font-orbitron font-black"
            style={{
              fontSize: "clamp(24px, 5vw, 72px)",
              color: "#00f5ff",
              textShadow: "0 0 40px #00f5ff, 0 0 80px rgba(0,245,255,0.4)",
              letterSpacing: "0.2em",
              textAlign: "center",
            }}
          >
            🎯 TARGET ACQUIRED
          </div>
          <div
            className="font-mono text-lg mt-4"
            style={{ color: "rgba(0,245,255,0.7)", letterSpacing: "0.3em" }}
          >
            WEEKLY GOAL REACHED
          </div>
        </div>
      )}

      {/* Weekly Command Center */}
      <section
        data-ocid="dashboard.weekly_command.section"
        className="terminal-card p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div
              className="text-xs font-mono tracking-widest mb-2"
              style={{ color: "#4a5068" }}
            >
              WEEKLY COMMAND CENTER
            </div>
            <div
              className="font-orbitron font-black"
              style={{
                fontSize: "52px",
                lineHeight: 1,
                color: stats.weeklyPnl >= 0 ? "#00f5ff" : "#ff2d55",
                textShadow:
                  stats.weeklyPnl >= 0
                    ? "0 0 24px rgba(0,245,255,0.5)"
                    : "0 0 24px rgba(255,45,85,0.5)",
              }}
            >
              {stats.weeklyPnl >= 0 ? "+" : ""}
              {weeklyAnimated}%
            </div>
            <div
              className="text-xs font-mono mt-1"
              style={{ color: "#4a5068" }}
            >
              WEEK P&L vs GOAL: {settings.weeklyGoal}%
            </div>
          </div>
          {stats.weeklyPnl >= settings.weeklyGoal &&
            settings.weeklyGoal > 0 && (
              <div
                className="font-orbitron text-sm font-bold px-3 py-1.5 rounded"
                style={{
                  border: "1px solid #00f5ff",
                  color: "#00f5ff",
                  background: "rgba(0,245,255,0.08)",
                  animation: "glowPulse 2s ease-in-out infinite",
                  letterSpacing: "0.12em",
                }}
              >
                🎯 TARGET ACQUIRED
              </div>
            )}
        </div>

        {/* Fuel gauge progress */}
        <div className="mb-5">
          <div
            className="flex justify-between text-xs font-mono mb-1.5"
            style={{ color: "#4a5068" }}
          >
            <span>PROGRESS TO WEEKLY GOAL</span>
            <span style={{ color: progressPct >= 100 ? "#00f5ff" : "#e8ecf4" }}>
              {Math.round(progressPct)}%
            </span>
          </div>
          <div
            className="relative h-4 rounded"
            style={{
              background: "rgba(26,32,53,0.8)",
              border: "1px solid #1a2035",
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded transition-all duration-1000"
              style={{
                width: `${Math.max(0, progressPct)}%`,
                background:
                  progressPct >= 100
                    ? "linear-gradient(90deg, #00f5ff, #00ff88)"
                    : "linear-gradient(90deg, #00f5ff, rgba(0,245,255,0.7))",
                boxShadow:
                  progressPct >= 100
                    ? "0 0 12px #00f5ff, 0 0 24px rgba(0,245,255,0.4)"
                    : "0 0 8px rgba(0,245,255,0.4)",
              }}
            />
            {/* Tick marks */}
            {[25, 50, 75].map((t) => (
              <div
                key={t}
                className="absolute top-0 bottom-0 w-px"
                style={{ left: `${t}%`, background: "rgba(74,80,104,0.4)" }}
              />
            ))}
          </div>
        </div>

        <WeekStrip entries={entries} />
      </section>

      {/* Core KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          data-ocid="dashboard.kpi.card.1"
          className="terminal-card diagonal-texture p-5"
        >
          <div
            className="text-xs font-mono tracking-widest mb-2"
            style={{ color: "#4a5068" }}
          >
            TOTAL P&L
          </div>
          <div
            className="font-orbitron font-black text-3xl"
            style={{
              color: stats.totalPnlPct >= 0 ? "#00f5ff" : "#ff2d55",
              textShadow: `0 0 16px ${stats.totalPnlPct >= 0 ? "#00f5ff66" : "#ff2d5566"}`,
            }}
          >
            {stats.totalPnlPct >= 0 ? "+" : ""}
            {totalPnlAnimated}%
          </div>
        </div>
        <div
          data-ocid="dashboard.kpi.card.2"
          className="terminal-card diagonal-texture p-5"
        >
          <div
            className="text-xs font-mono tracking-widest mb-2"
            style={{ color: "#4a5068" }}
          >
            WIN RATE
          </div>
          <div
            className="font-orbitron font-black text-3xl"
            style={{
              color: stats.winRate >= 50 ? "#00ff88" : "#ffb800",
              textShadow: `0 0 16px ${stats.winRate >= 50 ? "#00ff8866" : "#ffb80066"}`,
            }}
          >
            {winRateAnimated}%
          </div>
        </div>
        <div
          data-ocid="dashboard.kpi.card.3"
          className="terminal-card diagonal-texture p-5"
        >
          <div
            className="text-xs font-mono tracking-widest mb-2"
            style={{ color: "#4a5068" }}
          >
            PROFIT FACTOR
          </div>
          <div
            className="font-orbitron font-black text-3xl"
            style={{
              color:
                stats.profitFactor >= 1.5
                  ? "#00ff88"
                  : stats.profitFactor >= 1
                    ? "#ffb800"
                    : "#ff2d55",
              textShadow: "0 0 16px rgba(0,255,136,0.4)",
            }}
          >
            {profitFactorAnimated}x
          </div>
        </div>
        <div
          data-ocid="dashboard.kpi.card.4"
          className="terminal-card diagonal-texture p-5"
        >
          <div
            className="text-xs font-mono tracking-widest mb-2"
            style={{ color: "#4a5068" }}
          >
            EXPECTANCY
          </div>
          <div
            className="font-orbitron font-black text-3xl"
            style={{
              color: stats.expectancy >= 0 ? "#00f5ff" : "#ff2d55",
              textShadow: "0 0 16px rgba(0,245,255,0.4)",
            }}
          >
            {expectancyAnimated}%
          </div>
        </div>
      </div>

      {/* Risk Metrics Panel */}
      <section
        data-ocid="dashboard.risk_metrics.section"
        className="terminal-card p-6"
      >
        <div
          className="text-xs font-mono tracking-widest mb-5"
          style={{ color: "#4a5068" }}
        >
          RISK-ADJUSTED METRICS
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
          <StampBadge label="SHARPE" value={stats.sharpe} color="cyan" />
          <StampBadge label="SORTINO" value={stats.sortino} color="green" />
          <div className="flex flex-col gap-1">
            <div
              className="text-xs font-mono tracking-widest"
              style={{ color: "#4a5068" }}
            >
              CALMAR
            </div>
            <div
              className="font-orbitron font-black text-2xl"
              style={{ color: "#7b5ea7" }}
            >
              {stats.calmar.toFixed(2)}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div
              className="text-xs font-mono tracking-widest"
              style={{ color: "#4a5068" }}
            >
              MAX DD
            </div>
            <div
              className="font-orbitron font-black text-2xl"
              style={{
                color: "#ff2d55",
                textShadow: "0 0 12px rgba(255,45,85,0.4)",
              }}
            >
              -{stats.maxDD.toFixed(2)}%
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div
              className="text-xs font-mono tracking-widest"
              style={{ color: "#4a5068" }}
            >
              CURR DD
            </div>
            <div
              className="font-orbitron font-black text-2xl"
              style={{
                color:
                  stats.currentDD > 5
                    ? "#ff2d55"
                    : stats.currentDD > 2
                      ? "#ffb800"
                      : "#00ff88",
              }}
            >
              -{stats.currentDD.toFixed(2)}%
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div
              className="text-xs font-mono tracking-widest"
              style={{ color: "#4a5068" }}
            >
              VaR 95%
            </div>
            <div
              className="font-orbitron font-black text-2xl"
              style={{ color: "#ffb800" }}
            >
              {stats.var95.toFixed(2)}%
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div
              className="text-xs font-mono tracking-widest"
              style={{ color: "#4a5068" }}
            >
              VaR 99%
            </div>
            <div
              className="font-orbitron font-black text-2xl"
              style={{ color: "#ff2d55" }}
            >
              {stats.var99.toFixed(2)}%
            </div>
          </div>
        </div>
      </section>

      {/* Equity Curve */}
      <section
        data-ocid="dashboard.equity_chart.section"
        className="terminal-card p-6"
      >
        <div
          className="text-xs font-mono tracking-widest mb-4"
          style={{ color: "#4a5068" }}
        >
          EQUITY CURVE — CUMULATIVE PERFORMANCE
        </div>
        <div style={{ filter: "drop-shadow(0 0 6px rgba(0,245,255,0.3))" }}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={stats.equity}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(26,32,53,0.8)"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(5)}
                tick={{
                  fill: "#4a5068",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                }}
                interval={Math.max(1, Math.floor(stats.equity.length / 8))}
              />
              <YAxis
                tick={{
                  fill: "#4a5068",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                }}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<HudTooltip />} />
              <ReferenceLine
                y={100}
                stroke="rgba(74,80,104,0.6)"
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#00f5ff"
                strokeWidth={2}
                fill="url(#equityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Drawdown Chart */}
      <section
        data-ocid="dashboard.drawdown_chart.section"
        className="terminal-card p-6"
      >
        <div
          className="text-xs font-mono tracking-widest mb-4"
          style={{ color: "#4a5068" }}
        >
          DRAWDOWN — RISK EXPOSURE OVER TIME
        </div>
        <div style={{ filter: "drop-shadow(0 0 6px rgba(255,45,85,0.3))" }}>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart
              data={stats.drawdownSeries}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient
                  id="drawdownGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#ff2d55" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff2d55" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(26,32,53,0.8)"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(5)}
                tick={{
                  fill: "#4a5068",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                }}
                interval={Math.max(
                  1,
                  Math.floor(stats.drawdownSeries.length / 8),
                )}
              />
              <YAxis
                tick={{
                  fill: "#4a5068",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
              <Tooltip content={<HudTooltip />} />
              <ReferenceLine
                y={-Math.abs(settings.ddLimit)}
                stroke="#ff2d55"
                strokeDasharray="4 4"
                opacity={0.7}
              />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#ff2d55"
                strokeWidth={2}
                fill="url(#drawdownGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Monthly Returns Heatmap */}
      <section
        data-ocid="dashboard.monthly_heatmap.section"
        className="terminal-card p-6"
      >
        <div
          className="text-xs font-mono tracking-widest mb-5"
          style={{ color: "#4a5068" }}
        >
          MONTHLY RETURNS HEATMAP
        </div>
        {stats.monthlyReturns.length === 0 ? (
          <div
            className="text-center py-8 font-mono text-sm"
            style={{ color: "#4a5068" }}
          >
            No monthly data available
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stats.monthlyReturns.map((month) => {
              const intensity = Math.min(1, Math.abs(month.pnl) / maxAbsPnl);
              const isProfit = month.pnl >= 0;
              const color = isProfit ? "#00ff88" : "#ff2d55";
              const bgAlpha = 0.05 + intensity * 0.2;
              return (
                <div
                  key={month.key}
                  className="rounded-md px-3 py-2 min-w-[80px] text-center"
                  style={{
                    background: `rgba(${isProfit ? "0,255,136" : "255,45,85"}, ${bgAlpha})`,
                    border: `1px solid rgba(${isProfit ? "0,255,136" : "255,45,85"}, ${0.2 + intensity * 0.4})`,
                    boxShadow: `0 0 ${4 + intensity * 12}px rgba(${isProfit ? "0,255,136" : "255,45,85"}, ${0.1 + intensity * 0.2})`,
                  }}
                >
                  <div
                    className="text-xs font-mono"
                    style={{ color: "#4a5068" }}
                  >
                    {month.label}
                  </div>
                  <div
                    className="font-orbitron font-bold text-sm mt-0.5"
                    style={{ color }}
                  >
                    {month.pnl >= 0 ? "+" : ""}
                    {month.pnl.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Instrument P&L */}
      <section
        data-ocid="dashboard.instrument_chart.section"
        className="terminal-card p-6"
      >
        <div
          className="text-xs font-mono tracking-widest mb-4"
          style={{ color: "#4a5068" }}
        >
          INSTRUMENT P&L BREAKDOWN
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={stats.instrumentPnl}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(26,32,53,0.8)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{
                fill: "#4a5068",
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <YAxis
              type="category"
              dataKey="pair"
              tick={{
                fill: "#e8ecf4",
                fontSize: 11,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <Tooltip content={<HudTooltip />} />
            <Bar dataKey="pnl" radius={[0, 3, 3, 0]}>
              {stats.instrumentPnl.map((item) => (
                <Cell
                  key={item.pair}
                  fill={item.pnl >= 0 ? "#00ff88" : "#ff2d55"}
                  style={{
                    filter: `drop-shadow(0 0 4px ${item.pnl >= 0 ? "#00ff8888" : "#ff2d5588"})`,
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Sessions + Psychology + Costs + Streaks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Performance */}
        <div className="terminal-card p-6">
          <div
            className="text-xs font-mono tracking-widest mb-4"
            style={{ color: "#4a5068" }}
          >
            SESSION PERFORMANCE
          </div>
          <div className="space-y-3">
            {sessions.map((session, idx) => {
              const isFirst = idx === 0;
              const color = session.value >= 0 ? "#00ff88" : "#ff2d55";
              return (
                <div
                  key={session.label}
                  data-ocid={`dashboard.sessions.card.${idx + 1}`}
                  className="flex items-center justify-between p-3 rounded"
                  style={{
                    background: isFirst
                      ? "rgba(255,184,0,0.05)"
                      : "rgba(11,13,18,0.5)",
                    border: `1px solid ${isFirst ? "rgba(255,184,0,0.3)" : "#1a2035"}`,
                    boxShadow: isFirst
                      ? "0 0 12px rgba(255,184,0,0.15)"
                      : "none",
                    animation: isFirst
                      ? "goldGlowPulse 2s ease-in-out infinite"
                      : "none",
                  }}
                >
                  <div className="flex items-center gap-2">
                    {isFirst && (
                      <span
                        className="text-xs font-orbitron font-bold"
                        style={{ color: "#ffb800" }}
                      >
                        🥇
                      </span>
                    )}
                    <span className="font-mono text-sm">
                      {session.emoji} {session.label}
                    </span>
                  </div>
                  <div
                    className="font-orbitron font-bold text-lg"
                    style={{ color }}
                  >
                    {session.value >= 0 ? "+" : ""}
                    {session.value.toFixed(3)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Streaks */}
        <div
          data-ocid="dashboard.streaks.section"
          className="terminal-card p-6"
        >
          <div
            className="text-xs font-mono tracking-widest mb-4"
            style={{ color: "#4a5068" }}
          >
            STREAK COUNTER
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div
              className="rounded p-3"
              style={{
                background: "rgba(0,255,136,0.05)",
                border: "1px solid rgba(0,255,136,0.2)",
              }}
            >
              <div className="text-xs font-mono" style={{ color: "#4a5068" }}>
                CURRENT WIN STREAK
              </div>
              <div
                className="font-orbitron font-black text-4xl mt-1"
                style={{
                  color: "#00ff88",
                  textShadow: "0 0 16px rgba(0,255,136,0.5)",
                }}
              >
                {stats.currentWin}
              </div>
            </div>
            <div
              className="rounded p-3"
              style={{
                background: "rgba(255,45,85,0.05)",
                border: "1px solid rgba(255,45,85,0.2)",
              }}
            >
              <div className="text-xs font-mono" style={{ color: "#4a5068" }}>
                CURRENT LOSS STREAK
              </div>
              <div
                className="font-orbitron font-black text-4xl mt-1"
                style={{
                  color: "#ff2d55",
                  textShadow: "0 0 16px rgba(255,45,85,0.5)",
                }}
              >
                {stats.currentLoss}
              </div>
            </div>
            <div
              className="rounded p-3"
              style={{
                background: "rgba(0,245,255,0.03)",
                border: "1px solid #1a2035",
              }}
            >
              <div className="text-xs font-mono" style={{ color: "#4a5068" }}>
                MAX WIN STREAK
              </div>
              <div
                className="font-orbitron font-black text-2xl mt-1"
                style={{ color: "#00ff88" }}
              >
                {stats.maxWin}
              </div>
            </div>
            <div
              className="rounded p-3"
              style={{
                background: "rgba(0,245,255,0.03)",
                border: "1px solid #1a2035",
              }}
            >
              <div className="text-xs font-mono" style={{ color: "#4a5068" }}>
                MAX LOSS STREAK
              </div>
              <div
                className="font-orbitron font-black text-2xl mt-1"
                style={{ color: "#ff2d55" }}
              >
                {stats.maxLoss}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Psychology Tracker */}
      <section
        data-ocid="dashboard.psych.section"
        className="terminal-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div
            className="text-xs font-mono tracking-widest"
            style={{ color: "#4a5068" }}
          >
            PSYCHOLOGY TRACKER
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: "#4a5068" }}>
              AVG MINDSET
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="w-3 h-3 rounded-full"
                  style={{
                    background:
                      n <= Math.round(stats.avgPsych)
                        ? "#7b5ea7"
                        : "rgba(74,80,104,0.3)",
                    boxShadow:
                      n <= Math.round(stats.avgPsych)
                        ? "0 0 6px rgba(123,94,167,0.6)"
                        : "none",
                  }}
                />
              ))}
            </div>
            <span
              className="font-orbitron font-bold text-lg"
              style={{ color: "#7b5ea7" }}
            >
              {stats.avgPsych.toFixed(1)}
            </span>
          </div>
        </div>
        {psychData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart
              data={psychData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(26,32,53,0.8)"
              />
              <XAxis
                dataKey="date"
                tick={{
                  fill: "#4a5068",
                  fontSize: 9,
                  fontFamily: "JetBrains Mono, monospace",
                }}
                interval={Math.max(1, Math.floor(psychData.length / 6))}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 5]}
                tick={{
                  fill: "#7b5ea7",
                  fontSize: 9,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{
                  fill: "#00f5ff",
                  fontSize: 9,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
              <Tooltip content={<HudTooltip />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="psych"
                stroke="#7b5ea7"
                strokeWidth={2}
                dot={false}
                name="Mindset"
                style={{ filter: "drop-shadow(0 0 4px #7b5ea7)" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="pnl"
                stroke="#00f5ff"
                strokeWidth={2}
                dot={false}
                name="P&L%"
                style={{ filter: "drop-shadow(0 0 4px #00f5ff)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="text-center py-6 font-mono text-sm"
            style={{ color: "#4a5068" }}
          >
            No data
          </div>
        )}
      </section>

      {/* Cost Drag */}
      <section
        data-ocid="dashboard.cost_drag.section"
        className="terminal-card p-5"
      >
        <div
          className="text-xs font-mono tracking-widest mb-4"
          style={{ color: "#4a5068" }}
        >
          COST DRAG ANALYSIS
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-mono" style={{ color: "#4a5068" }}>
              TOTAL COMMISSIONS
            </div>
            <div
              className="font-orbitron font-bold text-xl mt-1"
              style={{ color: "#ffb800" }}
            >
              -{stats.totalCommissions.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-xs font-mono" style={{ color: "#4a5068" }}>
              TOTAL SLIPPAGE
            </div>
            <div
              className="font-orbitron font-bold text-xl mt-1"
              style={{ color: "#ffb800" }}
            >
              -{stats.totalSlippage.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-xs font-mono" style={{ color: "#4a5068" }}>
              NET P&L (AFTER COSTS)
            </div>
            <div
              className="font-orbitron font-bold text-xl mt-1"
              style={{
                color: stats.netPnlAfterCosts >= 0 ? "#00ff88" : "#ff2d55",
              }}
            >
              {stats.netPnlAfterCosts >= 0 ? "+" : ""}
              {stats.netPnlAfterCosts.toFixed(2)}%
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
