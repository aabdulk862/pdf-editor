import { create } from 'zustand';

const ONBOARDING_KEY = 'canvas-editor-onboarded';

export interface OnboardingStoreState {
  isOnboarded: boolean;
  tourActive: boolean;
  currentStep: number;
  totalSteps: number;
}

export interface OnboardingStoreActions {
  checkOnboardingStatus(): void;
  startTour(): void;
  nextStep(): void;
  skipTour(): void;
  completeTour(): void;
  resetTour(): void;
}

export const useOnboardingStore = create<OnboardingStoreState & OnboardingStoreActions>()(
  (set, get) => ({
    isOnboarded: false,
    tourActive: false,
    currentStep: 0,
    totalSteps: 5,

    checkOnboardingStatus() {
      try {
        const value = localStorage.getItem(ONBOARDING_KEY);
        set({ isOnboarded: value === 'true' });
      } catch {
        // localStorage unavailable — treat as not onboarded
        set({ isOnboarded: false });
      }
    },

    startTour() {
      set({ tourActive: true, currentStep: 0 });
    },

    nextStep() {
      const { currentStep, totalSteps } = get();
      if (currentStep < totalSteps - 1) {
        set({ currentStep: currentStep + 1 });
      } else {
        // Final step — complete the tour
        get().completeTour();
      }
    },

    skipTour() {
      try {
        localStorage.setItem(ONBOARDING_KEY, 'true');
      } catch {
        // localStorage unavailable — silently continue
      }
      set({ tourActive: false, isOnboarded: true, currentStep: 0 });
    },

    completeTour() {
      try {
        localStorage.setItem(ONBOARDING_KEY, 'true');
      } catch {
        // localStorage unavailable — silently continue
      }
      set({ tourActive: false, isOnboarded: true, currentStep: 0 });
    },

    resetTour() {
      set({ tourActive: true, currentStep: 0 });
    },
  }),
);
