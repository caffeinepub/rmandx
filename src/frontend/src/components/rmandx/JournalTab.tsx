import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { DayEntry } from "../../backend.d";
import type { UserSettings } from "../../backend.d";
import { DayLogModal } from "./DayLogModal";

interface JournalTabProps {
  entries: DayEntry[];
  settings: UserSettings;
}

export function JournalTab({ entries }: JournalTabProps) {
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (e) =>
        e.date.includes(q) ||
        e.note.toLowerCase().includes(q) ||
        e.pnlPct.toString().includes(q),
    );
  }, [sorted, search]);

  const selectedEntry = selectedDate
    ? (entries.find((e) => e.date === selectedDate) ?? null)
    : null;

  const exportCsv = () => {
    const headers = [
      "Date",
      "P&L%",
      "Trades",
      "R:R",
      "Risk%",
      "Mindset",
      "London%",
      "NY%",
      "Asia%",
      "GBPJPY%",
      "EURUSD%",
      "USDJPY%",
      "GBPUSD%",
      "XAUUSD%",
      "US30%",
      "AUDUSD%",
      "Commissions%",
      "Slippage%",
      "Source",
      "Note",
    ];
    const rows = sorted.map((e) => [
      e.date,
      e.pnlPct.toFixed(2),
      String(Number(e.trades)),
      e.rr.toFixed(2),
      e.riskPct.toFixed(2),
      String(Number(e.psych)),
      e.londonPct.toFixed(2),
      e.nyPct.toFixed(2),
      e.asiaPct.toFixed(2),
      e.gbpjpyPct.toFixed(2),
      e.eurusdPct.toFixed(2),
      e.usdjpyPct.toFixed(2),
      e.gbpusdPct.toFixed(2),
      e.xauusdPct.toFixed(2),
      e.us30Pct.toFixed(2),
      (e.audusdPct ?? 0).toFixed(2),
      e.commissions.toFixed(2),
      e.slippage.toFixed(2),
      e.source,
      `"${e.note.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rmandx-journal-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const psychStars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

  return (
    <div className="p-6 max-w-[1280px] mx-auto" data-ocid="journal.section">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <h2
          className="font-orbitron font-bold text-xl"
          style={{ color: "#00f5ff" }}
        >
          TRADING JOURNAL
        </h2>
        <div className="flex gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#4a5068" }}
            />
            <input
              data-ocid="journal.search.input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search date or note..."
              className="terminal-input pl-8"
              style={{ width: "220px" }}
            />
          </div>
          <button
            type="button"
            data-ocid="journal.export_csv.button"
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-orbitron font-bold tracking-wider transition-all"
            style={{
              border: "1px solid rgba(0,245,255,0.3)",
              color: "#00f5ff",
              background: "rgba(0,245,255,0.06)",
            }}
          >
            <Download size={14} />
            EXPORT CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="terminal-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #1a2035" }}>
              {[
                "Date",
                "P&L%",
                "Trades",
                "R:R",
                "Risk%",
                "Mindset",
                "London",
                "NY",
                "Asia",
                "Note",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-left text-xs font-mono tracking-widest whitespace-nowrap"
                  style={{ color: "#4a5068" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="text-center py-12 font-mono text-sm"
                  style={{ color: "#4a5068" }}
                >
                  No entries found
                </td>
              </tr>
            ) : (
              filtered.map((entry, idx) => {
                const isProfit = entry.pnlPct > 0;
                return (
                  <tr
                    key={entry.date}
                    data-ocid={`journal.row.item.${idx + 1}`}
                    onClick={() => {
                      setSelectedDate(entry.date);
                      setModalOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedDate(entry.date);
                        setModalOpen(true);
                      }
                    }}
                    tabIndex={0}
                    style={{
                      background: isProfit
                        ? `rgba(0,255,136,${0.02 + Math.min(0.06, Math.abs(entry.pnlPct) * 0.01)})`
                        : `rgba(255,45,85,${0.02 + Math.min(0.06, Math.abs(entry.pnlPct) * 0.01)})`,
                      borderBottom: "1px solid rgba(26,32,53,0.5)",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isProfit
                        ? "rgba(0,255,136,0.08)"
                        : "rgba(255,45,85,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isProfit
                        ? `rgba(0,255,136,${0.02 + Math.min(0.06, Math.abs(entry.pnlPct) * 0.01)})`
                        : `rgba(255,45,85,${0.02 + Math.min(0.06, Math.abs(entry.pnlPct) * 0.01)})`;
                    }}
                  >
                    <td
                      className="px-3 py-2.5 font-mono text-xs"
                      style={{ color: "#e8ecf4", whiteSpace: "nowrap" }}
                    >
                      {entry.date}
                    </td>
                    <td
                      className="px-3 py-2.5 font-orbitron font-bold text-xs whitespace-nowrap"
                      style={{ color: isProfit ? "#00ff88" : "#ff2d55" }}
                    >
                      {entry.pnlPct >= 0 ? "+" : ""}
                      {entry.pnlPct.toFixed(2)}%
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono text-xs text-center"
                      style={{ color: "#e8ecf4" }}
                    >
                      {String(Number(entry.trades))}
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono text-xs"
                      style={{ color: "#e8ecf4" }}
                    >
                      {entry.rr.toFixed(1)}
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono text-xs"
                      style={{ color: "#ffb800" }}
                    >
                      {entry.riskPct.toFixed(1)}%
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono text-xs"
                      style={{ color: "#7b5ea7" }}
                    >
                      {psychStars(Number(entry.psych))}
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono text-xs"
                      style={{
                        color: entry.londonPct >= 0 ? "#00ff88" : "#ff2d55",
                      }}
                    >
                      {entry.londonPct >= 0 ? "+" : ""}
                      {entry.londonPct.toFixed(2)}
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono text-xs"
                      style={{
                        color: entry.nyPct >= 0 ? "#00ff88" : "#ff2d55",
                      }}
                    >
                      {entry.nyPct >= 0 ? "+" : ""}
                      {entry.nyPct.toFixed(2)}
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono text-xs"
                      style={{
                        color: entry.asiaPct >= 0 ? "#00ff88" : "#ff2d55",
                      }}
                    >
                      {entry.asiaPct >= 0 ? "+" : ""}
                      {entry.asiaPct.toFixed(2)}
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono text-xs max-w-xs truncate"
                      style={{ color: "#4a5068", maxWidth: "200px" }}
                      title={entry.note}
                    >
                      {entry.note || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <DayLogModal
        open={modalOpen}
        date={selectedDate}
        existingEntry={selectedEntry}
        onClose={() => {
          setModalOpen(false);
          setSelectedDate(null);
        }}
      />
    </div>
  );
}
