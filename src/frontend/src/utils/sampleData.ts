import type { DayEntry, UserSettings } from "../backend.d";

// Generate 60 days of realistic sample forex trading data
function generateSampleData(): DayEntry[] {
  const entries: DayEntry[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    const dateStr = d.toISOString().split("T")[0];

    // Realistic P&L: mostly small positive, some losses
    const rand = Math.random();
    let pnlPct: number;
    if (rand < 0.15)
      pnlPct = -(Math.random() * 2.5 + 0.5); // big loss
    else if (rand < 0.35)
      pnlPct = -(Math.random() * 1.2 + 0.1); // small loss
    else if (rand < 0.55)
      pnlPct = Math.random() * 0.8 + 0.1; // small win
    else if (rand < 0.8)
      pnlPct = Math.random() * 1.8 + 0.5; // decent win
    else pnlPct = Math.random() * 3.2 + 1.5; // big win

    pnlPct = Math.round(pnlPct * 100) / 100;

    const trades = Math.floor(Math.random() * 4) + 1;
    const rr = Math.round((1.2 + Math.random() * 2.8) * 10) / 10;
    const riskPct = Math.round((0.5 + Math.random() * 1.5) * 10) / 10;
    const psych = BigInt(
      Math.floor(2 + Math.random() * 3 + (pnlPct > 0 ? 0.5 : 0)),
    );
    const commissions = Math.round(0.02 * trades * 10) / 10;
    const slippage = Math.round(Math.random() * 0.05 * 10) / 10;

    // Session breakdown (sum loosely to pnlPct)
    const londonPct =
      Math.round(pnlPct * (0.3 + Math.random() * 0.4) * 100) / 100;
    const nyPct = Math.round(pnlPct * (0.2 + Math.random() * 0.3) * 100) / 100;
    const asiaPct = Math.round((pnlPct - londonPct - nyPct) * 100) / 100;

    // Pair breakdown
    const gbpjpyPct =
      Math.round(pnlPct * (0.2 + Math.random() * 0.3) * 100) / 100;
    const eurusdPct =
      Math.round(pnlPct * (0.15 + Math.random() * 0.25) * 100) / 100;
    const usdjpyPct =
      Math.round(pnlPct * (0.1 + Math.random() * 0.2) * 100) / 100;
    const gbpusdPct =
      Math.round(pnlPct * (0.1 + Math.random() * 0.2) * 100) / 100;
    const xauusdPct =
      Math.round(pnlPct * (0.1 + Math.random() * 0.15) * 100) / 100;
    const audusdPct =
      Math.round(pnlPct * (0.05 + Math.random() * 0.1) * 100) / 100;
    const us30Pct =
      Math.round(
        (pnlPct -
          gbpjpyPct -
          eurusdPct -
          usdjpyPct -
          gbpusdPct -
          xauusdPct -
          audusdPct) *
          100,
      ) / 100;

    const notes = [
      "Strong London open, GBP momentum. Stayed disciplined.",
      "Missed entry on EURUSD, recovered on gold.",
      "NY session choppy. Reduced risk after first loss.",
      "Clean breakout on GBPJPY. Held through volatility.",
      "Overtraded early. Recovered focus after lunch.",
      "NFP day — stepped aside for first 30 minutes.",
      "Trend day. Held runners. Best P&L this month.",
      "Choppy market. Took minimal positions.",
      "Mistake on USDJPY entry. Stop hit cleanly.",
      "Excellent R:R day. All 3 trades hit target.",
      "London session strong. NY gave back some gains.",
      "Gold provided good opportunity during news event.",
      "",
    ];

    entries.push({
      date: dateStr,
      pnlPct,
      trades: BigInt(trades),
      rr,
      riskPct,
      psych: BigInt(Math.min(5, Math.max(1, Number(psych)))),
      commissions,
      slippage,
      londonPct,
      nyPct,
      asiaPct,
      gbpjpyPct,
      eurusdPct,
      usdjpyPct,
      gbpusdPct,
      xauusdPct,
      us30Pct,
      audusdPct,
      note: notes[Math.floor(Math.random() * notes.length)],
      source: "sample",
    });
  }

  return entries;
}

export const SAMPLE_DATA: DayEntry[] = generateSampleData();

export const DEFAULT_SETTINGS: UserSettings = {
  weeklyGoal: 3.0,
  dailyGoal: 1.0,
  ddLimit: -2.0,
  trackedPairs: ["GBPJPY", "EURUSD", "USDJPY", "GBPUSD", "XAUUSD", "US30"],
  oandaAccountId: "",
  oandaApiKey: "",
  oandaEnv: "practice",
  lastSync: BigInt(0),
};
