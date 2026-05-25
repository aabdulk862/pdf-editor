/**
 * Service Worker registration module.
 *
 * Registers the service worker on app startup and listens for updates.
 * When a new service worker activates, dispatches a custom event that
 * the UI can listen to for showing a "New version available" toast.
 */

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/tools/service-worker.js', {
        scope: '/tools/',
      });

      // Listen for new service worker installations
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // When the new SW is activated and there's an existing controller,
          // it means an update is available
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            // Dispatch a custom event for the UI to show a toast
            window.dispatchEvent(
              new CustomEvent('sw-update-available', {
                detail: { registration },
              }),
            );
          }
        });
      });
    } catch (error) {
      // Service worker registration failed — non-critical, app still works
      // eslint-disable-next-line no-console
      console.warn('Service Worker registration failed:', error);
    }
  });
}
