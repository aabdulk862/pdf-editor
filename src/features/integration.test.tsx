import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useCommandPaletteStore } from '../store/command-palette';
import { useTabStore } from '../store/tabs';
import { useTemplateStore } from '../store/templates';
import { useDropZoneStore } from '../store/drop-zone';
import { useQuickActionsStore } from '../store/quick-actions';
import { useToastStore } from '../store/toast';
import { CommandPalette } from './command-palette/CommandPalette';
import { QuickActionsBar } from './quick-actions/QuickActionsBar';
import { GlobalDropZone } from './global-drop-zone/GlobalDropZone';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn();

// Mock PdfWorkerClient for template execution tests
const mockLinearize = vi.fn().mockResolvedValue({ success: true, data: new ArrayBuffer(70) });
const mockWorkerClient = {
  compress: vi.fn().mockResolvedValue({ success: true, data: new ArrayBuffer(50) }),
  flatten: vi.fn().mockResolvedValue({ success: true, data: new ArrayBuffer(60) }),
  linearize: mockLinearize,
  addPageNumbers: vi.fn().mockResolvedValue({ success: true, data: new ArrayBuffer(80) }),
  addHeadersFooters: vi.fn().mockResolvedValue({ success: true, data: new ArrayBuffer(90) }),
  addWatermark: vi.fn().mockResolvedValue({ success: true, data: new ArrayBuffer(100) }),
  redact: vi.fn().mockResolvedValue({ success: true, data: new ArrayBuffer(110) }),
  encrypt: vi.fn().mockResolvedValue({ success: true, data: new ArrayBuffer(120) }),
};

vi.mock('../workers/pdf-worker-client', () => ({
  getPdfWorkerClient: () => mockWorkerClient,
}));

describe('Integration: End-to-End Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all stores to initial state
    useCommandPaletteStore.setState({
      isOpen: false,
      query: '',
      activeIndex: 0,
      filteredItems: useCommandPaletteStore.getState().items,
      previousFocusElement: null,
    });

    useTabStore.setState({
      tabs: [],
      activeTabId: null,
      clipboard: null,
      maxTabs: 10,
    });

    useTemplateStore.setState({
      templates: useTemplateStore.getState().templates,
      execution: {
        status: 'idle',
        currentStepIndex: 0,
        totalSteps: 0,
        currentStepName: '',
        intermediateResult: null,
        finalResult: null,
        error: null,
      },
      _cancelRequested: false,
      _selectedTemplateId: null,
    } as never);

    useDropZoneStore.setState({
      isDragging: false,
      isValidType: false,
    });

    useQuickActionsStore.setState({
      isVisible: false,
      actions: [],
      resultFile: null,
    });

    useToastStore.setState({ toasts: [] });
  });

  describe('Command Palette: open → search → select → navigate', () => {
    it('opens palette, searches for an operation, selects it, and navigates to the route', async () => {
      // 1. Open the command palette
      act(() => {
        useCommandPaletteStore.getState().open();
      });

      render(
        <MemoryRouter>
          <CommandPalette />
        </MemoryRouter>,
      );

      // Palette should be visible
      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();

      // 2. Search for "compress"
      const input = screen.getByLabelText('Search commands');
      fireEvent.change(input, { target: { value: 'compress' } });

      // Verify the store filtered correctly
      const state = useCommandPaletteStore.getState();
      expect(state.query).toBe('compress');
      expect(state.filteredItems.length).toBeGreaterThan(0);
      expect(state.filteredItems.some((item) => item.id === 'compress')).toBe(true);

      // 3. The first result should be active (visually highlighted)
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');

      // 4. Press Enter to select and navigate
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });

      // Should navigate to the compress route
      expect(mockNavigate).toHaveBeenCalledWith('/compress');

      // Palette should close
      expect(useCommandPaletteStore.getState().isOpen).toBe(false);
    });

    it('navigates using ArrowDown then Enter to select a non-first result', () => {
      act(() => {
        useCommandPaletteStore.getState().open();
      });

      render(
        <MemoryRouter>
          <CommandPalette />
        </MemoryRouter>,
      );

      // Move selection down once
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowDown' });
      expect(useCommandPaletteStore.getState().activeIndex).toBe(1);

      // Press Enter to navigate to the second item
      const expectedRoute = useCommandPaletteStore.getState().filteredItems[1].route;
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });

      expect(mockNavigate).toHaveBeenCalledWith(expectedRoute);
    });
  });

  describe('Tab Manager: upload file → create tab → switch tabs → verify state preserved', () => {
    it('creates a tab on file upload, switches between tabs, and preserves state', () => {
      const store = useTabStore.getState();

      // 1. Upload first file — create first tab
      const file1 = new File(['pdf-content-1'], 'report.pdf', { type: 'application/pdf' });
      Object.defineProperty(file1, 'size', { value: 1024 });
      // Mock arrayBuffer to avoid async issues
      file1.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(1024));

      const opened1 = store.openTab(file1, '/compress');
      expect(opened1).toBe(true);

      // Verify tab was created and is active
      let state = useTabStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.activeTabId).toBe(state.tabs[0].id);
      expect(state.tabs[0].operationRoute).toBe('/compress');

      const tab1Id = state.tabs[0].id;

      // 2. Update tab1's operation state (simulating user interaction)
      useTabStore.getState().updateTabState(tab1Id, { quality: 'high', pages: [1, 2, 3] });

      // 3. Upload second file — create second tab
      const file2 = new File(['pdf-content-2'], 'invoice.pdf', { type: 'application/pdf' });
      Object.defineProperty(file2, 'size', { value: 2048 });
      file2.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(2048));

      useTabStore.getState().openTab(file2, '/merge');

      state = useTabStore.getState();
      expect(state.tabs).toHaveLength(2);
      const tab2Id = state.tabs[1].id;
      expect(state.activeTabId).toBe(tab2Id);

      // 4. Switch back to first tab
      useTabStore.getState().switchTab(tab1Id);

      state = useTabStore.getState();
      expect(state.activeTabId).toBe(tab1Id);

      // 5. Verify first tab's state is preserved
      const activeTab = state.tabs.find((t) => t.id === tab1Id);
      expect(activeTab?.operationState).toEqual({ quality: 'high', pages: [1, 2, 3] });
      expect(activeTab?.operationRoute).toBe('/compress');

      // 6. Switch to second tab and verify its state is independent
      useTabStore.getState().switchTab(tab2Id);
      state = useTabStore.getState();
      const tab2 = state.tabs.find((t) => t.id === tab2Id);
      expect(tab2?.operationRoute).toBe('/merge');
      expect(tab2?.operationState).toEqual({});
    });
  });

  describe('Template Engine: select → configure → execute → download result', () => {
    it('selects a template, executes all steps sequentially, and produces a final result', async () => {
      const templateStore = useTemplateStore.getState();

      // 1. Select the "Clean and Optimize" template (flatten → compress → linearize)
      act(() => {
        templateStore.selectTemplate('clean-and-optimize');
      });

      let state = useTemplateStore.getState();
      expect(state.execution.status).toBe('configuring');
      expect(state.execution.totalSteps).toBe(3);

      // 2. Execute the template with an input file
      const inputFile = new ArrayBuffer(100);

      await act(async () => {
        await useTemplateStore.getState().execute(inputFile);
      });

      // 3. Verify execution completed successfully
      state = useTemplateStore.getState();
      expect(state.execution.status).toBe('completed');
      expect(state.execution.finalResult).not.toBeNull();
      expect(state.execution.finalResult!.byteLength).toBeGreaterThan(0);
    });

    it('halts execution on step failure and preserves intermediate result', async () => {
      // Make linearize fail on the next call
      mockLinearize.mockResolvedValueOnce({
        success: false,
        data: null,
        error: 'Linearization failed',
      });

      // Select "Clean and Optimize" (flatten → compress → linearize)
      act(() => {
        useTemplateStore.getState().selectTemplate('clean-and-optimize');
      });

      const inputFile = new ArrayBuffer(100);

      await act(async () => {
        await useTemplateStore.getState().execute(inputFile);
      });

      const state = useTemplateStore.getState();
      expect(state.execution.status).toBe('failed');
      expect(state.execution.error).not.toBeNull();
      expect(state.execution.error!.stepName).toBe('Linearize for Web');
      expect(state.execution.error!.stepIndex).toBe(2);
      // Intermediate result from step 1 (compress) should be preserved
      expect(state.execution.intermediateResult).not.toBeNull();
    });
  });

  describe('Global Drop Zone: drag file → drop → file loaded in operation', () => {
    it('drops a valid PDF file on an operation page and passes it to the handler', () => {
      const onFilesDropped = vi.fn();

      render(
        <MemoryRouter initialEntries={['/compress']}>
          <GlobalDropZone onFilesDropped={onFilesDropped}>
            <div>Operation Page Content</div>
          </GlobalDropZone>
        </MemoryRouter>,
      );

      const dropZone = screen.getByText('Operation Page Content').parentElement!;

      // 1. Simulate drag enter — overlay should appear
      const pdfFile = new File(['pdf-data'], 'document.pdf', { type: 'application/pdf' });
      const dataTransfer = {
        items: [{ kind: 'file', type: 'application/pdf' }],
        files: [pdfFile],
        types: ['Files'],
        dropEffect: 'none',
      };

      fireEvent.dragEnter(dropZone, { dataTransfer });

      // Verify drag state is active
      expect(useDropZoneStore.getState().isDragging).toBe(true);
      expect(useDropZoneStore.getState().isValidType).toBe(true);

      // 2. Drop the file
      fireEvent.drop(dropZone, { dataTransfer });

      // 3. Verify the file was passed to the handler
      expect(onFilesDropped).toHaveBeenCalledWith([pdfFile]);

      // Drag state should be reset
      expect(useDropZoneStore.getState().isDragging).toBe(false);
    });

    it('drops a file on the home page and opens the command palette', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <GlobalDropZone>
            <div>Home Page Content</div>
          </GlobalDropZone>
        </MemoryRouter>,
      );

      const dropZone = screen.getByText('Home Page Content').parentElement!;

      const pdfFile = new File(['pdf-data'], 'document.pdf', { type: 'application/pdf' });
      const dataTransfer = {
        items: [{ kind: 'file', type: 'application/pdf' }],
        files: [pdfFile],
        types: ['Files'],
        dropEffect: 'none',
      };

      fireEvent.dragEnter(dropZone, { dataTransfer });
      fireEvent.drop(dropZone, { dataTransfer });

      // On home page, dropping should open the command palette
      expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      expect(useCommandPaletteStore.getState().query).toBe('pdf');
    });

    it('shows error toast when an invalid file type is dropped', () => {
      const onFilesDropped = vi.fn();

      render(
        <MemoryRouter initialEntries={['/compress']}>
          <GlobalDropZone onFilesDropped={onFilesDropped}>
            <div>Operation Page</div>
          </GlobalDropZone>
        </MemoryRouter>,
      );

      const dropZone = screen.getByText('Operation Page').parentElement!;

      const invalidFile = new File(['data'], 'script.exe', { type: 'application/x-msdownload' });
      const dataTransfer = {
        items: [{ kind: 'file', type: 'application/x-msdownload' }],
        files: [invalidFile],
        types: ['Files'],
        dropEffect: 'none',
      };

      fireEvent.dragEnter(dropZone, { dataTransfer });
      fireEvent.drop(dropZone, { dataTransfer });

      // Should show an error toast
      const toasts = useToastStore.getState().toasts;
      expect(toasts.length).toBeGreaterThan(0);
      expect(toasts[0].severity).toBe('error');
      expect(toasts[0].message).toContain('script.exe');

      // Should NOT call the file handler
      expect(onFilesDropped).not.toHaveBeenCalled();
    });
  });

  describe('Quick Actions: complete operation → quick action → file passed to next operation', () => {
    it('shows suggestions after operation completes and navigates with result file on click', async () => {
      // 1. Simulate operation completion — show quick actions for "merge"
      const resultFile = new ArrayBuffer(500);

      act(() => {
        useQuickActionsStore.getState().show('merge', resultFile);
      });

      // Verify store state
      const state = useQuickActionsStore.getState();
      expect(state.isVisible).toBe(true);
      expect(state.actions.length).toBeGreaterThan(0);
      expect(state.resultFile).toBe(resultFile);

      // 2. Render the QuickActionsBar
      render(
        <MemoryRouter initialEntries={['/merge']}>
          <QuickActionsBar />
        </MemoryRouter>,
      );

      // Wait for animation
      await waitFor(() => {
        expect(
          screen.getByRole('toolbar', { name: 'Quick follow-up actions' }),
        ).toBeInTheDocument();
      });

      // 3. Click the first suggestion (e.g., "Compress the result")
      const compressButton = screen.getByLabelText('Compress the merged PDF');
      fireEvent.click(compressButton);

      // 4. Verify navigation with the result file passed via state
      expect(mockNavigate).toHaveBeenCalledWith('/compress', {
        state: { preloadedFile: resultFile },
      });
    });

    it('does not show quick actions bar for operations without suggestions', () => {
      const resultFile = new ArrayBuffer(200);

      act(() => {
        useQuickActionsStore.getState().show('unknown-operation', resultFile);
      });

      // Should not be visible since no suggestions exist
      expect(useQuickActionsStore.getState().isVisible).toBe(false);

      render(
        <MemoryRouter>
          <QuickActionsBar />
        </MemoryRouter>,
      );

      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    it('dismisses the quick actions bar when dismiss button is clicked', async () => {
      const resultFile = new ArrayBuffer(300);

      act(() => {
        useQuickActionsStore.getState().show('merge', resultFile);
      });

      render(
        <MemoryRouter initialEntries={['/merge']}>
          <QuickActionsBar />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });

      // Click dismiss
      fireEvent.click(screen.getByLabelText('Dismiss quick actions'));

      // Bar should disappear
      expect(useQuickActionsStore.getState().isVisible).toBe(false);
    });
  });
});
