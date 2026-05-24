import { AppRouter } from './router';
import { ShortcutProvider } from '../features/shortcuts/ShortcutProvider';
import { useOcrCleanup } from './useOcrCleanup';

export function App() {
  // Register beforeunload handler to destroy OCR worker on tab close (Req 10.4)
  useOcrCleanup();

  return (
    <ShortcutProvider>
      <AppRouter />
    </ShortcutProvider>
  );
}
