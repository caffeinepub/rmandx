import type { DayEntry, UserSettings } from "../backend.d";

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface DrawdownPoint {
  date: string;
  drawdown: number;
}

export interface ComputedStats {
  totalPnlPct: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  equity: EquityPoint[];
  drawdownSeries: DrawdownPoint[];
  maxDD: number;
  currentDD: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  var95: number;
  var99: number;
  currentWin: number;
  currentLoss: number;
  maxWin: number;
  maxLoss: number;
  grossProfit: number;
  grossLoss: number;
  londonAvg: number;
  nyAvg: number;
  asiaAvg: number;
  totalCommissions: number;
  totalSlippage: number;
  avgPsych: number;
  netPnlAfterCosts: number;
  // Monthly heatmap
  monthlyReturns: {
    key: string;
    year: number;
    month: number;
    label: string;
    pnl: number;
  }[];
  // Instrument totals
  instrumentPnl: { pair: string; pnl: number }[];
  // Week data
  weeklyPnl: number;
  weekEntries: DayEntry[];
}

function getMonthLabel(month: number): string {
  return (
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][month] ?? ""
  );
}

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split("T")[0],
    end: sun.toISOString().split("T")[0],
  };
}

export function computeStats(
  entries: DayEntry[],
  _settings?: UserSettings,
): ComputedStats {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  const totalPnlPct = sorted.reduce((sum, e) => sum + e.pnlPct, 0);

  const wins = sorted.filter((e) => e.pnlPct > 0);
  const losses = sorted.filter((e) => e.pnlPct < 0);
  const winRate = sorted.length > 0 ? (wins.length / sorted.length) * 100 : 0;

  const grossProfit = wins.reduce((s, e) => s + e.pnlPct, 0);
  const grossLoss = Math.abs(losses.reduce((s, e) => s + e.pnlPct, 0));
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const expectancy =
    (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

  // Equity curve
  const equity: EquityPoint[] = [];
  let equityCurrent = 100;
  for (const e of sorted) {
    equityCurrent += e.pnlPct;
    equity.push({
      date: e.date,
      equity: Math.round(equityCurrent * 100) / 100,
    });
  }

  // Drawdown series
  let peak = 100;
  const drawdownSeries: DrawdownPoint[] = [];
  let maxDD = 0;
  let currentDD = 0;
  for (let i = 0; i < equity.length; i++) {
    if (equity[i].equity > peak) peak = equity[i].equity;
    const dd = peak > 0 ? -((peak - equity[i].equity) / peak) * 100 : 0;
    if (-dd > maxDD) maxDD = -dd;
    currentDD = -dd;
    drawdownSeries.push({
      date: equity[i].date,
      drawdown: Math.round(dd * 100) / 100,
    });
  }

  // Sharpe
  const mean = sorted.length > 0 ? totalPnlPct / sorted.length : 0;
  const variance =
    sorted.length > 1
      ? sorted.reduce((s, e) => s + (e.pnlPct - mean) ** 2, 0) /
        (sorted.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

  // Sortino
  const downVariance =
    losses.length > 0
      ? losses.reduce((s, e) => s + e.pnlPct ** 2, 0) / sorted.length
      : 0;
  const downStdDev = Math.sqrt(downVariance);
  const sortino = downStdDev > 0 ? (mean / downStdDev) * Math.sqrt(252) : 0;

  // Calmar
  const calmar = maxDD > 0 ? totalPnlPct / maxDD : 0;

  // VaR
  const sortedReturns = sorted.map((e) => e.pnlPct).sort((a, b) => a - b);
  const var95 = sortedReturns[Math.floor(sortedReturns.length * 0.05)] ?? 0;
  const var99 = sortedReturns[Math.floor(sortedReturns.length * 0.01)] ?? 0;

  // Streaks
  let tempWin = 0;
  let tempLoss = 0;
  let maxWin = 0;
  let maxLoss = 0;
  for (const e of sorted) {
    if (e.pnlPct > 0) {
      tempWin++;
      tempLoss = 0;
      if (tempWin > maxWin) maxWin = tempWin;
    } else if (e.pnlPct < 0) {
      tempLoss++;
      tempWin = 0;
      if (tempLoss > maxLoss) maxLoss = tempLoss;
    } else {
      tempWin = 0;
      tempLoss = 0;
    }
  }
  const currentWin = tempWin;
  const currentLoss = tempLoss;

  // Sessions
  const londonAvg =
    sorted.length > 0
      ? sorted.reduce((s, e) => s + e.londonPct, 0) / sorted.length
      : 0;
  const nyAvg =
    sorted.length > 0
      ? sorted.reduce((s, e) => s + e.nyPct, 0) / sorted.length
      : 0;
  const asiaAvg =
    sorted.length > 0
      ? sorted.reduce((s, e) => s + e.asiaPct, 0) / sorted.length
      : 0;

  // Costs
  const totalCommissions = sorted.reduce((s, e) => s + e.commissions, 0);
  const totalSlippage = sorted.reduce((s, e) => s + e.slippage, 0);

  // Psych
  const avgPsych =
    sorted.length > 0
      ? sorted.reduce((s, e) => s + Number(e.psych), 0) / sorted.length
      : 0;

  // Monthly heatmap
  const monthMap = new Map<string, number>();
  for (const e of sorted) {
    const [yr, mo] = e.date.split("-");
    const key = `${yr}-${mo}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + e.pnlPct);
  }
  const monthlyReturns = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, pnl]) => {
      const [yr, mo] = key.split("-");
      const monthIndex = Number.parseInt(mo) - 1;
      return {
        key,
        year: Number.parseInt(yr),
        month: monthIndex,
        label: `${getMonthLabel(monthIndex)} ${yr}`,
        pnl: Math.round(pnl * 100) / 100,
      };
    });

  // Instrument P&L
  const instrumentPnl = [
    {
      pair: "GBPJPY",
      pnl: Math.round(sorted.reduce((s, e) => s + e.gbpjpyPct, 0) * 100) / 100,
    },
    {
      pair: "EURUSD",
      pnl: Math.round(sorted.reduce((s, e) => s + e.eurusdPct, 0) * 100) / 100,
    },
    {
      pair: "USDJPY",
      pnl: Math.round(sorted.reduce((s, e) => s + e.usdjpyPct, 0) * 100) / 100,
    },
    {
      pair: "GBPUSD",
      pnl: Math.round(sorted.reduce((s, e) => s + e.gbpusdPct, 0) * 100) / 100,
    },
    {
      pair: "XAUUSD",
      pnl: Math.round(sorted.reduce((s, e) => s + e.xauusdPct, 0) * 100) / 100,
    },
    {
      pair: "US30",
      pnl: Math.round(sorted.reduce((s, e) => s + e.us30Pct, 0) * 100) / 100,
    },
    {
      pair: "AUDUSD",
      pnl:
        Math.round(sorted.reduce((s, e) => s + (e.audusdPct ?? 0), 0) * 100) /
        100,
    },
  ];

  // Weekly P&L
  const { start, end } = getWeekBounds();
  const weekEntries = sorted.filter((e) => e.date >= start && e.date <= end);
  const weeklyPnl = weekEntries.reduce((s, e) => s + e.pnlPct, 0);

  return {
    totalPnlPct: Math.round(totalPnlPct * 100) / 100,
    winRate: Math.round(winRate * 10) / 10,
    profitFactor: Math.round(profitFactor * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    equity,
    drawdownSeries,
    maxDD: Math.round(maxDD * 100) / 100,
    currentDD: Math.round(currentDD * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    calmar: Math.round(calmar * 100) / 100,
    var95: Math.round(var95 * 100) / 100,
    var99: Math.round(var99 * 100) / 100,
    currentWin,
    currentLoss,
    maxWin,
    maxLoss,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossLoss: Math.round(grossLoss * 100) / 100,
    londonAvg: Math.round(londonAvg * 100) / 100,
    nyAvg: Math.round(nyAvg * 100) / 100,
    asiaAvg: Math.round(asiaAvg * 100) / 100,
    totalCommissions: Math.round(totalCommissions * 100) / 100,
    totalSlippage: Math.round(totalSlippage * 100) / 100,
    avgPsych: Math.round(avgPsych * 10) / 10,
    netPnlAfterCosts:
      Math.round((totalPnlPct - totalCommissions - totalSlippage) * 100) / 100,
    monthlyReturns,
    instrumentPnl,
    weeklyPnl: Math.round(weeklyPnl * 100) / 100,
    weekEntries,
  };
}

export function getWeekDayEntries(entries: DayEntry[]): DayEntry[] {
  const { start, end } = getWeekBounds();
  return entries.filter((e) => e.date >= start && e.date <= end);
}

export function isForexMarketOpen(): boolean {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const minutesSinceMidnight = utcHour * 60 + utcMin;

  // Market open: Mon 22:00 UTC to Fri 22:00 UTC
  if (utcDay === 6) return false; // Saturday closed
  if (utcDay === 0) return false; // Sunday before 22:00 UTC
  if (utcDay === 5 && minutesSinceMidnight >= 22 * 60) return false; // Friday after 22:00
  if (utcDay === 0 && minutesSinceMidnight < 22 * 60) return false; // Sunday before 22:00
  return true;
}
