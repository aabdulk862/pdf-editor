import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

import { useToolbarStore } from '../store/toolbar';
import { useToolbar } from './useToolbar';
import type { ToolbarSlot } from '../app/Toolbar';

// Helper component that uses the hook
function TestToolComponent({ controls }: { controls: ToolbarSlot[] }) {
  useToolbar(controls);
  return <div data-testid="test-tool">Tool Content</div>;
}

describe('useToolbar', () => {
  beforeEach(() => {
    // Reset the store between tests
    act(() => {
      useToolbarStore.setState({ registrations: [], slots: [] });
    });
  });

  it('registers toolbar slots on mount', () => {
    const controls: ToolbarSlot[] = [
      { id: 'rotate-cw', position: 'center', component: <button>Rotate CW</button> },
    ];

    render(<TestToolComponent controls={controls} />);

    const { slots } = useToolbarStore.getState();
    expect(slots).toHaveLength(1);
    expect(slots[0].id).toBe('rotate-cw');
    expect(slots[0].position).toBe('center');
  });

  it('unregisters toolbar slots on unmount', () => {
    const controls: ToolbarSlot[] = [
      { id: 'rotate-cw', position: 'center', component: <button>Rotate CW</button> },
    ];

    const { unmount } = render(<TestToolComponent controls={controls} />);

    expect(useToolbarStore.getState().slots).toHaveLength(1);

    unmount();

    expect(useToolbarStore.getState().slots).toHaveLength(0);
  });

  it('supports multiple components registering slots simultaneously', () => {
    const controlsA: ToolbarSlot[] = [
      { id: 'tool-a', position: 'center', component: <button>A</button> },
    ];
    const controlsB: ToolbarSlot[] = [
      { id: 'tool-b', position: 'right', component: <button>B</button> },
    ];

    render(
      <>
        <TestToolComponent controls={controlsA} />
        <TestToolComponent controls={controlsB} />
      </>,
    );

    const { slots } = useToolbarStore.getState();
    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.id)).toContain('tool-a');
    expect(slots.map((s) => s.id)).toContain('tool-b');
  });

  it('cleans up only its own slots when one component unmounts', () => {
    const controlsA: ToolbarSlot[] = [
      { id: 'tool-a', position: 'center', component: <button>A</button> },
    ];
    const controlsB: ToolbarSlot[] = [
      { id: 'tool-b', position: 'right', component: <button>B</button> },
    ];

    function Wrapper({ showA }: { showA: boolean }) {
      return (
        <>
          {showA && <TestToolComponent controls={controlsA} />}
          <TestToolComponent controls={controlsB} />
        </>
      );
    }

    const { rerender } = render(<Wrapper showA={true} />);

    expect(useToolbarStore.getState().slots).toHaveLength(2);

    rerender(<Wrapper showA={false} />);

    const { slots } = useToolbarStore.getState();
    expect(slots).toHaveLength(1);
    expect(slots[0].id).toBe('tool-b');
  });

  it('registers multiple slots from a single component', () => {
    const controls: ToolbarSlot[] = [
      { id: 'rotate-cw', position: 'center', component: <button>CW</button> },
      { id: 'rotate-ccw', position: 'center', component: <button>CCW</button> },
      { id: 'download', position: 'right', component: <button>Download</button> },
    ];

    render(<TestToolComponent controls={controls} />);

    const { slots } = useToolbarStore.getState();
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.id)).toEqual(['rotate-cw', 'rotate-ccw', 'download']);
  });
});
