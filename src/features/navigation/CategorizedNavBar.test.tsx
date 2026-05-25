import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNavStore } from './store/nav-store';
import { CategorizedNavBar } from './CategorizedNavBar';

/**
 * Integration tests for CategorizedNavBar roving tabindex keyboard navigation.
 *
 * Validates: Requirements 2 (Navigation and Tool Discovery), 10.2 (Keyboard Navigation)
 *
 * The roving tabindex pattern ensures:
 * - Only one item has tabindex="0" (the focused one), all others have tabindex="-1"
 * - Arrow Up/Down moves focus between items
 * - Home moves focus to first item
 * - End moves focus to last item
 * - Enter/Space activates (navigates to) the focused item
 *
 * Note: CategorizedNavBar renders both desktop and mobile versions simultaneously.
 * In jsdom, both are in the DOM. The useRovingTabindex hook's refs get registered
 * by the last-rendered version (mobile), so we test against the mobile tool group
 * for focus assertions. The tabindex attributes are shared via the same hook state.
 */

function renderNavBar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <CategorizedNavBar />
    </MemoryRouter>,
  );
}

/**
 * Get the mobile tool group (last rendered, has active refs) and its tool links.
 * Both desktop and mobile share the same hook state, so tabindex values are consistent.
 */
function getListboxAndLinks() {
  const groups = screen.getAllByRole('group', { name: 'PDF Tools' });
  // Use the last group (mobile version) since it has the active refs
  const listbox = groups[groups.length - 1];
  const links = Array.from(listbox.querySelectorAll('a[tabindex]')) as HTMLElement[];
  return { listbox, links };
}

describe('CategorizedNavBar - Roving Tabindex Keyboard Navigation', () => {
  beforeEach(() => {
    // Reset nav store to default state (no favorites, no recents, no collapsed categories)
    useNavStore.setState({
      favorites: [],
      recentTools: [],
      collapsedCategories: {},
      sidebarCollapsed: false,
      filterQuery: '',
      usageCounts: {},
    });
  });

  it('renders the tool list with role="group" and aria-label', () => {
    renderNavBar();

    const groups = screen.getAllByRole('group', { name: 'PDF Tools' });
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });

  it('sets tabindex="0" on the first tool link and tabindex="-1" on others', () => {
    renderNavBar();

    const { links } = getListboxAndLinks();
    expect(links.length).toBeGreaterThan(1);

    // First navigable tool should have tabindex=0
    expect(links[0]).toHaveAttribute('tabindex', '0');
    // All others should have tabindex=-1
    for (let i = 1; i < links.length; i++) {
      expect(links[i]).toHaveAttribute('tabindex', '-1');
    }
  });

  it('moves focus to next item on ArrowDown', () => {
    renderNavBar();

    const { listbox, links } = getListboxAndLinks();

    // Focus the first item
    links[0].focus();

    // Press ArrowDown
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });

    // Second item should now have tabindex=0 and be focused
    expect(links[1]).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(links[1]);
  });

  it('moves focus to previous item on ArrowUp', () => {
    renderNavBar();

    const { listbox, links } = getListboxAndLinks();

    // Focus first item, move down, then up
    links[0].focus();
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });

    // First item should be focused again
    expect(links[0]).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(links[0]);
  });

  it('moves focus to first item on Home key', () => {
    renderNavBar();

    const { listbox, links } = getListboxAndLinks();

    // Focus first item, move down several times
    links[0].focus();
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });

    // Press Home
    fireEvent.keyDown(listbox, { key: 'Home' });

    // First item should be focused
    expect(links[0]).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(links[0]);
  });

  it('moves focus to last item on End key', () => {
    renderNavBar();

    const { listbox, links } = getListboxAndLinks();

    // Focus first item
    links[0].focus();

    // Press End
    fireEvent.keyDown(listbox, { key: 'End' });

    // Last item should be focused
    const lastLink = links[links.length - 1];
    expect(lastLink).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(lastLink);
  });

  it('wraps from last to first on ArrowDown', () => {
    renderNavBar();

    const { listbox, links } = getListboxAndLinks();

    // Focus first item, go to end
    links[0].focus();
    fireEvent.keyDown(listbox, { key: 'End' });

    // Press ArrowDown — should wrap to first
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });

    expect(links[0]).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(links[0]);
  });

  it('wraps from first to last on ArrowUp', () => {
    renderNavBar();

    const { listbox, links } = getListboxAndLinks();

    // Focus first item
    links[0].focus();

    // Press ArrowUp — should wrap to last
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });

    const lastLink = links[links.length - 1];
    expect(lastLink).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(lastLink);
  });

  it('prevents default on arrow key events to avoid scrolling', () => {
    renderNavBar();

    const { listbox, links } = getListboxAndLinks();

    links[0].focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    listbox.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
