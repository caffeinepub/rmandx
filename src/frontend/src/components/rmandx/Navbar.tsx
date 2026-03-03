import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { isForexMarketOpen } from "../../utils/computeStats";

interface NavbarProps {
  isSampleData: boolean;
  onSettingsClick: () => void;
}

export function Navbar({ isSampleData, onSettingsClick }: NavbarProps) {
  const [time, setTime] = useState(() => new Date());
  const [marketOpen, setMarketOpen] = useState(() => isForexMarketOpen());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now);
      setMarketOpen(isForexMarketOpen());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const utcFull = `${String(time.getUTCHours()).padStart(2, "0")}:${String(time.getUTCMinutes()).padStart(2, "0")}:${String(time.getUTCSeconds()).padStart(2, "0")} UTC`;

  return (
    <header
      data-ocid="navbar.section"
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
      style={{
        background: "rgba(5, 6, 8, 0.95)",
        borderBottom: "1px solid #1a2035",
        backdropFilter: "blur(8px)",
        boxShadow: "0 0 20px rgba(0, 245, 255, 0.05)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative w-9 h-9">
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-9 h-9"
            aria-label="RmandX Logo"
          >
            <title>RmandX Logo</title>
            {/* Outer hexagon-ish shape */}
            <polygon
              points="18,2 32,9 32,27 18,34 4,27 4,9"
              stroke="#00f5ff"
              strokeWidth="1.5"
              fill="rgba(0,245,255,0.06)"
            />
            {/* R shape */}
            <text
              x="8"
              y="24"
              fontSize="16"
              fontWeight="900"
              fontFamily="Orbitron, monospace"
              fill="#00f5ff"
              style={{ filter: "drop-shadow(0 0 4px #00f5ff)" }}
            >
              R
            </text>
            {/* X shape overlaid */}
            <text
              x="18"
              y="24"
              fontSize="14"
              fontWeight="700"
              fontFamily="Orbitron, monospace"
              fill="#e8ecf4"
              opacity="0.9"
            >
              X
            </text>
          </svg>
        </div>
        <div>
          <div
            className="font-orbitron font-black text-xl tracking-widest"
            style={{
              color: "#00f5ff",
              textShadow: "0 0 12px rgba(0,245,255,0.5)",
            }}
          >
            RmandX
          </div>
          <div
            className="text-xs font-mono"
            style={{ color: "#4a5068", letterSpacing: "0.1em" }}
          >
            TRADING INTELLIGENCE
          </div>
        </div>

        {isSampleData && (
          <div
            className="ml-3 px-2 py-0.5 rounded text-xs font-mono"
            style={{
              border: "1px solid #ffb800",
              color: "#ffb800",
              background: "rgba(255,184,0,0.1)",
              letterSpacing: "0.08em",
            }}
          >
            SAMPLE DATA
          </div>
        )}
      </div>

      {/* Right side: clock + market status + settings */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div
            className="font-orbitron text-sm font-bold"
            style={{ color: "#e8ecf4", letterSpacing: "0.1em" }}
          >
            {utcFull}
          </div>
          <div
            className="text-xs font-mono flex items-center gap-1.5 justify-end mt-0.5"
            style={{ color: marketOpen ? "#00ff88" : "#ff2d55" }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: marketOpen ? "#00ff88" : "#ff2d55",
                boxShadow: marketOpen ? "0 0 6px #00ff88" : "0 0 6px #ff2d55",
              }}
            />
            MARKET: {marketOpen ? "OPEN" : "CLOSED"}
          </div>
        </div>

        <button
          type="button"
          onClick={onSettingsClick}
          className="p-2 rounded transition-all"
          style={{
            color: "#4a5068",
            border: "1px solid #1a2035",
            background: "rgba(11,13,18,0.5)",
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
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
