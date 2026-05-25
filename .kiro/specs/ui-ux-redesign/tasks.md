# Implementation Plan: UI/UX Redesign

## Overview

This implementation plan covers the comprehensive UI/UX redesign of the PDF Editor application across 11 phases. The work is ordered to build foundational layers first (tokens, layout) before applying polish (animations, accessibility, visual QA). Each phase can be completed independently, though later phases depend on earlier ones being in place.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "name": "Foundation",
      "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10"]
    },
    {
      "name": "Layout & Structure",
      "tasks": [
        "2.1",
        "2.2",
        "2.3",
        "2.4",
        "2.5",
        "2.6",
        "2.7",
        "2.8",
        "2.9",
        "2.10",
        "9.1",
        "9.2",
        "9.3"
      ]
    },
    {
      "name": "Features & Navigation",
      "tasks": [
        "3.1",
        "3.2",
        "3.3",
        "3.4",
        "3.5",
        "3.6",
        "3.7",
        "4.1",
        "4.2",
        "4.3",
        "4.4",
        "4.5",
        "4.6",
        "4.7",
        "4.8",
        "9.4",
        "9.5",
        "9.6",
        "9.7",
        "9.8"
      ]
    },
    {
      "name": "Interactions & Onboarding",
      "tasks": [
        "5.1",
        "5.2",
        "5.3",
        "5.4",
        "5.5",
        "5.6",
        "5.7",
        "6.1",
        "6.2",
        "6.3",
        "6.4",
        "6.5",
        "6.6"
      ]
    },
    {
      "name": "Performance & Accessibility",
      "tasks": [
        "7.1",
        "7.2",
        "7.3",
        "7.4",
        "7.5",
        "7.6",
        "7.7",
        "8.1",
        "8.2",
        "8.3",
        "8.4",
        "8.5",
        "8.6",
        "8.7",
        "8.8"
      ]
    },
    {
      "name": "Mobile & Visual QA",
      "tasks": [
        "10.1",
        "10.2",
        "10.3",
        "10.4",
        "10.5",
        "10.6",
        "10.7",
        "11.1",
        "11.2",
        "11.3",
        "11.4",
        "11.5",
        "11.6",
        "11.7",
        "11.8"
      ]
    }
  ]
}
```

## Tasks

## Phase 1: Design Token System & Primitives

- [x] 1.1 Create `src/design-system/tokens.ts` with all design token definitions (colors, spacing, typography, border-radius, shadows, border-width, motion durations, easing curves, icon sizes)
- [x] 1.2 Create a build script (`scripts/generate-tokens.ts`) that reads `tokens.ts` and generates CSS custom properties file (`tokens.generated.css`) and updates `tailwind.config.ts` theme extension
- [x] 1.3 Add ESLint rule (`no-restricted-syntax`) to forbid raw `gray-*` Tailwind classes in favor of `secondary-*` token classes
- [x] 1.4 Create `src/design-system/primitives/Icon.tsx` wrapper component that enforces 16/20/24px sizing and 1.5px stroke-width
- [x] 1.5 Refactor `src/components/ui/Button.tsx` to use design tokens for colors, spacing, border-radius, and add press animation (`active:scale-[0.97]` with 100ms transition)
- [x] 1.6 Create `src/design-system/primitives/SegmentedControl.tsx` composite component to replace duplicated toggle-button patterns across tool pages
- [x] 1.7 Create `src/hooks/useReducedMotion.ts` hook that detects `prefers-reduced-motion: reduce` and provides a boolean for conditional animation
- [x] 1.8 Create `src/design-system/primitives/Skeleton.tsx` enhanced skeleton component with shimmer animation (respects reduced motion)
- [x] 1.9 Write property-based test: all spacing token values are multiples of 4
  - [x] 1.9.pbt Write property test for spacing grid alignment invariant
- [x] 1.10 Write property-based test: all foreground/background color pairs meet WCAG AA contrast ratios
  - [x] 1.10.pbt Write property test for WCAG color contrast compliance

## Phase 2: App Shell Layout Refactor

- [x] 2.1 Create `src/app/AppShell.tsx` with CSS Grid layout (`grid-template-columns: auto 1fr`, `grid-template-rows: auto auto 1fr auto`) implementing sidebar + tab bar + toolbar + canvas + status bar zones
- [x] 2.2 Implement sidebar collapse/expand with GPU-accelerated width transition (200ms ease-in-out), persisting state to localStorage
- [x] 2.3 Implement mobile sidebar as fixed overlay with backdrop blur, animating from left (200ms ease-out)
- [x] 2.4 Add minimum Canvas Area width constraint (320px) via CSS `min-width`
- [x] 2.5 Create `src/app/Toolbar.tsx` with slot-based architecture (left/center/right/overflow slots)
- [x] 2.6 Create `src/hooks/useToolbar.ts` hook for tools to register their toolbar controls into the center slot
- [x] 2.7 Add right panel slot (initially hidden) in the grid layout for future collaboration/AI panel
- [x] 2.8 Migrate `src/app/router.tsx` RootLayout to use new AppShell instead of old Layout component
- [x] 2.9 Add ARIA landmarks: `role="banner"` on header, `role="navigation"` on sidebar, `role="main"` on canvas area
- [x] 2.10 Write property-based test: sidebar state persistence round-trip (write to localStorage, read back equals original)
  - [x] 2.10.pbt Write property test for sidebar state localStorage round-trip

## Phase 3: Home Dashboard Redesign

- [x] 3.1 Redesign `HomePage` hero section with prominent Drop Zone (animated dashed border on drag-over, large upload icon, supported formats text)
- [x] 3.2 Implement Quick Actions row showing 4 most-frequently-used tools as larger prominent cards (computed from nav store usage data)
- [x] 3.3 Redesign Recent Files section with horizontal scroll, thumbnail previews (rendered via pdf.js), file names, and relative timestamps
- [x] 3.4 Redesign Tool Card grid with hover elevation animation (`translateY(-2px)` + shadow level-2 over 150ms), category grouping, and consistent icon sizing
- [x] 3.5 Create Empty State component for "no recent files" with illustration using primary color palette and CTA to upload
- [x] 3.6 Add page-enter animation (opacity 0→1, translateY 8px→0, 200ms ease-out) with reduced-motion support
- [x] 3.7 Write property-based test: Quick Actions always shows the 4 tools with highest usage count in descending order
  - [x] 3.7.pbt Write property test for quick actions frequency ordering

## Phase 4: Navigation Enhancements

- [x] 4.1 Add roving tabindex keyboard navigation to sidebar tool list (Arrow Up/Down between items, Home/End for first/last)
- [x] 4.2 Enhance sidebar filter with debounced fuzzy matching (50ms threshold) that searches tool names, descriptions, and category labels
- [x] 4.3 Improve collapsed sidebar tooltips: fade-in animation over 150ms after 300ms hover delay
- [x] 4.4 Enhance context menu with "Open in New Tab" option alongside existing "Add to Favorites"
- [x] 4.5 Add Command Palette open animation (backdrop opacity 0→1 over 100ms, modal scale 0.95→1 over 150ms ease-out)
- [x] 4.6 Write property-based test: navigation filter results are always a subset of all tools, and all results match the query
  - [x] 4.6.pbt Write property test for navigation filter subset invariant
- [x] 4.7 Write property-based test: recent tools list never exceeds 5 items, is ordered most-recent-first, has no duplicates
  - [x] 4.7.pbt Write property test for recent tools length/ordering invariant
- [x] 4.8 Write property-based test: fuzzy matcher always returns a tool when queried by its exact name
  - [x] 4.8.pbt Write property test for fuzzy match completeness

## Phase 5: Micro-Interactions & Animations

- [x] 5.1 Add tab active indicator slide animation (translateX over 150ms ease-in-out) when switching tabs
- [x] 5.2 Refactor Toast component: standardize position (bottom-center mobile, top-right desktop), add slide-up entrance (200ms ease-out) and slide-down exit (150ms ease-in)
- [x] 5.3 Add Tool Card click animation (brief scale 0.97 for 100ms) before navigation
- [x] 5.4 Add sidebar collapse/expand animation using GPU-accelerated transform instead of width (translateX for content, width for container)
- [x] 5.5 Apply `motion-safe:` and `motion-reduce:` Tailwind variants to all animated components
- [x] 5.6 Add Command Palette backdrop blur transition (backdrop-blur-sm over 100ms)
- [x] 5.7 Write property-based test: no CSS transition in the codebase uses `linear` timing function
  - [x] 5.7.pbt Write property test for animation easing curve invariant

## Phase 6: Onboarding System

- [x] 6.1 Create `src/features/onboarding/` feature module with `useOnboardingStore` (Zustand + localStorage persistence)
- [x] 6.2 Implement welcome banner component (non-blocking, top of home page) highlighting privacy, speed, and tool variety
- [x] 6.3 Implement banner dismissal with localStorage persistence and smooth exit animation
- [x] 6.4 Implement Command Palette hint (subtle tooltip near search area) shown after 3 sessions without Cmd+K usage
- [x] 6.5 Implement first-success celebration (brief checkmark animation, auto-dismisses in 2 seconds)
- [x] 6.6 Create contextual help tooltip component for first-use of each tool (dismissible, "Don't show again" option)

## Phase 7: Performance Optimizations

- [x] 7.1 Add `React.lazy()` code splitting to all tool page routes (currently only canvas editor is lazy-loaded)
- [x] 7.2 Create route-level skeleton placeholders for all lazy-loaded tool pages
- [x] 7.3 Add font preloading (`<link rel="preload">`) for Inter and JetBrains Mono in `index.html`
- [x] 7.4 Implement thumbnail virtualization (`src/hooks/useVirtualScroll.ts`) for page thumbnail lists — render only visible items + buffer
- [x] 7.5 Verify Vite content-hash filenames are configured for immutable caching (check `vite.config.ts` output settings)
- [x] 7.6 Audit and optimize initial bundle size — target < 150KB gzipped (analyze with `vite-bundle-visualizer`)
- [x] 7.7 Ensure all PDF processing operations use Web Workers (audit existing worker usage, extend to any synchronous processing)

## Phase 8: Accessibility Audit & Fixes

- [x] 8.1 Add consistent focus-visible ring (`ring-2 ring-offset-2 ring-primary-500`) to all interactive elements missing it (tab close buttons, context menu items, toast dismiss, nav links)
- [x] 8.2 Implement `src/hooks/useFocusTrap.ts` for modal/dialog focus trapping with focus restoration on close
- [x] 8.3 Add `aria-live="polite"` to toast container and progress updates, `aria-live="assertive"` to error messages
- [x] 8.4 Ensure logical heading hierarchy (one h1 per page, no skipped levels) across all routes
- [x] 8.5 Add `aria-hidden="true"` to all decorative SVG icons, ensure functional icons have `aria-label`
- [x] 8.6 Implement roving tabindex in Command Palette results list for arrow-key navigation
- [x] 8.7 Write property-based test: heading hierarchy invariant (no skipped levels, exactly one h1 per page)
  - [x] 8.7.pbt Write property test for heading hierarchy invariant
- [x] 8.8 Write property-based test: all icon components render with dimensions from {16, 20, 24}px and stroke-width 1.5
  - [x] 8.8.pbt Write property test for icon size consistency

## Phase 9: Existing Issues & Consistency Fixes

- [x] 9.1 Replace all raw `gray-*` classes with `secondary-*` token classes in ErrorBoundary, canvas editor EmptyState, RecoveryPrompt, MinimapOverlay, ColorPicker, and skeleton components
- [x] 9.2 Add dark mode variants (`dark:`) to all canvas editor components that currently lack them
- [x] 9.3 Standardize all transition durations to token values (50ms, 150ms, 200ms, 300ms) and ensure explicit easing curves on every transition
- [x] 9.4 Refactor tool pages (RotatePage, PageSizePage, WatermarksPage, PageNumbersPage, ComparePage) to use shared SegmentedControl and Button components instead of inline styling
- [x] 9.5 Add loading/processing state transitions with skeleton placeholders to tool pages that currently jump between states
- [x] 9.6 Standardize icon sizing across all components to use the Icon wrapper (16/20/24px, 1.5px stroke)
- [x] 9.7 Add error recovery (retry buttons, preserved file state) to all tool pages that currently show generic errors
- [x] 9.8 Fix toast positioning: bottom-center on mobile (within thumb reach), top-right on desktop

## Phase 10: Mobile Responsiveness Polish

- [-] 10.1 Ensure all interactive elements have min 44x44px touch targets on viewports below md breakpoint
- [ ] 10.2 Implement toolbar overflow: reflow controls into scrollable horizontal strip with "more" menu on narrow viewports
- [ ] 10.3 Convert Tool Card grid to single-column layout below sm breakpoint
- [ ] 10.4 Hide non-essential UI (keyboard shortcut hints, secondary labels) below sm breakpoint using `hidden sm:block`
- [ ] 10.5 Constrain all modals/dropdowns to viewport bounds with 16px margin on mobile
- [ ] 10.6 Test and fix any overlapping or clipped content on 320px viewport width
- [ ] 10.7 Write property-based test: all button/link variants at mobile breakpoint have min 44px dimensions
  - [ ] 10.7.pbt Write property test for touch target minimum size

## Phase 11: Visual QA & Pixel-Perfection Pass

- [ ] 11.1 Audit all components for 4px sub-grid alignment — fix any fractional pixel offsets
- [ ] 11.2 Verify shadow tokens simulate single top-left light source consistently across all elevated surfaces
- [ ] 11.3 Ensure PDF page previews render at `window.devicePixelRatio` for Retina/HiDPI sharpness
- [ ] 11.4 Add `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` to global styles
- [ ] 11.5 Verify all animations use GPU-accelerated properties (transform, opacity) — no `width`, `height`, `top`, `left` animations
- [ ] 11.6 Run full Lighthouse audit on mobile and desktop — target score 90+ on Performance, Accessibility, Best Practices
- [ ] 11.7 Run `tsc --noEmit` and `eslint` — verify zero errors and zero warnings
- [ ] 11.8 Final visual review: verify color harmony, consistent spacing, and professional polish across all pages in both light and dark themes

## Notes

- Phase 1 is the foundation — all other phases depend on the design token system being in place
- Phases 2-6 can be worked on in parallel once Phase 1 is complete, though Phase 3-4 benefit from Phase 2's AppShell
- Phase 9 (consistency fixes) can start immediately after Phase 1 since it's refactoring existing code to use new tokens
- Phase 11 (visual QA) should be the final pass after all other phases are complete
- Property-based tests (marked with `.pbt`) validate invariants that should hold across all inputs
- The canvas three-layer architecture (Phase 2) is designed to support future inline text editing without rework
- All animations must respect `prefers-reduced-motion` — use the `useReducedMotion` hook from Phase 1
