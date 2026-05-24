import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useShortcutStore, buildKeyString, buildKeyStringFromEvent } from './shortcuts';
import type { ShortcutBinding, FocusContext } from '../features/shortcuts/types';

function createBinding(overrides: Partial<ShortcutBinding> = {}): ShortcutBinding {
  return {
    id: 'test-binding',
    keys: { key: 'k', ctrl: true },
    action: () => {},
    label: 'Test Binding',
    category: 'application',
    scope: 'global',
    bypassInputFocus: false,
    ...overrides,
  };
}

function createKeyboardEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: 'k',
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...overrides,
  } as unknown as KeyboardEvent;
}

describe('Shortcut Store', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useShortcutStore.setState({ bindings: new Map() });
  });

  describe('buildKeyString', () => {
    it('should build a key string with ctrl modifier', () => {
      expect(buildKeyString({ key: 'k', ctrl: true })).toBe('ctrl+k');
    });

    it('should build a key string with multiple modifiers in consistent order', () => {
      expect(buildKeyString({ key: 's', ctrl: true, shift: true, alt: true, meta: true })).toBe(
        'ctrl+alt+shift+meta+s',
      );
    });

    it('should lowercase the key', () => {
      expect(buildKeyString({ key: 'K', ctrl: true })).toBe('ctrl+k');
    });

    it('should handle key-only (no modifiers)', () => {
      expect(buildKeyString({ key: 'escape' })).toBe('escape');
    });
  });

  describe('buildKeyStringFromEvent', () => {
    it('should build a key string from a keyboard event', () => {
      const event = createKeyboardEvent({ key: 'k', ctrlKey: true });
      expect(buildKeyStringFromEvent(event)).toBe('ctrl+k');
    });

    it('should handle multiple modifiers', () => {
      const event = createKeyboardEvent({
        key: 's',
        ctrlKey: true,
        shiftKey: true,
      });
      expect(buildKeyStringFromEvent(event)).toBe('ctrl+shift+s');
    });
  });

  describe('register', () => {
    it('should add a binding to the map', () => {
      const binding = createBinding({ id: 'my-shortcut' });
      useShortcutStore.getState().register(binding);

      const { bindings } = useShortcutStore.getState();
      expect(bindings.has('my-shortcut')).toBe(true);
      expect(bindings.get('my-shortcut')).toEqual(binding);
    });

    it('should overwrite an existing binding with the same id', () => {
      const binding1 = createBinding({ id: 'dup', label: 'First' });
      const binding2 = createBinding({ id: 'dup', label: 'Second' });

      useShortcutStore.getState().register(binding1);
      useShortcutStore.getState().register(binding2);

      const { bindings } = useShortcutStore.getState();
      expect(bindings.size).toBe(1);
      expect(bindings.get('dup')!.label).toBe('Second');
    });

    it('should log a warning when overwriting', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const binding1 = createBinding({ id: 'dup' });
      const binding2 = createBinding({ id: 'dup' });

      useShortcutStore.getState().register(binding1);
      useShortcutStore.getState().register(binding2);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting existing shortcut binding: "dup"'),
      );
      warnSpy.mockRestore();
    });
  });

  describe('unregister', () => {
    it('should remove a binding from the map', () => {
      const binding = createBinding({ id: 'to-remove' });
      useShortcutStore.getState().register(binding);
      useShortcutStore.getState().unregister('to-remove');

      const { bindings } = useShortcutStore.getState();
      expect(bindings.has('to-remove')).toBe(false);
    });

    it('should do nothing if the id does not exist', () => {
      useShortcutStore.getState().unregister('nonexistent');
      const { bindings } = useShortcutStore.getState();
      expect(bindings.size).toBe(0);
    });
  });

  describe('resolve', () => {
    it('should return null when no bindings match the event', () => {
      const binding = createBinding({ keys: { key: 'k', ctrl: true } });
      useShortcutStore.getState().register(binding);

      const event = createKeyboardEvent({ key: 'j', ctrlKey: true });
      const context: FocusContext = { isTextInput: false, activeScope: 'global' };

      const result = useShortcutStore.getState().resolve(event, context);
      expect(result).toBeNull();
    });

    it('should return the matching binding for a key combo', () => {
      const binding = createBinding({ id: 'ctrl-k', keys: { key: 'k', ctrl: true } });
      useShortcutStore.getState().register(binding);

      const event = createKeyboardEvent({ key: 'k', ctrlKey: true });
      const context: FocusContext = { isTextInput: false, activeScope: 'global' };

      const result = useShortcutStore.getState().resolve(event, context);
      expect(result).toEqual(binding);
    });

    it('should suppress shortcuts when text input is focused and bypassInputFocus is false', () => {
      const binding = createBinding({
        id: 'nav-shortcut',
        keys: { key: 'k', ctrl: true },
        bypassInputFocus: false,
      });
      useShortcutStore.getState().register(binding);

      const event = createKeyboardEvent({ key: 'k', ctrlKey: true });
      const context: FocusContext = { isTextInput: true, activeScope: 'global' };

      const result = useShortcutStore.getState().resolve(event, context);
      expect(result).toBeNull();
    });

    it('should allow shortcuts when text input is focused and bypassInputFocus is true', () => {
      const binding = createBinding({
        id: 'palette-open',
        keys: { key: 'k', ctrl: true },
        bypassInputFocus: true,
      });
      useShortcutStore.getState().register(binding);

      const event = createKeyboardEvent({ key: 'k', ctrlKey: true });
      const context: FocusContext = { isTextInput: true, activeScope: 'global' };

      const result = useShortcutStore.getState().resolve(event, context);
      expect(result).toEqual(binding);
    });

    it('should prioritize most specific scope (modal > panel > global)', () => {
      const globalBinding = createBinding({
        id: 'global-esc',
        keys: { key: 'escape' },
        scope: 'global',
        label: 'Global Escape',
      });
      const modalBinding = createBinding({
        id: 'modal-esc',
        keys: { key: 'escape' },
        scope: 'modal',
        label: 'Modal Escape',
      });

      useShortcutStore.getState().register(globalBinding);
      useShortcutStore.getState().register(modalBinding);

      const event = createKeyboardEvent({ key: 'escape' });
      const context: FocusContext = { isTextInput: false, activeScope: 'modal' };

      const result = useShortcutStore.getState().resolve(event, context);
      expect(result!.id).toBe('modal-esc');
    });

    it('should not match a modal-scoped binding when active scope is global', () => {
      const modalBinding = createBinding({
        id: 'modal-only',
        keys: { key: 'escape' },
        scope: 'modal',
      });

      useShortcutStore.getState().register(modalBinding);

      const event = createKeyboardEvent({ key: 'escape' });
      const context: FocusContext = { isTextInput: false, activeScope: 'global' };

      const result = useShortcutStore.getState().resolve(event, context);
      expect(result).toBeNull();
    });

    it('should match a global-scoped binding when active scope is modal', () => {
      const globalBinding = createBinding({
        id: 'global-shortcut',
        keys: { key: 'k', ctrl: true },
        scope: 'global',
      });

      useShortcutStore.getState().register(globalBinding);

      const event = createKeyboardEvent({ key: 'k', ctrlKey: true });
      const context: FocusContext = { isTextInput: false, activeScope: 'modal' };

      const result = useShortcutStore.getState().resolve(event, context);
      expect(result!.id).toBe('global-shortcut');
    });

    it('should pick panel over global when active scope is panel', () => {
      const globalBinding = createBinding({
        id: 'global-action',
        keys: { key: 'k', ctrl: true },
        scope: 'global',
        label: 'Global',
      });
      const panelBinding = createBinding({
        id: 'panel-action',
        keys: { key: 'k', ctrl: true },
        scope: 'panel',
        label: 'Panel',
      });

      useShortcutStore.getState().register(globalBinding);
      useShortcutStore.getState().register(panelBinding);

      const event = createKeyboardEvent({ key: 'k', ctrlKey: true });
      const context: FocusContext = { isTextInput: false, activeScope: 'panel' };

      const result = useShortcutStore.getState().resolve(event, context);
      expect(result!.id).toBe('panel-action');
    });

    it('should not match a panel-scoped binding when active scope is global', () => {
      const panelBinding = createBinding({
        id: 'panel-only',
        keys: { key: 'p', ctrl: true },
        scope: 'panel',
      });

      useShortcutStore.getState().register(panelBinding);

      const event = createKeyboardEvent({ key: 'p', ctrlKey: true });
      const context: FocusContext = { isTextInput: false, activeScope: 'global' };

      const result = useShortcutStore.getState().resolve(event, context);
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all bindings as an array', () => {
      const binding1 = createBinding({ id: 'a' });
      const binding2 = createBinding({ id: 'b' });

      useShortcutStore.getState().register(binding1);
      useShortcutStore.getState().register(binding2);

      const all = useShortcutStore.getState().getAll();
      expect(all).toHaveLength(2);
      expect(all.map((b) => b.id).sort()).toEqual(['a', 'b']);
    });

    it('should return empty array when no bindings registered', () => {
      const all = useShortcutStore.getState().getAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('getByCategory', () => {
    it('should filter bindings by category', () => {
      const navBinding = createBinding({ id: 'nav', category: 'navigation' });
      const appBinding = createBinding({ id: 'app', category: 'application' });
      const opsBinding = createBinding({ id: 'ops', category: 'operations' });

      useShortcutStore.getState().register(navBinding);
      useShortcutStore.getState().register(appBinding);
      useShortcutStore.getState().register(opsBinding);

      const navResults = useShortcutStore.getState().getByCategory('navigation');
      expect(navResults).toHaveLength(1);
      expect(navResults[0].id).toBe('nav');

      const appResults = useShortcutStore.getState().getByCategory('application');
      expect(appResults).toHaveLength(1);
      expect(appResults[0].id).toBe('app');
    });

    it('should return empty array when no bindings match the category', () => {
      const binding = createBinding({ id: 'nav', category: 'navigation' });
      useShortcutStore.getState().register(binding);

      const results = useShortcutStore.getState().getByCategory('operations');
      expect(results).toHaveLength(0);
    });
  });
});
