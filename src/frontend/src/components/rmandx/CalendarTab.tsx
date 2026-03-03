import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { DayEntry, UserSettings } from "../../backend.d";
import { DayLogModal } from "./DayLogModal";

interface CalendarTabProps {
  entries: DayEntry[];
  settings: UserSettings;
}

const DOW_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function CalendarTab({ entries, settings }: CalendarTabProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const entryMap = useMemo(
    () => new Map(entries.map((e) => [e.date, e])),
    [entries],
  );

  const { year, month } = viewDate;

  const prevMonth = () => {
    setViewDate(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 };
      return { year, month: month - 1 };
    });
  };

  const nextMonth = () => {
    setViewDate(({ year, month }) => {
      if (month === 11) return { year: year + 1, month: 0 };
      return { year, month: month + 1 };
    });
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  // Convert to Mon-based: if startDow=0 (Sun), offset=6; else offset=startDow-1
  const offset = startDow === 0 ? 6 : startDow - 1;

  const totalCells = Math.ceil((offset + lastDay.getDate()) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - offset + 1;
    if (day < 1 || day > lastDay.getDate()) cells.push(null);
    else cells.push(day);
  }

  const monthStr = String(month + 1).padStart(2, "0");
  const todayStr = today.toISOString().split("T")[0];

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Find max abs pnl in this month for intensity scaling
  const monthEntries = entries.filter((e) =>
    e.date.startsWith(`${year}-${monthStr}`),
  );
  const maxAbsPnl = Math.max(...monthEntries.map((e) => Math.abs(e.pnlPct)), 1);

  const selectedEntry = selectedDate
    ? (entryMap.get(selectedDate) ?? null)
    : null;

  let clickableIndex = 0;

  return (
    <div className="p-6 max-w-[1280px] mx-auto" data-ocid="calendar.section">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2
          className="font-orbitron font-bold text-xl"
          style={{ color: "#00f5ff" }}
        >
          {monthNames[month].toUpperCase()} {year}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            data-ocid="calendar.prev_month.button"
            onClick={prevMonth}
            className="p-2 rounded transition-all"
            style={{
              border: "1px solid #1a2035",
              background: "rgba(11,13,18,0.5)",
              color: "#4a5068",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#00f5ff";
              e.currentTarget.style.borderColor = "rgba(0,245,255,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#4a5068";
              e.currentTarget.style.borderColor = "#1a2035";
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            data-ocid="calendar.next_month.button"
            onClick={nextMonth}
            className="p-2 rounded transition-all"
            style={{
              border: "1px solid #1a2035",
              background: "rgba(11,13,18,0.5)",
              color: "#4a5068",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#00f5ff";
              e.currentTarget.style.borderColor = "rgba(0,245,255,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#4a5068";
              e.currentTarget.style.borderColor = "#1a2035";
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* DOW Labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="text-center py-2 text-xs font-mono tracking-widest"
            style={{
              color:
                d === "SAT" || d === "SUN" ? "rgba(74,80,104,0.4)" : "#4a5068",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          const colIdx = idx % 7; // 0=Mon,...,4=Fri,5=Sat,6=Sun
          const isWeekend = colIdx === 5 || colIdx === 6;
          const rowNum = Math.floor(idx / 7);
          const cellKey = `cell-r${rowNum}-c${colIdx}`;

          if (day === null || isWeekend) {
            return (
              <div
                key={cellKey}
                className="rounded-lg"
                style={{
                  aspectRatio: "1 / 0.9",
                  background: "rgba(11,13,18,0.3)",
                  border: "1px solid rgba(26,32,53,0.3)",
                  opacity: 0.2,
                }}
              />
            );
          }

          const dateStr = `${year}-${monthStr}-${String(day).padStart(2, "0")}`;
          const entry = entryMap.get(dateStr);
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const pnl = entry?.pnlPct;

          const goalMet =
            entry &&
            settings.dailyGoal > 0 &&
            entry.pnlPct >= settings.dailyGoal;
          const ddHit =
            entry && settings.ddLimit < 0 && entry.pnlPct <= settings.ddLimit;

          let bg = "rgba(11,13,18,0.5)";
          let border = "#1a2035";
          let boxShadow = "none";
          let glowClass = "";

          if (entry && pnl !== undefined) {
            const intensity = Math.min(1, Math.abs(pnl) / maxAbsPnl);
            if (pnl > 0) {
              bg = `rgba(0,255,136,${0.04 + intensity * 0.1})`;
              border = `rgba(0,255,136,${0.2 + intensity * 0.3})`;
              boxShadow = `0 0 ${4 + intensity * 10}px rgba(0,255,136,${0.1 + intensity * 0.25})`;
              glowClass = "cal-cell-profit";
            } else if (pnl < 0) {
              bg = `rgba(255,45,85,${0.04 + intensity * 0.1})`;
              border = `rgba(255,45,85,${0.2 + intensity * 0.3})`;
              boxShadow = `0 0 ${4 + intensity * 10}px rgba(255,45,85,${0.1 + intensity * 0.25})`;
              glowClass = "cal-cell-loss";
            }
          }

          if (isToday) {
            border = "#00f5ff";
            boxShadow =
              "0 0 12px rgba(0,245,255,0.3), inset 0 0 8px rgba(0,245,255,0.05)";
          }

          if (ddHit) {
            glowClass += " flash-red-border";
          }

          clickableIndex++;
          const ocidIndex = clickableIndex;

          return (
            <button
              type="button"
              key={dateStr}
              data-ocid={`calendar.day.item.${ocidIndex}`}
              className={`rounded-lg p-2 cursor-pointer transition-all text-left w-full ${glowClass}`}
              style={{
                aspectRatio: "1 / 0.9",
                background: bg,
                border: `1px solid ${border}`,
                boxShadow,
                opacity: isFuture ? 0.4 : 1,
                pointerEvents: isFuture ? "none" : "auto",
              }}
              onClick={() => {
                if (!isFuture) {
                  setSelectedDate(dateStr);
                  setModalOpen(true);
                }
              }}
            >
              <div className="flex justify-between items-start">
                <span
                  className="text-xs font-mono"
                  style={{ color: isToday ? "#00f5ff" : "#4a5068" }}
                >
                  {day}
                </span>
                <div className="flex gap-0.5">
                  {goalMet && <span style={{ fontSize: "10px" }}>★</span>}
                  {ddHit && <span style={{ fontSize: "10px" }}>⚠</span>}
                </div>
              </div>

              {entry && pnl !== undefined ? (
                <>
                  <div
                    className="font-orbitron font-bold text-center"
                    style={{
                      fontSize: "clamp(9px, 1.2vw, 15px)",
                      color: pnl > 0 ? "#00ff88" : "#ff2d55",
                      marginTop: "4px",
                    }}
                  >
                    {pnl > 0 ? "+" : ""}
                    {pnl.toFixed(2)}%
                  </div>
                  <div
                    className="flex justify-between mt-1"
                    style={{ fontSize: "9px" }}
                  >
                    <span style={{ color: "#4a5068" }}>
                      {Number(entry.trades)}T
                    </span>
                    <span style={{ color: "#4a5068" }}>
                      {entry.rr.toFixed(1)}R
                    </span>
                  </div>
                </>
              ) : (
                <div
                  className="text-center mt-2 text-xs font-mono"
                  style={{ color: "rgba(74,80,104,0.3)" }}
                >
                  —
                </div>
              )}
            </button>
          );
        })}
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
