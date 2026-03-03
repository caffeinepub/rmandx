import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { DayEntry } from "../../backend.d";
import { useDeleteDayEntry, useSaveDayEntry } from "../../hooks/useQueries";

interface DayLogModalProps {
  open: boolean;
  date: string | null;
  existingEntry: DayEntry | null;
  onClose: () => void;
}

const EMPTY_FORM = {
  pnlPct: "",
  trades: "",
  rr: "",
  riskPct: "",
  londonPct: "",
  nyPct: "",
  asiaPct: "",
  gbpjpyPct: "",
  eurusdPct: "",
  usdjpyPct: "",
  gbpusdPct: "",
  xauusdPct: "",
  us30Pct: "",
  audusdPct: "",
  psych: 3,
  commissions: "",
  slippage: "",
  note: "",
};

type FormState = typeof EMPTY_FORM;

export function DayLogModal({
  open,
  date,
  existingEntry,
  onClose,
}: DayLogModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const saveMutation = useSaveDayEntry();
  const deleteMutation = useDeleteDayEntry();

  useEffect(() => {
    if (!open) return;
    if (existingEntry) {
      setForm({
        pnlPct: String(existingEntry.pnlPct),
        trades: String(Number(existingEntry.trades)),
        rr: String(existingEntry.rr),
        riskPct: String(existingEntry.riskPct),
        londonPct: String(existingEntry.londonPct),
        nyPct: String(existingEntry.nyPct),
        asiaPct: String(existingEntry.asiaPct),
        gbpjpyPct: String(existingEntry.gbpjpyPct),
        eurusdPct: String(existingEntry.eurusdPct),
        usdjpyPct: String(existingEntry.usdjpyPct),
        gbpusdPct: String(existingEntry.gbpusdPct),
        xauusdPct: String(existingEntry.xauusdPct),
        us30Pct: String(existingEntry.us30Pct),
        audusdPct: String(existingEntry.audusdPct ?? 0),
        psych: Number(existingEntry.psych),
        commissions: String(existingEntry.commissions),
        slippage: String(existingEntry.slippage),
        note: existingEntry.note,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [existingEntry, open]);

  const n = (val: string, fallback = 0) => {
    const parsed = Number.parseFloat(val);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const handleSave = async () => {
    if (!date) return;
    const entry: DayEntry = {
      date,
      pnlPct: n(form.pnlPct),
      trades: BigInt(Number.parseInt(form.trades) || 0),
      rr: n(form.rr),
      riskPct: n(form.riskPct),
      londonPct: n(form.londonPct),
      nyPct: n(form.nyPct),
      asiaPct: n(form.asiaPct),
      gbpjpyPct: n(form.gbpjpyPct),
      eurusdPct: n(form.eurusdPct),
      usdjpyPct: n(form.usdjpyPct),
      gbpusdPct: n(form.gbpusdPct),
      xauusdPct: n(form.xauusdPct),
      us30Pct: n(form.us30Pct),
      audusdPct: n(form.audusdPct),
      psych: BigInt(form.psych),
      commissions: n(form.commissions),
      slippage: n(form.slippage),
      note: form.note,
      source: "manual",
    };
    try {
      await saveMutation.mutateAsync(entry);
      toast.success("Entry saved successfully");
      onClose();
    } catch {
      toast.error("Failed to save entry");
    }
  };

  const handleDelete = async () => {
    if (!date) return;
    try {
      await deleteMutation.mutateAsync(date);
      toast.success("Entry deleted");
      onClose();
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(0,245,255,0.15)",
    color: "#e8ecf4",
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "13px",
    borderRadius: "4px",
    padding: "6px 10px",
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
    marginBottom: "4px",
    display: "block",
  };

  const handleFocus = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    e.target.style.borderColor = "#00f5ff";
    e.target.style.boxShadow = "0 0 8px rgba(0,245,255,0.2)";
  };
  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    e.target.style.borderColor = "rgba(0,245,255,0.15)";
    e.target.style.boxShadow = "none";
  };

  const updateField = (key: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isPending = saveMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="daylog.modal"
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        style={{
          background: "#050608",
          border: "1px solid rgba(0,245,255,0.2)",
          boxShadow: "0 0 40px rgba(0,245,255,0.1)",
        }}
      >
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle
            className="font-orbitron text-lg"
            style={{ color: "#00f5ff" }}
          >
            DAY LOG — {date}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 pt-4 space-y-5">
          {/* P&L + Trades + R:R + Risk */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div style={labelStyle}>Daily P&L %</div>
              <input
                data-ocid="daylog.pnl.input"
                aria-label="Daily P&L %"
                type="number"
                step="0.01"
                value={form.pnlPct}
                onChange={(e) => updateField("pnlPct", e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyle}
                placeholder="e.g. 1.25"
              />
            </div>
            <div>
              <div style={labelStyle}>Trades</div>
              <input
                data-ocid="daylog.trades.input"
                aria-label="Trades"
                type="number"
                value={form.trades}
                onChange={(e) => updateField("trades", e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyle}
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <div style={labelStyle}>Average R:R</div>
              <input
                data-ocid="daylog.rr.input"
                aria-label="Average R:R"
                type="number"
                step="0.1"
                value={form.rr}
                onChange={(e) => updateField("rr", e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyle}
                placeholder="e.g. 2.5"
              />
            </div>
            <div>
              <div style={labelStyle}>Risk % per trade</div>
              <input
                data-ocid="daylog.risk.input"
                aria-label="Risk % per trade"
                type="number"
                step="0.1"
                value={form.riskPct}
                onChange={(e) => updateField("riskPct", e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyle}
                placeholder="e.g. 1.0"
              />
            </div>
          </div>

          {/* Session Breakdown */}
          <div>
            <div
              style={{ ...labelStyle, color: "#7b5ea7", marginBottom: "8px" }}
            >
              SESSION BREAKDOWN
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div style={labelStyle}>🇬🇧 London %</div>
                <input
                  data-ocid="daylog.london.input"
                  aria-label="London %"
                  type="number"
                  step="0.01"
                  value={form.londonPct}
                  onChange={(e) => updateField("londonPct", e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={labelStyle}>🇺🇸 New York %</div>
                <input
                  data-ocid="daylog.ny.input"
                  aria-label="New York %"
                  type="number"
                  step="0.01"
                  value={form.nyPct}
                  onChange={(e) => updateField("nyPct", e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={labelStyle}>🇯🇵 Asia %</div>
                <input
                  data-ocid="daylog.asia.input"
                  aria-label="Asia %"
                  type="number"
                  step="0.01"
                  value={form.asiaPct}
                  onChange={(e) => updateField("asiaPct", e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Instrument Breakdown */}
          <div>
            <div
              style={{ ...labelStyle, color: "#00ff88", marginBottom: "8px" }}
            >
              INSTRUMENT BREAKDOWN
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  "gbpjpyPct",
                  "eurusdPct",
                  "usdjpyPct",
                  "gbpusdPct",
                  "xauusdPct",
                  "us30Pct",
                  "audusdPct",
                ] as (keyof FormState)[]
              ).map((key) => {
                const label = key.replace("Pct", "").toUpperCase();
                const ocid = `daylog.${key.replace("Pct", "").toLowerCase()}.input`;
                return (
                  <div key={key}>
                    <div style={labelStyle}>{label} %</div>
                    <input
                      data-ocid={ocid}
                      aria-label={`${label} %`}
                      type="number"
                      step="0.01"
                      value={form[key] as string}
                      onChange={(e) => updateField(key, e.target.value)}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      style={inputStyle}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mindset Score */}
          <div>
            <div style={{ ...labelStyle, marginBottom: "10px" }}>
              MINDSET SCORE
            </div>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  data-ocid={`daylog.psych.${n}`}
                  onClick={() => updateField("psych", n)}
                  className="psych-orb"
                  style={
                    form.psych === n
                      ? {
                          background: "#00f5ff",
                          borderColor: "#00f5ff",
                          boxShadow:
                            "0 0 12px #00f5ff, 0 0 24px rgba(0,245,255,0.4)",
                          color: "#050608",
                          fontFamily: "Orbitron, monospace",
                          fontWeight: 900,
                          fontSize: "12px",
                        }
                      : {
                          color: "#4a5068",
                          fontFamily: "Orbitron, monospace",
                          fontWeight: 900,
                          fontSize: "12px",
                        }
                  }
                >
                  {n}
                </button>
              ))}
              <span
                className="ml-2 self-center text-xs font-mono"
                style={{ color: "#4a5068" }}
              >
                {
                  ["", "Poor", "Below Avg", "Average", "Good", "Excellent"][
                    form.psych
                  ]
                }
              </span>
            </div>
          </div>

          {/* Costs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div style={labelStyle}>Commissions %</div>
              <input
                data-ocid="daylog.commissions.input"
                aria-label="Commissions %"
                type="number"
                step="0.01"
                value={form.commissions}
                onChange={(e) => updateField("commissions", e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyle}
                placeholder="e.g. 0.05"
              />
            </div>
            <div>
              <div style={labelStyle}>Slippage %</div>
              <input
                data-ocid="daylog.slippage.input"
                aria-label="Slippage %"
                type="number"
                step="0.01"
                value={form.slippage}
                onChange={(e) => updateField("slippage", e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={inputStyle}
                placeholder="e.g. 0.02"
              />
            </div>
          </div>

          {/* Journal Note */}
          <div>
            <div style={labelStyle}>Journal Note</div>
            <textarea
              data-ocid="daylog.note.textarea"
              value={form.note}
              onChange={(e) => updateField("note", e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "80px",
              }}
              placeholder="What happened? Any mistakes? Market conditions?"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              data-ocid="daylog.save.button"
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 py-2.5 rounded font-orbitron text-sm font-bold tracking-wider transition-all"
              style={{
                background: "rgba(0,245,255,0.1)",
                border: "1px solid #00f5ff",
                color: "#00f5ff",
                boxShadow: "0 0 12px rgba(0,245,255,0.2)",
                cursor: isPending ? "wait" : "pointer",
              }}
            >
              {saveMutation.isPending ? "SAVING..." : "SAVE"}
            </button>
            {existingEntry && (
              <button
                type="button"
                data-ocid="daylog.delete.button"
                onClick={handleDelete}
                disabled={isPending}
                className="py-2.5 px-6 rounded font-orbitron text-sm font-bold tracking-wider transition-all"
                style={{
                  background: "rgba(255,45,85,0.1)",
                  border: "1px solid #ff2d55",
                  color: "#ff2d55",
                  cursor: isPending ? "wait" : "pointer",
                }}
              >
                {deleteMutation.isPending ? "..." : "DELETE"}
              </button>
            )}
            <button
              type="button"
              data-ocid="daylog.cancel.button"
              onClick={onClose}
              disabled={isPending}
              className="py-2.5 px-6 rounded font-orbitron text-sm font-bold tracking-wider transition-all"
              style={{
                background: "rgba(74,80,104,0.2)",
                border: "1px solid #4a5068",
                color: "#4a5068",
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
