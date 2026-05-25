import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOnboardingStore } from '../store/onboarding-store';
import type { OnboardingStep } from '../types';

// === Tour Step Definitions ===

const TOUR_STEPS: OnboardingStep[] = [
  {
    id: 'toolbar',
    targetSelector: '[role="toolbar"][aria-label="Canvas tools"]',
    title: 'Toolbar',
    description:
      'Use the toolbar to select drawing tools — shapes, text, images, and more. Each tool has a keyboard shortcut for quick access.',
    position: 'bottom',
  },
  {
    id: 'canvas-area',
    targetSelector: '[data-testid="canvas-workspace"]',
    title: 'Canvas Area',
    description:
      'This is your design surface. Drag elements, zoom with Ctrl+scroll, and pan by holding spacebar. Your page appears as a white surface on the dark background.',
    position: 'right',
  },
  {
    id: 'properties-panel',
    targetSelector: '[data-testid="properties-panel"]',
    title: 'Properties Panel',
    description:
      'Select any element to see its properties here — colors, fonts, sizes, shadows, and more. When nothing is selected, you can adjust page settings.',
    position: 'left',
  },
  {
    id: 'export-button',
    targetSelector: '[aria-label="Export document"]',
    title: 'Export',
    description:
      'Export your design as PDF, PNG, SVG, or DOCX. You can also batch-export all pages or insert directly into an existing PDF.',
    position: 'top',
  },
  {
    id: 'page-navigator',
    targetSelector: '[data-testid="page-navigator"]',
    title: 'Page Navigator',
    description:
      'Manage multiple pages in your document. Add, remove, and switch between pages using the thumbnails on the left.',
    position: 'right',
  },
];

// === Spotlight Cutout Calculation ===

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getTargetRect(selector: string): SpotlightRect | null {
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const padding = 8;
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

// === Tooltip Position Calculation ===

interface TooltipPosition {
  top: number;
  left: number;
}

function calculateTooltipPosition(
  spotlight: SpotlightRect,
  position: OnboardingStep['position'],
  tooltipWidth: number,
  tooltipHeight: number,
): TooltipPosition {
  const gap = 16;

  switch (position) {
    case 'bottom':
      return {
        top: spotlight.top + spotlight.height + gap,
        left: spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
      };
    case 'top':
      return {
        top: spotlight.top - tooltipHeight - gap,
        left: spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
      };
    case 'left':
      return {
        top: spotlight.top + spotlight.height / 2 - tooltipHeight / 2,
        left: spotlight.left - tooltipWidth - gap,
      };
    case 'right':
      return {
        top: spotlight.top + spotlight.height / 2 - tooltipHeight / 2,
        left: spotlight.left + spotlight.width + gap,
      };
  }
}

function clampTooltipPosition(
  pos: TooltipPosition,
  tooltipWidth: number,
  tooltipHeight: number,
): TooltipPosition {
  const margin = 16;
  return {
    top: Math.max(margin, Math.min(pos.top, window.innerHeight - tooltipHeight - margin)),
    left: Math.max(margin, Math.min(pos.left, window.innerWidth - tooltipWidth - margin)),
  };
}

// === OnboardingTour Component ===

/**
 * OnboardingTour renders a step-by-step guided tour overlay.
 *
 * - Semi-transparent dark overlay (bg-black/60) dims the entire viewport
 * - Spotlight cutout highlights the target element with a 4px glow border
 * - Tooltip card positioned adjacent to the spotlight with step info and navigation
 * - Supports keyboard navigation: Enter/→ for next, Escape to dismiss
 * - "X" close button on each step for dismissal
 * - On final step completion: calls completeTour()
 * - On skip: calls skipTour()
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.6
 */
export function OnboardingTour() {
  const tourActive = useOnboardingStore((state) => state.tourActive);
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const totalSteps = useOnboardingStore((state) => state.totalSteps);
  const nextStep = useOnboardingStore((state) => state.nextStep);
  const skipTour = useOnboardingStore((state) => state.skipTour);
  const completeTour = useOnboardingStore((state) => state.completeTour);

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 200 });

  const step = useMemo(() => TOUR_STEPS[currentStep] ?? null, [currentStep]);
  const isLastStep = currentStep === totalSteps - 1;

  // Update spotlight position when step changes or on resize
  const updateSpotlight = useCallback(() => {
    if (!step) return;
    const rect = getTargetRect(step.targetSelector);
    setSpotlightRect(rect);
  }, [step]);

  useEffect(() => {
    if (!tourActive) return;
    updateSpotlight();

    const handleResize = () => updateSpotlight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tourActive, updateSpotlight]);

  // Measure tooltip size for positioning
  useEffect(() => {
    if (tooltipRef.current) {
      const { offsetWidth, offsetHeight } = tooltipRef.current;
      setTooltipSize({ width: offsetWidth, height: offsetHeight });
    }
  }, [currentStep, tourActive]);

  // Keyboard navigation
  useEffect(() => {
    if (!tourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skipTour();
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (isLastStep) {
          completeTour();
        } else {
          nextStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tourActive, isLastStep, nextStep, skipTour, completeTour]);

  if (!tourActive || !step) return null;

  // Calculate tooltip position
  const tooltipPosition = spotlightRect
    ? clampTooltipPosition(
        calculateTooltipPosition(
          spotlightRect,
          step.position,
          tooltipSize.width,
          tooltipSize.height,
        ),
        tooltipSize.width,
        tooltipSize.height,
      )
    : { top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 160 };

  // SVG mask for the spotlight cutout
  const overlayMask = spotlightRect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${spotlightRect.left}px ${spotlightRect.top}px,
        ${spotlightRect.left}px ${spotlightRect.top + spotlightRect.height}px,
        ${spotlightRect.left + spotlightRect.width}px ${spotlightRect.top + spotlightRect.height}px,
        ${spotlightRect.left + spotlightRect.width}px ${spotlightRect.top}px,
        ${spotlightRect.left}px ${spotlightRect.top}px
      )`
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[10000]"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tour"
      data-testid="onboarding-tour"
    >
      {/* Dark overlay with spotlight cutout */}
      <div
        className="absolute inset-0 bg-black/60 transition-[clip-path,opacity] duration-slow ease-in-out motion-reduce:transition-none"
        style={overlayMask ? { clipPath: overlayMask } : undefined}
        aria-hidden="true"
      />

      {/* Spotlight glow border */}
      {spotlightRect && (
        <div
          className="absolute rounded-lg pointer-events-none transition-[top,left,width,height] duration-slow ease-in-out motion-reduce:transition-none"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.3)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute w-80 max-w-[calc(100vw-32px)] bg-white dark:bg-secondary-800 rounded-xl shadow-level-4 border border-secondary-200 dark:border-secondary-700 p-5 transition-[top,left,opacity] duration-slow ease-in-out motion-reduce:transition-none"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
        role="alertdialog"
        aria-labelledby="onboarding-step-title"
        aria-describedby="onboarding-step-description"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={skipTour}
          className="absolute top-3 right-3 flex items-center justify-center min-w-[44px] min-h-[44px] md:w-6 md:h-6 md:min-w-0 md:min-h-0 rounded-md text-secondary-400 dark:text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Close tour"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          >
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        {/* Step indicator */}
        <div className="text-xs text-secondary-400 dark:text-secondary-500 mb-2">
          Step {currentStep + 1} of {totalSteps}
        </div>

        {/* Step title */}
        <p
          id="onboarding-step-title"
          className="text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-2"
        >
          {step.title}
        </p>

        {/* Step description */}
        <p
          id="onboarding-step-description"
          className="text-sm text-secondary-600 dark:text-secondary-300 leading-relaxed mb-5"
        >
          {step.description}
        </p>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={skipTour}
            className="text-sm text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-200 transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-2 py-1"
          >
            Skip
          </button>

          <button
            type="button"
            onClick={isLastStep ? completeTour : nextStep}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {isLastStep ? 'Done' : 'Next'}
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-4" aria-hidden="true">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-moderate ease-in-out ${
                i === currentStep ? 'bg-blue-500' : 'bg-secondary-300 dark:bg-secondary-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
