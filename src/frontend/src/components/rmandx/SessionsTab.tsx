import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayEntry } from "../../backend.d";
import type { ComputedStats } from "../../utils/computeStats";

interface SessionsTabProps {
  entries: DayEntry[];
  stats: ComputedStats;
}

const HudTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; stroke?: string }[];
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
      }}
    >
      <div style={{ color: "#4a5068", marginBottom: "4px" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name ?? "val"} style={{ color: p.stroke ?? "#e8ecf4" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(3) : p.value}
          %
        </div>
      ))}
    </div>
  );
};

export function SessionsTab({ entries, stats }: SessionsTabProps) {
  // Last 60 entries sorted
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-60),
    [entries],
  );

  const sessionChartData = useMemo(
    () =>
      sortedEntries.map((e) => ({
        date: e.date.slice(5),
        London: e.londonPct,
        "New York": e.nyPct,
        Asia: e.asiaPct,
      })),
    [sortedEntries],
  );

  // Day-of-week x session heatmap
  const dowSessionMap = useMemo(() => {
    type SessionCell = { sum: number; count: number };
    type SessionRow = {
      London: SessionCell;
      NY: SessionCell;
      Asia: SessionCell;
    };
    const map: Record<string, SessionRow> = {};
    const dows = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    for (const d of dows) {
      map[d] = {
        London: { sum: 0, count: 0 },
        NY: { sum: 0, count: 0 },
        Asia: { sum: 0, count: 0 },
      };
    }

    for (const e of entries) {
      const d = new Date(`${e.date}T00:00:00Z`);
      const dowIdx = d.getUTCDay(); // 1=Mon
      if (dowIdx < 1 || dowIdx > 5) continue;
      const dowStr = dows[dowIdx - 1];
      if (dowStr) {
        map[dowStr].London.sum += e.londonPct;
        map[dowStr].London.count++;
        map[dowStr].NY.sum += e.nyPct;
        map[dowStr].NY.count++;
        map[dowStr].Asia.sum += e.asiaPct;
        map[dowStr].Asia.count++;
      }
    }

    return map;
  }, [entries]);

  const sessions = [
    { label: "London", emoji: "🇬🇧", value: stats.londonAvg, color: "#00f5ff" },
    { label: "New York", emoji: "🇺🇸", value: stats.nyAvg, color: "#00ff88" },
    { label: "Asia", emoji: "🇯🇵", value: stats.asiaAvg, color: "#7b5ea7" },
  ].sort((a, b) => b.value - a.value);

  const bestSession = sessions[0];

  // Max abs for heatmap intensity
  const allAvgs = ["Mon", "Tue", "Wed", "Thu", "Fri"].flatMap((d) =>
    (["London", "NY", "Asia"] as const).map((s) => {
      const cell = dowSessionMap[d]?.[s];
      return cell && cell.count > 0 ? Math.abs(cell.sum / cell.count) : 0;
    }),
  );
  const maxHeatmap = Math.max(...allAvgs, 0.1);

  return (
    <div
      className="p-6 max-w-[1280px] mx-auto space-y-6"
      data-ocid="sessions.section"
    >
      <h2
        className="font-orbitron font-bold text-xl"
        style={{ color: "#00f5ff" }}
      >
        SESSION ANALYSIS
      </h2>

      {/* Session Cards */}
      <div className="grid grid-cols-3 gap-4">
        {sessions.map((session, idx) => {
          const isFirst = idx === 0;
          return (
            <div
              key={session.label}
              className="terminal-card p-6 text-center"
              style={{
                border: isFirst
                  ? "1px solid rgba(255,184,0,0.4)"
                  : "1px solid #1a2035",
                boxShadow: isFirst
                  ? "0 0 20px rgba(255,184,0,0.15)"
                  : undefined,
                animation: isFirst
                  ? "goldGlowPulse 2s ease-in-out infinite"
                  : undefined,
              }}
            >
              {isFirst && (
                <div
                  className="font-orbitron text-xs font-bold mb-2"
                  style={{ color: "#ffb800" }}
                >
                  🥇 BEST SESSION
                </div>
              )}
              <div className="text-3xl mb-2">{session.emoji}</div>
              <div
                className="font-mono text-sm mb-3"
                style={{ color: "#e8ecf4" }}
              >
                {session.label}
              </div>
              <div
                className="font-orbitron font-black text-3xl"
                style={{
                  color: session.value >= 0 ? session.color : "#ff2d55",
                  textShadow: `0 0 16px ${session.value >= 0 ? session.color : "#ff2d55"}66`,
                }}
              >
                {session.value >= 0 ? "+" : ""}
                {session.value.toFixed(3)}%
              </div>
              <div
                className="text-xs font-mono mt-1"
                style={{ color: "#4a5068" }}
              >
                AVG P&L
              </div>
              <div
                className="mt-2 px-2 py-0.5 rounded text-xs font-mono"
                style={{
                  background: `rgba(${session.color === "#00f5ff" ? "0,245,255" : session.color === "#00ff88" ? "0,255,136" : "123,94,167"}, 0.1)`,
                  color: session.color,
                  border: `1px solid ${session.color}33`,
                }}
              >
                RANK #{idx + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendation */}
      <div
        className="terminal-card p-4"
        style={{ border: "1px solid rgba(0,245,255,0.15)" }}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">{bestSession.emoji}</div>
          <div>
            <div
              className="text-xs font-mono tracking-widest"
              style={{ color: "#4a5068" }}
            >
              TRADING RECOMMENDATION
            </div>
            <div
              className="font-mono text-sm mt-0.5"
              style={{ color: "#e8ecf4" }}
            >
              Your highest avg P&L is in{" "}
              <span
                style={{
                  color: "#00f5ff",
                  fontFamily: "Orbitron, monospace",
                  fontWeight: 900,
                }}
              >
                {bestSession.label}
              </span>{" "}
              session. Focus your best setups during this window for optimal
              performance.
            </div>
          </div>
        </div>
      </div>

      {/* Session Line Chart */}
      <div className="terminal-card p-6">
        <div
          className="text-xs font-mono tracking-widest mb-4"
          style={{ color: "#4a5068" }}
        >
          SESSION P&L — LAST {sortedEntries.length} TRADING DAYS
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={sessionChartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,32,53,0.8)" />
            <XAxis
              dataKey="date"
              tick={{
                fill: "#4a5068",
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
              }}
              interval={Math.max(1, Math.floor(sessionChartData.length / 8))}
            />
            <YAxis
              tick={{
                fill: "#4a5068",
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <Tooltip content={<HudTooltip />} />
            <Legend
              wrapperStyle={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "10px",
                color: "#4a5068",
              }}
            />
            <Line
              type="monotone"
              dataKey="London"
              stroke="#00f5ff"
              strokeWidth={2}
              dot={false}
              style={{ filter: "drop-shadow(0 0 4px #00f5ff)" }}
            />
            <Line
              type="monotone"
              dataKey="New York"
              stroke="#00ff88"
              strokeWidth={2}
              dot={false}
              style={{ filter: "drop-shadow(0 0 4px #00ff88)" }}
            />
            <Line
              type="monotone"
              dataKey="Asia"
              stroke="#7b5ea7"
              strokeWidth={2}
              dot={false}
              style={{ filter: "drop-shadow(0 0 4px #7b5ea7)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* DOW x Session Heatmap */}
      <div className="terminal-card p-6">
        <div
          className="text-xs font-mono tracking-widest mb-4"
          style={{ color: "#4a5068" }}
        >
          DAY-OF-WEEK × SESSION PERFORMANCE MATRIX
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr>
                <th
                  className="p-2 text-xs font-mono"
                  style={{ color: "#4a5068" }}
                >
                  DAY
                </th>
                {["London 🇬🇧", "NY 🇺🇸", "Asia 🇯🇵"].map((s) => (
                  <th
                    key={s}
                    className="p-2 text-xs font-mono"
                    style={{ color: "#4a5068" }}
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((dow) => (
                <tr key={dow}>
                  <td
                    className="p-2 text-xs font-orbitron font-bold"
                    style={{ color: "#e8ecf4" }}
                  >
                    {dow}
                  </td>
                  {(["London", "NY", "Asia"] as const).map((sesh) => {
                    const cell = dowSessionMap[dow]?.[sesh];
                    const avg =
                      cell && cell.count > 0 ? cell.sum / cell.count : null;
                    const intensity =
                      avg !== null
                        ? Math.min(1, Math.abs(avg) / maxHeatmap)
                        : 0;
                    const isPos = (avg ?? 0) >= 0;
                    const color =
                      avg === null ? "#4a5068" : isPos ? "#00ff88" : "#ff2d55";
                    const bg =
                      avg === null
                        ? "transparent"
                        : `rgba(${isPos ? "0,255,136" : "255,45,85"},${0.05 + intensity * 0.2})`;
                    return (
                      <td
                        key={sesh}
                        className="p-2 rounded"
                        style={{
                          background: bg,
                          fontFamily: "Orbitron, monospace",
                          fontSize: "12px",
                          fontWeight: 700,
                          color,
                        }}
                      >
                        {avg !== null
                          ? `${avg >= 0 ? "+" : ""}${avg.toFixed(3)}%`
                          : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
