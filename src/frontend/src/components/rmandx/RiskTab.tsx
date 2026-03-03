import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { DayEntry, UserSettings } from "../../backend.d";
import { useSaveSettings } from "../../hooks/useQueries";
import type { ComputedStats } from "../../utils/computeStats";

interface RiskTabProps {
  entries: DayEntry[];
  stats: ComputedStats;
  settings: UserSettings;
}

// Semicircle SVG gauge
function SpeedometerGauge({
  value,
  max,
  label,
  color,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
}) {
  const pct = Math.min(1, Math.max(0, value / max));
  const angle = -135 + pct * 270; // -135 to 135 degrees
  const cx = 60;
  const cy = 60;
  const r = 45;

  // Arc path
  const startAngle = -135 * (Math.PI / 180);
  const endAngle = angle * (Math.PI / 180);
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = pct > 0.5 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg
        width="120"
        height="90"
        viewBox="0 0 120 90"
        aria-label={`${label} gauge`}
      >
        <title>{label} Gauge</title>
        {/* Background arc */}
        <path
          d={`M ${cx + r * Math.cos(startAngle)} ${cy + r * Math.sin(startAngle)} A ${r} ${r} 0 1 1 ${cx + r * Math.cos((135 * Math.PI) / 180)} ${cy + r * Math.sin((135 * Math.PI) / 180)}`}
          fill="none"
          stroke="rgba(26,32,53,0.8)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {pct > 0 && (
          <path
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        )}
        {/* Center text */}
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fill={color}
          fontSize="13"
          fontFamily="Orbitron, monospace"
          fontWeight="900"
        >
          {value.toFixed(1)}%
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          fill="#4a5068"
          fontSize="7"
          fontFamily="JetBrains Mono, monospace"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

const HudTooltip = ({
  active,
  payload,
  label,
}: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
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
        <div key={`dd-${p.value}`} style={{ color: "#ff2d55" }}>
          {p.value.toFixed(2)}%
        </div>
      ))}
    </div>
  );
};

export function RiskTab({ entries, stats, settings }: RiskTabProps) {
  const [ddLimitInput, setDdLimitInput] = useState(String(settings.ddLimit));
  const saveMutation = useSaveSettings();

  const ddViolations = useMemo(
    () =>
      entries
        .filter((e) => settings.ddLimit < 0 && e.pnlPct <= settings.ddLimit)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, settings.ddLimit],
  );

  const avgRisk = useMemo(() => {
    const valid = entries.filter((e) => e.riskPct > 0);
    return valid.length > 0
      ? valid.reduce((s, e) => s + e.riskPct, 0) / valid.length
      : 0;
  }, [entries]);

  const avgRR = useMemo(() => {
    const valid = entries.filter((e) => e.rr > 0);
    return valid.length > 0
      ? valid.reduce((s, e) => s + e.rr, 0) / valid.length
      : 0;
  }, [entries]);

  const handleSaveDdLimit = async () => {
    const val = Number.parseFloat(ddLimitInput);
    if (Number.isNaN(val)) {
      toast.error("Invalid DD limit value");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        ...settings,
        ddLimit: val,
      });
      toast.success("DD limit updated");
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <div
      className="p-6 max-w-[1280px] mx-auto space-y-6"
      data-ocid="risk.section"
    >
      <h2
        className="font-orbitron font-bold text-xl"
        style={{ color: "#00f5ff" }}
      >
        RISK ANALYSIS
      </h2>

      {/* Gauges row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="terminal-card p-5 text-center">
          <SpeedometerGauge
            value={stats.maxDD}
            max={20}
            label="MAX DD"
            color="#ff2d55"
          />
          <div className="text-xs font-mono mt-2" style={{ color: "#4a5068" }}>
            MAX DRAWDOWN
          </div>
        </div>
        <div className="terminal-card p-5 text-center">
          <SpeedometerGauge
            value={stats.currentDD}
            max={20}
            label="CURR DD"
            color={stats.currentDD > 5 ? "#ff2d55" : "#ffb800"}
          />
          <div className="text-xs font-mono mt-2" style={{ color: "#4a5068" }}>
            CURRENT DRAWDOWN
          </div>
        </div>
        <div className="terminal-card p-5 text-center diagonal-texture">
          <div
            className="font-orbitron font-black text-3xl mt-2"
            style={{
              color: "#ffb800",
              textShadow: "0 0 12px rgba(255,184,0,0.4)",
            }}
          >
            {stats.var95.toFixed(2)}%
          </div>
          <div className="text-xs font-mono mt-2" style={{ color: "#4a5068" }}>
            VaR 95%
          </div>
          <div
            className="text-xs font-mono mt-1"
            style={{ color: "rgba(74,80,104,0.6)", fontSize: "9px" }}
          >
            WORST 5% OF DAYS AVG
          </div>
        </div>
        <div className="terminal-card p-5 text-center diagonal-texture">
          <div
            className="font-orbitron font-black text-3xl mt-2"
            style={{
              color: "#ff2d55",
              textShadow: "0 0 12px rgba(255,45,85,0.4)",
            }}
          >
            {stats.var99.toFixed(2)}%
          </div>
          <div className="text-xs font-mono mt-2" style={{ color: "#4a5068" }}>
            VaR 99%
          </div>
          <div
            className="text-xs font-mono mt-1"
            style={{ color: "rgba(74,80,104,0.6)", fontSize: "9px" }}
          >
            WORST 1% OF DAYS AVG
          </div>
        </div>
      </div>

      {/* DD Limit + Risk stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="terminal-card p-5">
          <div
            className="text-xs font-mono tracking-widest mb-3"
            style={{ color: "#4a5068" }}
          >
            DAILY DD LIMIT
          </div>
          <div className="flex gap-2">
            <input
              data-ocid="risk.dd_limit.input"
              type="number"
              step="0.1"
              value={ddLimitInput}
              onChange={(e) => setDdLimitInput(e.target.value)}
              className="terminal-input flex-1"
              placeholder="-2.0"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,45,85,0.3)",
                color: "#ff2d55",
              }}
            />
            <button
              type="button"
              data-ocid="risk.dd_limit.save.button"
              onClick={handleSaveDdLimit}
              disabled={saveMutation.isPending}
              className="px-4 py-1.5 rounded text-xs font-orbitron font-bold tracking-wider transition-all"
              style={{
                border: "1px solid rgba(0,245,255,0.3)",
                color: "#00f5ff",
                background: "rgba(0,245,255,0.08)",
              }}
            >
              {saveMutation.isPending ? "..." : "SAVE"}
            </button>
          </div>
          <div
            className="text-xs font-mono mt-2"
            style={{ color: "rgba(74,80,104,0.6)" }}
          >
            Current: {settings.ddLimit}%
          </div>
        </div>

        <div className="terminal-card p-5 diagonal-texture">
          <div
            className="text-xs font-mono tracking-widest mb-2"
            style={{ color: "#4a5068" }}
          >
            AVG RISK PER TRADE
          </div>
          <div
            className="font-orbitron font-black text-2xl"
            style={{ color: "#ffb800" }}
          >
            {avgRisk.toFixed(2)}%
          </div>
        </div>

        <div className="terminal-card p-5 diagonal-texture">
          <div
            className="text-xs font-mono tracking-widest mb-2"
            style={{ color: "#4a5068" }}
          >
            AVG R:R RATIO
          </div>
          <div
            className="font-orbitron font-black text-2xl"
            style={{ color: "#00ff88" }}
          >
            {avgRR.toFixed(2)}:1
          </div>
        </div>
      </div>

      {/* DD Violations */}
      {ddViolations.length > 0 && (
        <div className="terminal-card p-5">
          <div
            className="text-xs font-mono tracking-widest mb-3"
            style={{ color: "#ff2d55" }}
          >
            ⚠ DD LIMIT VIOLATIONS ({ddViolations.length} DAYS)
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {ddViolations.map((e) => (
              <div
                key={e.date}
                className="flex justify-between items-center px-3 py-2 rounded"
                style={{
                  background: "rgba(255,45,85,0.06)",
                  border: "1px solid rgba(255,45,85,0.2)",
                }}
              >
                <span
                  className="font-mono text-sm"
                  style={{ color: "#e8ecf4" }}
                >
                  {e.date}
                </span>
                <span
                  className="font-orbitron font-bold text-sm"
                  style={{ color: "#ff2d55" }}
                >
                  {e.pnlPct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawdown curve */}
      <div className="terminal-card p-6">
        <div
          className="text-xs font-mono tracking-widest mb-4"
          style={{ color: "#4a5068" }}
        >
          DRAWDOWN CURVE
        </div>
        <div style={{ filter: "drop-shadow(0 0 6px rgba(255,45,85,0.3))" }}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={stats.drawdownSeries}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="ddGradient2" x1="0" y1="0" x2="0" y2="1">
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
                y={settings.ddLimit}
                stroke="#ff2d55"
                strokeDasharray="4 4"
                label={{
                  value: `DD LIMIT ${settings.ddLimit}%`,
                  fill: "#ff2d55",
                  fontSize: 10,
                }}
              />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#ff2d55"
                strokeWidth={2}
                fill="url(#ddGradient2)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
