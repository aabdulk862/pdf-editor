export interface CommandItem {
  id: string;
  name: string;
  description: string;
  route: string;
  keywords: string[];
  category: 'operation' | 'navigation' | 'action';
  icon?: string;
}

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  activeIndex: number;
  items: CommandItem[];
  filteredItems: CommandItem[];
  previousFocusElement: HTMLElement | null;
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  moveSelection: (direction: 'up' | 'down') => void;
  setActiveIndex: (index: number) => void;
  getActiveItem: () => CommandItem | null;
}
