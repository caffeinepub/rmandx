import { useEffect, useRef, useState } from "react";

export type TabId =
  | "dashboard"
  | "calendar"
  | "risk"
  | "sessions"
  | "journal"
  | "goals";

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "DASHBOARD" },
  { id: "calendar", label: "CALENDAR" },
  { id: "risk", label: "RISK" },
  { id: "sessions", label: "SESSIONS" },
  { id: "journal", label: "JOURNAL" },
  { id: "goals", label: "GOALS" },
];

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      const parent = el.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        setIndicator({
          left: rect.left - parentRect.left,
          width: rect.width,
        });
      }
    }
  }, [activeTab]);

  return (
    <nav
      className="flex items-center px-6 relative"
      style={{
        background: "rgba(5, 6, 8, 0.9)",
        borderBottom: "1px solid #1a2035",
      }}
    >
      {/* Glowing underline indicator */}
      <div
        className="tab-indicator"
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />

      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            data-ocid={`nav.${tab.id}.tab`}
            onClick={() => onTabChange(tab.id)}
            className="relative px-5 py-3.5 text-xs font-mono font-semibold tracking-widest transition-all"
            style={{
              color: isActive ? "#00f5ff" : "#4a5068",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textShadow: isActive ? "0 0 10px rgba(0,245,255,0.6)" : "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
