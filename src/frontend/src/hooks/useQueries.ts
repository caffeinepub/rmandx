import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DayEntry, UserSettings } from "../backend.d";
import { DEFAULT_SETTINGS, SAMPLE_DATA } from "../utils/sampleData";
import { useActor } from "./useActor";

export function useAllEntries() {
  const { actor, isFetching } = useActor();
  return useQuery<DayEntry[]>({
    queryKey: ["allEntries"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const result = await actor.getAllDayEntries();
        if (result.length === 0) return SAMPLE_DATA;
        return result;
      } catch {
        return SAMPLE_DATA;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<UserSettings>({
    queryKey: ["settings"],
    queryFn: async () => {
      if (!actor) return DEFAULT_SETTINGS;
      try {
        const s = await actor.getSettings();
        // If settings look uninitialized, return defaults
        if (!s || (s.weeklyGoal === 0 && s.dailyGoal === 0))
          return DEFAULT_SETTINGS;
        return s;
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useSaveDayEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: DayEntry) => {
      if (!actor) throw new Error("Not connected");
      await actor.addOrUpdateDayEntry(entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEntries"] });
    },
  });
}

export function useDeleteDayEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      if (!actor) throw new Error("Not connected");
      await actor.deleteDayEntry(date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEntries"] });
    },
  });
}

export function useSaveSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      if (!actor) throw new Error("Not connected");
      await actor.saveSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
