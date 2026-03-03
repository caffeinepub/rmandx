import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserSettings } from "../../backend.d";
import { useSaveSettings } from "../../hooks/useQueries";

interface GoalsTabProps {
  settings: UserSettings;
}

const ALL_PAIRS = [
  "GBPJPY",
  "EURUSD",
  "USDJPY",
  "GBPUSD",
  "XAUUSD",
  "US30",
  "AUDUSD",
];

export function GoalsTab({ settings }: GoalsTabProps) {
  const [form, setForm] = useState({
    weeklyGoal: String(settings.weeklyGoal),
    dailyGoal: String(settings.dailyGoal),
    ddLimit: String(settings.ddLimit),
    oandaAccountId: settings.oandaAccountId,
    oandaApiKey: settings.oandaApiKey,
    oandaEnv: settings.oandaEnv,
    trackedPairs: [...settings.trackedPairs],
  });
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const saveMutation = useSaveSettings();

  useEffect(() => {
    setForm({
      weeklyGoal: String(settings.weeklyGoal),
      dailyGoal: String(settings.dailyGoal),
      ddLimit: String(settings.ddLimit),
      oandaAccountId: settings.oandaAccountId,
      oandaApiKey: settings.oandaApiKey,
      oandaEnv: settings.oandaEnv,
      trackedPairs: [...settings.trackedPairs],
    });
  }, [settings]);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const togglePair = (pair: string) => {
    setForm((prev) => ({
      ...prev,
      trackedPairs: prev.trackedPairs.includes(pair)
        ? prev.trackedPairs.filter((p) => p !== pair)
        : [...prev.trackedPairs, pair],
    }));
  };

  const handleSave = async () => {
    const n = (v: string, fallback = 0) => {
      const p = Number.parseFloat(v);
      return Number.isNaN(p) ? fallback : p;
    };
    try {
      await saveMutation.mutateAsync({
        ...settings,
        weeklyGoal: n(form.weeklyGoal),
        dailyGoal: n(form.dailyGoal),
        ddLimit: n(form.ddLimit),
        oandaAccountId: form.oandaAccountId,
        oandaApiKey: form.oandaApiKey,
        oandaEnv: form.oandaEnv,
        trackedPairs: form.trackedPairs,
      });
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handleSync = async () => {
    setSyncMsg(
      "OANDA sync is processed server-side. Please check back shortly.",
    );
    setTimeout(() => setSyncMsg(null), 5000);
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(0,245,255,0.15)",
    color: "#e8ecf4",
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "13px",
    borderRadius: "4px",
    padding: "8px 12px",
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "10px",
    letterSpacing: "0.12em",
    color: "#4a5068",
    fontFamily: '"JetBrains Mono", monospace',
    textTransform: "uppercase" as const,
    marginBottom: "6px",
    display: "block",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#00f5ff";
    e.target.style.boxShadow = "0 0 8px rgba(0,245,255,0.2)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(0,245,255,0.15)";
    e.target.style.boxShadow = "none";
  };

  const lastSyncDate =
    settings.lastSync > BigInt(0)
      ? new Date(Number(settings.lastSync) / 1_000_000).toLocaleString()
      : "Never";

  return (
    <div
      className="p-6 max-w-[800px] mx-auto space-y-6"
      data-ocid="goals.section"
    >
      <h2
        className="font-orbitron font-bold text-xl"
        style={{ color: "#00f5ff" }}
      >
        GOALS & SETTINGS
      </h2>

      {/* Goals */}
      <div className="terminal-card p-6 space-y-4">
        <div
          className="text-xs font-mono tracking-widest mb-2"
          style={{ color: "#00f5ff" }}
        >
          PERFORMANCE GOALS
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="goals-weekly-goal" style={labelStyle}>
              Weekly Goal %
            </label>
            <input
              id="goals-weekly-goal"
              data-ocid="goals.weekly_goal.input"
              type="number"
              step="0.1"
              value={form.weeklyGoal}
              onChange={(e) => updateField("weeklyGoal", e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
              placeholder="3.0"
            />
          </div>
          <div>
            <label htmlFor="goals-daily-goal" style={labelStyle}>
              Daily Goal %
            </label>
            <input
              id="goals-daily-goal"
              data-ocid="goals.daily_goal.input"
              type="number"
              step="0.1"
              value={form.dailyGoal}
              onChange={(e) => updateField("dailyGoal", e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
              placeholder="1.0"
            />
          </div>
          <div>
            <label htmlFor="goals-dd-limit" style={labelStyle}>
              Daily DD Limit %
            </label>
            <input
              id="goals-dd-limit"
              data-ocid="goals.dd_limit.input"
              type="number"
              step="0.1"
              value={form.ddLimit}
              onChange={(e) => updateField("ddLimit", e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                ...inputStyle,
                borderColor: "rgba(255,45,85,0.3)",
                color: "#ff2d55",
              }}
              placeholder="-2.0"
            />
          </div>
        </div>
      </div>

      {/* Tracked Pairs */}
      <div className="terminal-card p-6">
        <div
          className="text-xs font-mono tracking-widest mb-4"
          style={{ color: "#00f5ff" }}
        >
          TRACKED INSTRUMENTS
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_PAIRS.map((pair) => {
            const active = form.trackedPairs.includes(pair);
            return (
              <button
                type="button"
                key={pair}
                onClick={() => togglePair(pair)}
                className="px-4 py-2 rounded font-orbitron font-bold text-sm tracking-wider transition-all"
                style={{
                  border: `1px solid ${active ? "#00f5ff" : "#1a2035"}`,
                  color: active ? "#00f5ff" : "#4a5068",
                  background: active ? "rgba(0,245,255,0.08)" : "transparent",
                  boxShadow: active ? "0 0 8px rgba(0,245,255,0.2)" : "none",
                  cursor: "pointer",
                }}
              >
                {pair}
              </button>
            );
          })}
        </div>
      </div>

      {/* OANDA Config */}
      <div className="terminal-card p-6 space-y-4">
        <div
          className="text-xs font-mono tracking-widest mb-2"
          style={{ color: "#00f5ff" }}
        >
          OANDA API CONFIGURATION
        </div>
        <div>
          <label htmlFor="oanda-account-id" style={labelStyle}>
            OANDA Account ID
          </label>
          <input
            id="oanda-account-id"
            data-ocid="goals.oanda_account.input"
            type="text"
            value={form.oandaAccountId}
            onChange={(e) => updateField("oandaAccountId", e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={inputStyle}
            placeholder="001-001-12345678-001"
          />
        </div>
        <div>
          <label htmlFor="oanda-api-key" style={labelStyle}>
            OANDA API Key
          </label>
          <input
            id="oanda-api-key"
            data-ocid="goals.oanda_key.input"
            type="password"
            value={form.oandaApiKey}
            onChange={(e) => updateField("oandaApiKey", e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={inputStyle}
            placeholder="••••••••••••••••••••••••••••••••"
          />
        </div>
        <div>
          <div style={labelStyle}>Environment</div>
          <div className="flex gap-3">
            {["live", "practice"].map((env) => (
              <button
                type="button"
                key={env}
                data-ocid="goals.oanda_env.toggle"
                onClick={() => updateField("oandaEnv", env)}
                className="flex-1 py-2 rounded font-orbitron font-bold text-xs tracking-widest transition-all"
                style={{
                  border: `1px solid ${form.oandaEnv === env ? (env === "live" ? "#00ff88" : "#00f5ff") : "#1a2035"}`,
                  color:
                    form.oandaEnv === env
                      ? env === "live"
                        ? "#00ff88"
                        : "#00f5ff"
                      : "#4a5068",
                  background:
                    form.oandaEnv === env
                      ? `rgba(${env === "live" ? "0,255,136" : "0,245,255"}, 0.08)`
                      : "transparent",
                  cursor: "pointer",
                }}
              >
                {env === "live" ? "🔴 LIVE" : "🔵 PRACTICE"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        data-ocid="goals.save.button"
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="w-full py-3 rounded font-orbitron font-bold text-sm tracking-widest transition-all"
        style={{
          background: "rgba(0,245,255,0.1)",
          border: "1px solid #00f5ff",
          color: "#00f5ff",
          boxShadow: "0 0 16px rgba(0,245,255,0.2)",
          cursor: saveMutation.isPending ? "wait" : "pointer",
        }}
      >
        {saveMutation.isPending ? "SAVING..." : "SAVE SETTINGS"}
      </button>

      {/* OANDA Sync */}
      <div className="terminal-card p-5">
        <div
          className="text-xs font-mono tracking-widest mb-3"
          style={{ color: "#00f5ff" }}
        >
          OANDA DATA SYNC
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono" style={{ color: "#4a5068" }}>
            Last synced:{" "}
            <span style={{ color: "#e8ecf4" }}>{lastSyncDate}</span>
          </div>
          <button
            type="button"
            data-ocid="goals.sync.button"
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2 rounded font-orbitron font-bold text-xs tracking-wider transition-all"
            style={{
              border: "1px solid rgba(0,255,136,0.3)",
              color: "#00ff88",
              background: "rgba(0,255,136,0.06)",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} />
            SYNC FROM OANDA
          </button>
        </div>
        {syncMsg && (
          <div
            className="mt-3 p-3 rounded text-xs font-mono"
            style={{
              background: "rgba(0,245,255,0.05)",
              border: "1px solid rgba(0,245,255,0.15)",
              color: "#00f5ff",
            }}
          >
            ℹ {syncMsg}
          </div>
        )}
      </div>

      {/* MT4 EA Section */}
      <div className="terminal-card p-6 space-y-5" data-ocid="goals.ea.section">
        <div className="flex items-center justify-between">
          <div
            className="text-xs font-mono tracking-widest"
            style={{ color: "#7b5ea7" }}
          >
            MT4 EXPERT ADVISOR — AUTO-SYNC
          </div>
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              background: "rgba(155,123,199,0.12)",
              border: "1px solid rgba(155,123,199,0.3)",
              color: "#9b7bc7",
            }}
          >
            v2.00
          </span>
        </div>

        <p
          className="text-xs font-mono leading-relaxed"
          style={{ color: "#4a5068" }}
        >
          When you attach the RmandX EA v2.00 to any chart in MT4, it
          immediately scans your full account history and sends every trading
          day to this dashboard. Live trade closes and daily summaries continue
          to sync automatically — no manual entry required.
        </p>

        {/* Download button */}
        <a
          href="/RmandX_EA.mq4"
          download="RmandX_EA.mq4"
          data-ocid="goals.ea.download_button"
          className="flex items-center justify-center gap-2 w-full py-3 rounded font-orbitron font-bold text-sm tracking-widest transition-all"
          style={{
            background: "rgba(155,123,199,0.1)",
            border: "1px solid rgba(155,123,199,0.5)",
            color: "#9b7bc7",
            boxShadow: "0 0 16px rgba(155,123,199,0.15)",
            textDecoration: "none",
            display: "flex",
          }}
        >
          <Download size={14} />
          DOWNLOAD RmandX_EA v2.00
        </a>

        {/* Setup steps */}
        <div
          className="rounded p-4 space-y-3"
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid #1a2035",
          }}
        >
          <div
            className="text-xs font-mono tracking-widest mb-1"
            style={{ color: "#4a5068" }}
          >
            SETUP INSTRUCTIONS
          </div>
          {[
            {
              step: "01",
              text: "Open MT4 → File → Open Data Folder → MQL4 → Experts. Paste RmandX_EA.mq4 there.",
            },
            {
              step: "02",
              text: "In MT4 press F4 (MetaEditor) → Compile the EA. You should see 0 errors.",
            },
            {
              step: "03",
              text: "Go to Tools → Options → Expert Advisors → check 'Allow WebRequest for listed URL' → add your Webhook URL shown below.",
            },
            {
              step: "04",
              text: "Drag the EA onto any chart. In Inputs: set WebhookURL to your webhook URL below. Set WebhookSecret to any password. Set SendFullHistoryOnLoad = true.",
            },
            {
              step: "05",
              text: "Enable AutoTrading (F7). On load, ALL historical trades sync immediately. Future trade closes and daily summaries at 22:00 server time sync automatically.",
            },
          ].map(({ step, text }) => (
            <div key={step} className="flex gap-3 text-xs font-mono">
              <span
                className="shrink-0 font-orbitron font-bold"
                style={{ color: "#9b7bc7" }}
              >
                {step}
              </span>
              <span style={{ color: "#e8ecf4", lineHeight: "1.6" }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Webhook URL display */}
        <div>
          <div
            className="text-xs font-mono tracking-widest mb-2"
            style={{ color: "#4a5068" }}
          >
            YOUR WEBHOOK URL
          </div>
          <div
            className="flex items-center gap-2 p-3 rounded font-mono text-xs break-all"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(123,94,167,0.2)",
              color: "#7b5ea7",
            }}
          >
            <span style={{ color: "#4a5068" }}>POST</span>
            <span style={{ color: "#e8ecf4" }}>
              {typeof window !== "undefined"
                ? `${window.location.origin}/webhook/mt4`
                : "https://your-canister.icp0.io/webhook/mt4"}
            </span>
          </div>
        </div>

        {/* On-load history sync info panel */}
        <div
          className="rounded p-4 space-y-2"
          style={{
            background: "rgba(0,245,255,0.04)",
            border: "1px solid rgba(0,245,255,0.15)",
          }}
        >
          <div
            className="text-xs font-mono tracking-widest font-bold"
            style={{ color: "#00f5ff" }}
          >
            ON-LOAD HISTORY SYNC
          </div>
          <p
            className="text-xs font-mono leading-relaxed"
            style={{ color: "#4a5068" }}
          >
            With SendFullHistoryOnLoad = true, the EA scans every closed trade
            in your MT4 history the moment it is attached to a chart. Each day
            is grouped and sent as a daily summary. This runs once per chart
            attachment — reattach the EA any time to re-sync.
          </p>
        </div>

        {/* Data notes */}
        <div
          className="text-xs font-mono leading-relaxed p-3 rounded"
          style={{
            background: "rgba(255,184,0,0.04)",
            border: "1px solid rgba(255,184,0,0.12)",
            color: "#ffb800",
          }}
        >
          <span className="font-bold">NOTE:</span> The EA sends P&amp;L %
          relative to your account balance. Mindset score defaults to 3
          (neutral) — update it in the Calendar after each session. Session
          breakdown is estimated from trade close times using UTC offsets.
        </div>
      </div>
    </div>
  );
}
