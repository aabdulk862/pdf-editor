import { describe, it, expect, beforeEach } from 'vitest';

import { useOnboardingStore } from './useOnboardingStore';

describe('useOnboardingStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useOnboardingStore.setState({
      welcomeDismissed: false,
      sessionCount: 0,
      firstSuccessShown: false,
      hintsDismissed: {},
      cmdKUsed: false,
    });
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useOnboardingStore.getState();
      expect(state.welcomeDismissed).toBe(false);
      expect(state.sessionCount).toBe(0);
      expect(state.firstSuccessShown).toBe(false);
      expect(state.hintsDismissed).toEqual({});
      expect(state.cmdKUsed).toBe(false);
    });
  });

  describe('dismissWelcome', () => {
    it('sets welcomeDismissed to true', () => {
      useOnboardingStore.getState().dismissWelcome();
      expect(useOnboardingStore.getState().welcomeDismissed).toBe(true);
    });

    it('persists to localStorage', () => {
      useOnboardingStore.getState().dismissWelcome();
      const stored = JSON.parse(localStorage.getItem('pdf-editor-onboarding') || '{}');
      expect(stored.state.welcomeDismissed).toBe(true);
    });
  });

  describe('incrementSession', () => {
    it('increments sessionCount by 1', () => {
      useOnboardingStore.getState().incrementSession();
      expect(useOnboardingStore.getState().sessionCount).toBe(1);
    });

    it('increments multiple times', () => {
      useOnboardingStore.getState().incrementSession();
      useOnboardingStore.getState().incrementSession();
      useOnboardingStore.getState().incrementSession();
      expect(useOnboardingStore.getState().sessionCount).toBe(3);
    });

    it('persists to localStorage', () => {
      useOnboardingStore.getState().incrementSession();
      useOnboardingStore.getState().incrementSession();
      const stored = JSON.parse(localStorage.getItem('pdf-editor-onboarding') || '{}');
      expect(stored.state.sessionCount).toBe(2);
    });
  });

  describe('markFirstSuccess', () => {
    it('sets firstSuccessShown to true', () => {
      useOnboardingStore.getState().markFirstSuccess();
      expect(useOnboardingStore.getState().firstSuccessShown).toBe(true);
    });

    it('persists to localStorage', () => {
      useOnboardingStore.getState().markFirstSuccess();
      const stored = JSON.parse(localStorage.getItem('pdf-editor-onboarding') || '{}');
      expect(stored.state.firstSuccessShown).toBe(true);
    });
  });

  describe('dismissHint', () => {
    it('marks a specific hint as dismissed', () => {
      useOnboardingStore.getState().dismissHint('cmd-k-hint');
      expect(useOnboardingStore.getState().hintsDismissed['cmd-k-hint']).toBe(true);
    });

    it('can dismiss multiple hints independently', () => {
      useOnboardingStore.getState().dismissHint('cmd-k-hint');
      useOnboardingStore.getState().dismissHint('shortcut-hint');
      const state = useOnboardingStore.getState();
      expect(state.hintsDismissed['cmd-k-hint']).toBe(true);
      expect(state.hintsDismissed['shortcut-hint']).toBe(true);
    });

    it('persists to localStorage', () => {
      useOnboardingStore.getState().dismissHint('cmd-k-hint');
      const stored = JSON.parse(localStorage.getItem('pdf-editor-onboarding') || '{}');
      expect(stored.state.hintsDismissed['cmd-k-hint']).toBe(true);
    });
  });

  describe('markCmdKUsed', () => {
    it('sets cmdKUsed to true', () => {
      useOnboardingStore.getState().markCmdKUsed();
      expect(useOnboardingStore.getState().cmdKUsed).toBe(true);
    });

    it('persists to localStorage', () => {
      useOnboardingStore.getState().markCmdKUsed();
      const stored = JSON.parse(localStorage.getItem('pdf-editor-onboarding') || '{}');
      expect(stored.state.cmdKUsed).toBe(true);
    });
  });

  describe('localStorage persistence', () => {
    it('restores state from localStorage on rehydration', () => {
      const persistedState = {
        state: {
          welcomeDismissed: true,
          sessionCount: 5,
          firstSuccessShown: true,
          hintsDismissed: { 'cmd-k-hint': true },
          cmdKUsed: true,
        },
        version: 0,
      };
      localStorage.setItem('pdf-editor-onboarding', JSON.stringify(persistedState));

      // Trigger rehydration
      useOnboardingStore.persist.rehydrate();

      const state = useOnboardingStore.getState();
      expect(state.welcomeDismissed).toBe(true);
      expect(state.sessionCount).toBe(5);
      expect(state.firstSuccessShown).toBe(true);
      expect(state.hintsDismissed).toEqual({ 'cmd-k-hint': true });
      expect(state.cmdKUsed).toBe(true);
    });
  });
});
