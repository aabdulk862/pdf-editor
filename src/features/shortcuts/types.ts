export type ShortcutScope = 'global' | 'panel' | 'modal';
export type ShortcutCategory = 'navigation' | 'operations' | 'application';

export interface ShortcutBinding {
  id: string;
  keys: ShortcutKeys;
  action: () => void;
  label: string;
  category: ShortcutCategory;
  scope: ShortcutScope;
  /** If true, fires even when text input is focused */
  bypassInputFocus: boolean;
}

export interface ShortcutKeys {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface ShortcutManagerState {
  bindings: Map<string, ShortcutBinding>;
  register: (binding: ShortcutBinding) => void;
  unregister: (id: string) => void;
  resolve: (event: KeyboardEvent, focusContext: FocusContext) => ShortcutBinding | null;
  getAll: () => ShortcutBinding[];
  getByCategory: (category: ShortcutCategory) => ShortcutBinding[];
}

export interface FocusContext {
  isTextInput: boolean;
  activeScope: ShortcutScope;
}
