import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

import { useToolbarStore } from './toolbar';

describe('useToolbarStore', () => {
  beforeEach(() => {
    useToolbarStore.setState({ registrations: [], slots: [] });
  });

  it('starts with no registrations', () => {
    const state = useToolbarStore.getState();
    expect(state.registrations).toHaveLength(0);
    expect(state.slots).toHaveLength(0);
  });

  it('registers slots under a key', () => {
    const { register } = useToolbarStore.getState();

    register('tool-1', [
      { id: 'btn-a', position: 'center', component: React.createElement('button', null, 'A') },
    ]);

    const state = useToolbarStore.getState();
    expect(state.registrations).toHaveLength(1);
    expect(state.registrations[0].key).toBe('tool-1');
    expect(state.slots).toHaveLength(1);
    expect(state.slots[0].id).toBe('btn-a');
  });

  it('unregisters slots by key', () => {
    const { register, unregister } = useToolbarStore.getState();

    register('tool-1', [
      { id: 'btn-a', position: 'center', component: React.createElement('button', null, 'A') },
    ]);

    unregister('tool-1');

    const state = useToolbarStore.getState();
    expect(state.registrations).toHaveLength(0);
    expect(state.slots).toHaveLength(0);
  });

  it('replaces existing registration when same key is used', () => {
    const { register } = useToolbarStore.getState();

    register('tool-1', [
      { id: 'btn-a', position: 'center', component: React.createElement('button', null, 'A') },
    ]);

    register('tool-1', [
      { id: 'btn-b', position: 'right', component: React.createElement('button', null, 'B') },
    ]);

    const state = useToolbarStore.getState();
    expect(state.registrations).toHaveLength(1);
    expect(state.slots).toHaveLength(1);
    expect(state.slots[0].id).toBe('btn-b');
  });

  it('supports multiple registrations from different keys', () => {
    const { register } = useToolbarStore.getState();

    register('tool-1', [
      { id: 'btn-a', position: 'center', component: React.createElement('button', null, 'A') },
    ]);

    register('tool-2', [
      { id: 'btn-b', position: 'right', component: React.createElement('button', null, 'B') },
      { id: 'btn-c', position: 'left', component: React.createElement('button', null, 'C') },
    ]);

    const state = useToolbarStore.getState();
    expect(state.registrations).toHaveLength(2);
    expect(state.slots).toHaveLength(3);
  });

  it('slots flattens all registrations into a single array', () => {
    const { register } = useToolbarStore.getState();

    register('tool-1', [
      { id: 'a', position: 'left', component: React.createElement('span', null, 'A') },
      { id: 'b', position: 'center', component: React.createElement('span', null, 'B') },
    ]);

    register('tool-2', [
      { id: 'c', position: 'right', component: React.createElement('span', null, 'C') },
    ]);

    const { slots } = useToolbarStore.getState();
    expect(slots.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('unregistering a non-existent key is a no-op', () => {
    const { register, unregister } = useToolbarStore.getState();

    register('tool-1', [
      { id: 'btn-a', position: 'center', component: React.createElement('button', null, 'A') },
    ]);

    unregister('non-existent');

    const state = useToolbarStore.getState();
    expect(state.registrations).toHaveLength(1);
    expect(state.slots).toHaveLength(1);
  });
});
