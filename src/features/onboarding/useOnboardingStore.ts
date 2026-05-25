import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const STORAGE_KEY = 'pdf-editor-onboarding';

export interface OnboardingState {
  welcomeDismissed: boolean;
  sessionCount: number;
  firstSuccessShown: boolean;
  hintsDismissed: Record<string, boolean>;
  cmdKUsed: boolean;
  dismissWelcome: () => void;
  incrementSession: () => void;
  markFirstSuccess: () => void;
  dismissHint: (hintId: string) => void;
  markCmdKUsed: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    immer((set) => ({
      welcomeDismissed: false,
      sessionCount: 0,
      firstSuccessShown: false,
      hintsDismissed: {},
      cmdKUsed: false,

      dismissWelcome: () => {
        set((state) => {
          state.welcomeDismissed = true;
        });
      },

      incrementSession: () => {
        set((state) => {
          state.sessionCount += 1;
        });
      },

      markFirstSuccess: () => {
        set((state) => {
          state.firstSuccessShown = true;
        });
      },

      dismissHint: (hintId: string) => {
        set((state) => {
          state.hintsDismissed[hintId] = true;
        });
      },

      markCmdKUsed: () => {
        set((state) => {
          state.cmdKUsed = true;
        });
      },
    })),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        welcomeDismissed: state.welcomeDismissed,
        sessionCount: state.sessionCount,
        firstSuccessShown: state.firstSuccessShown,
        hintsDismissed: state.hintsDismissed,
        cmdKUsed: state.cmdKUsed,
      }),
    },
  ),
);
