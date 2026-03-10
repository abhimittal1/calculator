import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HapticService } from '@/services/HapticService';
import { SoundService } from '@/services/SoundService';

export interface SettingsState {
  isDark: boolean;
  hapticEnabled: boolean;
  soundEnabled: boolean;
  saveHistory: boolean;
}

export interface SettingsActions {
  toggleDark: () => void;
  toggleHaptic: () => void;
  toggleSound: () => void;
  toggleSaveHistory: () => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      isDark: false,
      hapticEnabled: true,
      soundEnabled: true,
      saveHistory: true,

      toggleDark: () => set(s => ({ isDark: !s.isDark })),

      toggleHaptic: () => {
        const next = !get().hapticEnabled;
        HapticService.enabled = next;
        set({ hapticEnabled: next });
      },

      toggleSound: () => {
        const next = !get().soundEnabled;
        SoundService.enabled = next;
        set({ soundEnabled: next });
      },

      toggleSaveHistory: () => set(s => ({ saveHistory: !s.saveHistory })),
    }),
    {
      name: '@calculator/settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Sync side-effect singletons after rehydration
      onRehydrateStorage: () => state => {
        if (state) {
          HapticService.enabled = state.hapticEnabled;
          SoundService.enabled = state.soundEnabled;
        }
      },
    },
  ),
);
