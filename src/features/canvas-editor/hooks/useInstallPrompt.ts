import { useCallback, useEffect, useState } from 'react';

/**
 * The BeforeInstallPromptEvent interface for the PWA install prompt.
 * This event is fired when the browser determines the app meets installability criteria.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface UseInstallPromptReturn {
  /** Whether the install prompt is available (browser supports it and app isn't installed) */
  canInstall: boolean;
  /** Whether the app is running in standalone mode (already installed) */
  isStandalone: boolean;
  /** Whether the user has dismissed the install banner this session */
  isDismissed: boolean;
  /** Trigger the native install prompt */
  promptInstall: () => Promise<void>;
  /** Dismiss the install banner for this session */
  dismiss: () => void;
}

/**
 * Hook that manages the PWA install prompt lifecycle.
 *
 * Listens for the `beforeinstallprompt` event to capture the deferred prompt,
 * detects standalone mode (app already installed), and provides methods to
 * trigger the native install dialog or dismiss the banner.
 *
 * Requirements: 20.4, 20.5
 */
export function useInstallPrompt(): UseInstallPromptReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Detect if app is running in standalone mode (already installed)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  useEffect(() => {
    if (isStandalone) return;

    function handleBeforeInstallPrompt(e: Event) {
      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // Clear the deferred prompt regardless of outcome — it can only be used once
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      setIsDismissed(true);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  return {
    canInstall: deferredPrompt !== null && !isDismissed,
    isStandalone,
    isDismissed,
    promptInstall,
    dismiss,
  };
}
