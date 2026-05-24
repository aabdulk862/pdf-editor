import { AppRouter } from './router';
import { ShortcutProvider } from '../features/shortcuts/ShortcutProvider';

export function App() {
  return (
    <ShortcutProvider>
      <AppRouter />
    </ShortcutProvider>
  );
}
