import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { describe, beforeEach, expect } from 'vitest';
import { useShortcutStore, buildKeyString, buildKeyStringFromEvent } from '../../store/shortcuts';
import type { ShortcutBinding, ShortcutKeys, ShortcutScope, FocusContext } from './types';

/**
 * Feature: ux-power-user-features
 * Property 3: Shortcut resolution with context
 *
 * For any registered shortcut and any focus context, the shortcut should be
 * dispatched if and only if: (a) it has bypassInputFocus: true OR the focus
 * context is not a text input, AND (b) among all bindings matching the key
 * combination, the one with the most specific scope matching the active scope wins.
 *
 * Validates: Requirements 3.4, 3.5
 */

const SCOPES: ShortcutScope[] = ['global', 'panel', 'modal'];
const SCOPE_PRIORITY: Record<ShortcutScope, number> = {
  global: 0,
  panel: 1,
  modal: 2,
};

const KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'k', 's', 'z', '1', '2', '3'];

// Arbitrary for ShortcutKeys
const arbShortcutKeys: fc.Arbitrary<ShortcutKeys> = fc.record({
  key: fc.constantFrom(...KEYS),
  ctrl: fc.boolean(),
  meta: fc.boolean(),
  shift: fc.boolean(),
  alt: fc.boolean(),
});

// Arbitrary for ShortcutBinding
const arbBinding = (id: string): fc.Arbitrary<ShortcutBinding> =>
  fc.record({
    id: fc.constant(id),
    keys: arbShortcutKeys,
    action: fc.constant(() => {}),
    label: fc.string({ minLength: 1, maxLength: 20 }),
    category: fc.constantFrom('navigation' as const, 'operations' as const, 'application' as const),
    scope: fc.constantFrom(...SCOPES),
    bypassInputFocus: fc.boolean(),
  });

// Arbitrary for FocusContext
const arbFocusContext: fc.Arbitrary<FocusContext> = fc.record({
  isTextInput: fc.boolean(),
  activeScope: fc.constantFrom(...SCOPES),
});

// Create a mock KeyboardEvent from ShortcutKeys
function createMockKeyboardEvent(keys: ShortcutKeys): KeyboardEvent {
  return {
    key: keys.key,
    ctrlKey: keys.ctrl ?? false,
    altKey: keys.alt ?? false,
    shiftKey: keys.shift ?? false,
    metaKey: keys.meta ?? false,
    preventDefault: () => {},
    stopPropagation: () => {},
  } as unknown as KeyboardEvent;
}

describe('Feature: ux-power-user-features, Property 3: Shortcut resolution with context', () => {
  beforeEach(() => {
    // Reset the store before each test
    useShortcutStore.setState({ bindings: new Map() });
  });

  test.prop(
    [
      // Generate 1-5 bindings with unique IDs
      fc
        .integer({ min: 1, max: 5 })
        .chain((count) =>
          fc.tuple(...Array.from({ length: count }, (_, i) => arbBinding(`binding-${i}`))),
        ),
      arbFocusContext,
    ],
    { numRuns: 100 },
  )(
    'shortcuts are dispatched iff (bypassInputFocus OR not text input) AND most specific matching scope wins',
    (bindings, focusContext) => {
      // Reset store for each iteration to avoid leaking bindings from previous runs
      useShortcutStore.setState({ bindings: new Map() });

      // Register all bindings
      const store = useShortcutStore.getState();
      for (const binding of bindings) {
        store.register(binding);
      }

      // For each unique key combination among the bindings, test resolution
      const keyStrings = new Set(bindings.map((b) => buildKeyString(b.keys)));

      for (const keyStr of keyStrings) {
        // Find all bindings matching this key combination
        const matchingBindings = bindings.filter((b) => buildKeyString(b.keys) === keyStr);

        // Create a mock event from the first matching binding's keys
        const event = createMockKeyboardEvent(matchingBindings[0].keys);

        // Verify buildKeyStringFromEvent produces the same key string
        const eventKeyStr = buildKeyStringFromEvent(event);
        if (eventKeyStr !== keyStr) {
          // Skip if the mock event doesn't round-trip correctly
          continue;
        }

        // Get the resolution result
        const resolved = useShortcutStore.getState().resolve(event, focusContext);

        // Step 1: Filter by text input focus rule
        // A binding passes if: bypassInputFocus is true OR focus is not a text input
        const filteredByFocus = matchingBindings.filter((b) => {
          if (focusContext.isTextInput && !b.bypassInputFocus) {
            return false;
          }
          return true;
        });

        if (filteredByFocus.length === 0) {
          // No binding should be resolved
          expect(resolved).toBeNull();
          continue;
        }

        // Step 2: Filter by scope - only bindings whose scope priority <= active scope priority
        const activeScopePriority = SCOPE_PRIORITY[focusContext.activeScope];
        const scopeValidBindings = filteredByFocus.filter(
          (b) => SCOPE_PRIORITY[b.scope] <= activeScopePriority,
        );

        if (scopeValidBindings.length === 0) {
          // No binding should be resolved
          expect(resolved).toBeNull();
          continue;
        }

        // Step 3: Among valid bindings, the most specific scope wins
        let expectedBinding = scopeValidBindings[0];
        for (let i = 1; i < scopeValidBindings.length; i++) {
          if (SCOPE_PRIORITY[scopeValidBindings[i].scope] > SCOPE_PRIORITY[expectedBinding.scope]) {
            expectedBinding = scopeValidBindings[i];
          }
        }

        // The resolved binding should match the expected one
        expect(resolved).not.toBeNull();
        expect(resolved!.id).toBe(expectedBinding.id);
        expect(resolved!.scope).toBe(expectedBinding.scope);
      }
    },
  );

  test.prop([arbBinding('single-binding'), arbFocusContext], { numRuns: 100 })(
    'a single binding is suppressed when text input is focused and bypassInputFocus is false',
    (binding, focusContext) => {
      // Reset store for each iteration
      useShortcutStore.setState({ bindings: new Map() });

      const store = useShortcutStore.getState();
      store.register(binding);

      const event = createMockKeyboardEvent(binding.keys);
      const resolved = useShortcutStore.getState().resolve(event, focusContext);

      if (focusContext.isTextInput && !binding.bypassInputFocus) {
        // Should be suppressed
        expect(resolved).toBeNull();
      } else {
        // Should resolve if scope is valid
        const activeScopePriority = SCOPE_PRIORITY[focusContext.activeScope];
        if (SCOPE_PRIORITY[binding.scope] <= activeScopePriority) {
          expect(resolved).not.toBeNull();
          expect(resolved!.id).toBe(binding.id);
        } else {
          expect(resolved).toBeNull();
        }
      }
    },
  );

  test.prop(
    [
      // Generate 2-4 bindings with the SAME key combination but different scopes
      fc.constantFrom(...SCOPES).chain((activeScope) =>
        fc.tuple(
          arbShortcutKeys,
          fc.constant(activeScope),
          fc.boolean(), // isTextInput
        ),
      ),
    ],
    { numRuns: 100 },
  )(
    'among multiple bindings with same keys, most specific scope matching active scope wins',
    ([sharedKeys, activeScope, isTextInput]) => {
      // Reset store for each iteration
      useShortcutStore.setState({ bindings: new Map() });

      const store = useShortcutStore.getState();

      // Register one binding per scope, all with bypassInputFocus: true to isolate scope logic
      const registeredBindings: ShortcutBinding[] = SCOPES.map((scope, i) => ({
        id: `scope-${scope}-${i}`,
        keys: sharedKeys,
        action: () => {},
        label: `Binding ${scope}`,
        category: 'application' as const,
        scope,
        bypassInputFocus: true, // bypass focus to isolate scope testing
      }));

      for (const b of registeredBindings) {
        store.register(b);
      }

      const focusContext: FocusContext = { isTextInput, activeScope };
      const event = createMockKeyboardEvent(sharedKeys);
      const resolved = useShortcutStore.getState().resolve(event, focusContext);

      // Expected: the binding with the highest scope priority that is <= activeScope priority
      const activeScopePriority = SCOPE_PRIORITY[activeScope];
      const validBindings = registeredBindings.filter(
        (b) => SCOPE_PRIORITY[b.scope] <= activeScopePriority,
      );

      if (validBindings.length === 0) {
        expect(resolved).toBeNull();
      } else {
        let expected = validBindings[0];
        for (const b of validBindings) {
          if (SCOPE_PRIORITY[b.scope] > SCOPE_PRIORITY[expected.scope]) {
            expected = b;
          }
        }
        expect(resolved).not.toBeNull();
        expect(resolved!.id).toBe(expected.id);
        expect(resolved!.scope).toBe(expected.scope);
      }
    },
  );
});
