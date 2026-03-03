import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserSettings {
    oandaAccountId: string;
    dailyGoal: number;
    oandaApiKey: string;
    trackedPairs: Array<string>;
    ddLimit: number;
    oandaEnv: string;
    weeklyGoal: number;
    lastSync: bigint;
}
export interface DayEntry {
    rr: number;
    eurusdPct: number;
    gbpjpyPct: number;
    source: string;
    gbpusdPct: number;
    date: string;
    trades: bigint;
    note: string;
    pnlPct: number;
    asiaPct: number;
    us30Pct: number;
    usdjpyPct: number;
    nyPct: number;
    psych: bigint;
    xauusdPct: number;
    londonPct: number;
    commissions: number;
    riskPct: number;
    slippage: number;
}
export interface backendInterface {
    addOrUpdateDayEntry(newDayEntry: DayEntry): Promise<void>;
    deleteDayEntry(date: string): Promise<boolean>;
    getAllDayEntries(): Promise<Array<DayEntry>>;
    getDayEntry(date: string): Promise<DayEntry>;
    getSettings(): Promise<UserSettings>;
    saveSettings(newSettings: UserSettings): Promise<void>;
}
