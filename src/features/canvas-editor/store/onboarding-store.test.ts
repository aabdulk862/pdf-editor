import { describe, it, expect, beforeEach } from 'vitest';

import { useOnboardingStore } from './onboarding-store';

describe('onboarding-store', () => {
  beforeEach(() => {
    useOnboardingStore.setState({
      isOnboarded: false,
      tourActive: false,
      currentStep: 0,
      totalSteps: 5,
    });
    localStorage.clear();
  });

  describe('checkOnboardingStatus', () => {
    it('sets isOnboarded to false when no localStorage flag exists', () => {
      useOnboardingStore.getState().checkOnboardingStatus();
      expect(useOnboardingStore.getState().isOnboarded).toBe(false);
    });

    it('sets isOnboarded to true when localStorage flag is "true"', () => {
      localStorage.setItem('canvas-editor-onboarded', 'true');
      useOnboardingStore.getState().checkOnboardingStatus();
      expect(useOnboardingStore.getState().isOnboarded).toBe(true);
    });
  });

  describe('startTour', () => {
    it('sets tourActive to true and currentStep to 0', () => {
      useOnboardingStore.getState().startTour();
      const state = useOnboardingStore.getState();
      expect(state.tourActive).toBe(true);
      expect(state.currentStep).toBe(0);
    });
  });

  describe('nextStep', () => {
    it('increments currentStep', () => {
      useOnboardingStore.setState({ tourActive: true, currentStep: 0 });
      useOnboardingStore.getState().nextStep();
      expect(useOnboardingStore.getState().currentStep).toBe(1);
    });

    it('calls completeTour on the last step', () => {
      useOnboardingStore.setState({ tourActive: true, currentStep: 4 });
      useOnboardingStore.getState().nextStep();
      const state = useOnboardingStore.getState();
      expect(state.tourActive).toBe(false);
      expect(state.isOnboarded).toBe(true);
    });
  });

  describe('skipTour', () => {
    it('sets tourActive to false and isOnboarded to true', () => {
      useOnboardingStore.setState({ tourActive: true, currentStep: 2 });
      useOnboardingStore.getState().skipTour();
      const state = useOnboardingStore.getState();
      expect(state.tourActive).toBe(false);
      expect(state.isOnboarded).toBe(true);
      expect(state.currentStep).toBe(0);
    });

    it('persists flag to localStorage', () => {
      useOnboardingStore.getState().skipTour();
      expect(localStorage.getItem('canvas-editor-onboarded')).toBe('true');
    });
  });

  describe('completeTour', () => {
    it('sets tourActive to false and isOnboarded to true', () => {
      useOnboardingStore.setState({ tourActive: true, currentStep: 4 });
      useOnboardingStore.getState().completeTour();
      const state = useOnboardingStore.getState();
      expect(state.tourActive).toBe(false);
      expect(state.isOnboarded).toBe(true);
    });

    it('persists flag to localStorage', () => {
      useOnboardingStore.getState().completeTour();
      expect(localStorage.getItem('canvas-editor-onboarded')).toBe('true');
    });
  });

  describe('resetTour', () => {
    it('sets tourActive to true and currentStep to 0 for replay', () => {
      useOnboardingStore.setState({ isOnboarded: true, tourActive: false, currentStep: 3 });
      useOnboardingStore.getState().resetTour();
      const state = useOnboardingStore.getState();
      expect(state.tourActive).toBe(true);
      expect(state.currentStep).toBe(0);
    });
  });
});
