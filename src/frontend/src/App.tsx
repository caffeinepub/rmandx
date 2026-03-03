import { Toaster } from "@/components/ui/sonner";
import { useCallback, useMemo, useRef, useState } from "react";
import type { DayEntry } from "./backend.d";
import { CalendarTab } from "./components/rmandx/CalendarTab";
import { Dashboard } from "./components/rmandx/Dashboard";
import { GoalsTab } from "./components/rmandx/GoalsTab";
import { JournalTab } from "./components/rmandx/JournalTab";
import { Navbar } from "./components/rmandx/Navbar";
import { RiskTab } from "./components/rmandx/RiskTab";
import { SessionsTab } from "./components/rmandx/SessionsTab";
import { type TabId, TabNav } from "./components/rmandx/TabNav";
import { useAllEntries, useSettings } from "./hooks/useQueries";
import { computeStats } from "./utils/computeStats";
import { DEFAULT_SETTINGS, SAMPLE_DATA } from "./utils/sampleData";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [targetAcquiredShown, setTargetAcquiredShown] = useState(false);
  const targetAcquiredShownRef = useRef(false);

  const { data: entriesRaw, isLoading: entriesLoading } = useAllEntries();
  const { data: settingsRaw, isLoading: settingsLoading } = useSettings();

  const entries: DayEntry[] = entriesRaw ?? SAMPLE_DATA;
  const settings = settingsRaw ?? DEFAULT_SETTINGS;
  const isSampleData =
    !entriesRaw ||
    (entriesRaw.length > 0 && entriesRaw[0]?.source === "sample");

  const stats = useMemo(
    () => computeStats(entries, settings),
    [entries, settings],
  );

  const isLoading = entriesLoading || settingsLoading;

  const handleTargetAcquiredShown = useCallback(() => {
    targetAcquiredShownRef.current = true;
    setTargetAcquiredShown(true);
  }, []);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#050608" }}>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "#0b0d12",
            border: "1px solid rgba(0,245,255,0.2)",
            color: "#e8ecf4",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "13px",
          },
        }}
      />

      <Navbar
        isSampleData={isSampleData}
        onSettingsClick={() => setActiveTab("goals")}
      />

      <TabNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div
            className="font-orbitron font-bold text-lg tracking-widest"
            style={{ color: "#00f5ff" }}
          >
            INITIALIZING...
          </div>
          <div className="scan-bar w-64" />
          <div
            className="text-xs font-mono tracking-widest"
            style={{ color: "#4a5068" }}
          >
            LOADING TRADING DATA
          </div>
        </div>
      )}

      {/* Tab Content */}
      {!isLoading && (
        <main>
          {activeTab === "dashboard" && (
            <Dashboard
              entries={entries}
              stats={stats}
              settings={settings}
              onTargetAcquiredShown={handleTargetAcquiredShown}
              targetAcquiredShown={targetAcquiredShown}
            />
          )}
          {activeTab === "calendar" && (
            <CalendarTab entries={entries} settings={settings} />
          )}
          {activeTab === "risk" && (
            <RiskTab entries={entries} stats={stats} settings={settings} />
          )}
          {activeTab === "sessions" && (
            <SessionsTab entries={entries} stats={stats} />
          )}
          {activeTab === "journal" && (
            <JournalTab entries={entries} settings={settings} />
          )}
          {activeTab === "goals" && <GoalsTab settings={settings} />}
        </main>
      )}

      {/* Footer */}
      <footer
        className="text-center py-6 text-xs font-mono"
        style={{
          color: "#4a5068",
          borderTop: "1px solid #1a2035",
          marginTop: "40px",
        }}
      >
        © {new Date().getFullYear()}. Built with{" "}
        <span style={{ color: "#ff2d55" }}>♥</span> using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#00f5ff", textDecoration: "none" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textShadow = "0 0 8px rgba(0,245,255,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textShadow = "none";
          }}
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
