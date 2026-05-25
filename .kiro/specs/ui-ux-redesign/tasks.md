# Implementation Plan: UI/UX Redesign

## Overview

This implementation plan covers the remaining tasks for the comprehensive UI/UX redesign of the PDF Editor application. All foundational work (design tokens, layout, navigation, interactions, onboarding, performance, accessibility, mobile responsiveness, and consistency fixes) has been completed. The remaining work focuses on final validation and visual quality assurance.

## Tasks

- [x] 1. Design Token System & Primitives
  - [x] 1.1 Create `src/design-system/tokens.ts` with all design token definitions (colors, spacing, typography, border-radius, shadows, border-width, motion durations, easing curves, icon sizes)
  - [x] 1.2 Create a build script (`scripts/generate-tokens.ts`) that reads `tokens.ts` and generates CSS custom properties file (`tokens.generated.css`) and updates `tailwind.config.ts` theme extension
  - [x] 1.3 Add ESLint rule (`no-restricted-syntax`) to forbid raw `gray-*` Tailwind classes in favor of `secondary-*` token classes
  - [x] 1.4 Create `src/design-system/primitives/Icon.tsx` wrapper component that enforces 16/20/24px sizing and 1.5px stroke-width
  - [x] 1.5 Refactor `src/components/ui/Button.tsx` to use design tokens for colors, spacing, border-radius, and add press animation (`active:scale-[0.97]` with 100ms transition)
  - [x] 1.6 Create `src/design-system/primitives/SegmentedControl.tsx` composite component to replace duplicated toggle-button patterns across tool pages
  - [x] 1.7 Create `src/hooks/useReducedMotion.ts` hook that detects `prefers-reduced-motion: reduce` and provides a boolean for conditional animation
  - [x] 1.8 Create `src/design-system/primitives/Skeleton.tsx` enhanced skeleton component with shimmer animation (respects reduced motion)
  - [x] 1.9 Write property-based test: all spacing token values are multiples of 4
  - [x] 1.10 Write property-based test: all foreground/background color pairs meet WCAG AA contrast ratios

- [x] 2. App Shell Layout Refactor
  - [x] 2.1 Create `src/app/AppShell.tsx` with CSS Grid layout implementing sidebar + tab bar + toolbar + canvas + status bar zones
  - [x] 2.2 Implement sidebar collapse/expand with GPU-accelerated width transition (200ms ease-in-out), persisting state to localStorage
  - [x] 2.3 Implement mobile sidebar as fixed overlay with backdrop blur, animating from left (200ms ease-out)
  - [x] 2.4 Add minimum Canvas Area width constraint (320px) via CSS `min-width`
  - [x] 2.5 Create `src/app/Toolbar.tsx` with slot-based architecture (left/center/right/overflow slots)
  - [x] 2.6 Create `src/hooks/useToolbar.ts` hook for tools to register their toolbar controls into the center slot
  - [x] 2.7 Add right panel slot (initially hidden) in the grid layout for future collaboration/AI panel
  - [x] 2.8 Migrate `src/app/router.tsx` RootLayout to use new AppShell instead of old Layout component
  - [x] 2.9 Add ARIA landmarks: `role="banner"` on header, `role="navigation"` on sidebar, `role="main"` on canvas area
  - [x] 2.10 Write property-based test: sidebar state persistence round-trip

- [x] 3. Home Dashboard Redesign
  - [x] 3.1 Redesign `HomePage` hero section with prominent Drop Zone
  - [x] 3.2 Implement Quick Actions row showing 4 most-frequently-used tools as larger prominent cards
  - [x] 3.3 Redesign Recent Files section with horizontal scroll, thumbnail previews, file names, and relative timestamps
  - [x] 3.4 Redesign Tool Card grid with hover elevation animation, category grouping, and consistent icon sizing
  - [x] 3.5 Create Empty State component for "no recent files" with illustration and CTA to upload
  - [x] 3.6 Add page-enter animation (opacity 0→1, translateY 8px→0, 200ms ease-out) with reduced-motion support
  - [x] 3.7 Write property-based test: Quick Actions always shows the 4 tools with highest usage count in descending order

- [x] 4. Navigation Enhancements
  - [x] 4.1 Add roving tabindex keyboard navigation to sidebar tool list
  - [x] 4.2 Enhance sidebar filter with debounced fuzzy matching (50ms threshold)
  - [x] 4.3 Improve collapsed sidebar tooltips: fade-in animation over 150ms after 300ms hover delay
  - [x] 4.4 Enhance context menu with "Open in New Tab" option
  - [x] 4.5 Add Command Palette open animation
  - [x] 4.6 Write property-based test: navigation filter results are always a subset of all tools
  - [x] 4.7 Write property-based test: recent tools list never exceeds 5 items, ordered most-recent-first, no duplicates
  - [x] 4.8 Write property-based test: fuzzy matcher always returns a tool when queried by its exact name

- [x] 5. Micro-Interactions & Animations
  - [x] 5.1 Add tab active indicator slide animation
  - [x] 5.2 Refactor Toast component with standardized positioning and slide animations
  - [x] 5.3 Add Tool Card click animation
  - [x] 5.4 Add sidebar collapse/expand animation using GPU-accelerated transform
  - [x] 5.5 Apply `motion-safe:` and `motion-reduce:` Tailwind variants to all animated components
  - [x] 5.6 Add Command Palette backdrop blur transition
  - [x] 5.7 Write property-based test: no CSS transition uses `linear` timing function

- [x] 6. Onboarding System
  - [x] 6.1 Create `src/features/onboarding/` feature module with `useOnboardingStore`
  - [x] 6.2 Implement welcome banner component
  - [x] 6.3 Implement banner dismissal with localStorage persistence and smooth exit animation
  - [x] 6.4 Implement Command Palette hint shown after 3 sessions without Cmd+K usage
  - [x] 6.5 Implement first-success celebration
  - [x] 6.6 Create contextual help tooltip component for first-use of each tool

- [x] 7. Performance Optimizations
  - [x] 7.1 Add `React.lazy()` code splitting to all tool page routes
  - [x] 7.2 Create route-level skeleton placeholders for all lazy-loaded tool pages
  - [x] 7.3 Add font preloading for Inter and JetBrains Mono in `index.html`
  - [x] 7.4 Implement thumbnail virtualization (`src/hooks/useVirtualScroll.ts`)
  - [x] 7.5 Verify Vite content-hash filenames are configured for immutable caching
  - [x] 7.6 Audit and optimize initial bundle size — target < 150KB gzipped
  - [x] 7.7 Ensure all PDF processing operations use Web Workers

- [x] 8. Accessibility Audit & Fixes
  - [x] 8.1 Add consistent focus-visible ring to all interactive elements
  - [x] 8.2 Implement `src/hooks/useFocusTrap.ts` for modal/dialog focus trapping
  - [x] 8.3 Add `aria-live` regions for toast, progress, and error messages
  - [x] 8.4 Ensure logical heading hierarchy across all routes
  - [x] 8.5 Add `aria-hidden="true"` to decorative icons, `aria-label` to functional icons
  - [x] 8.6 Implement roving tabindex in Command Palette results list
  - [x] 8.7 Write property-based test: heading hierarchy invariant
  - [x] 8.8 Write property-based test: icon size consistency

- [x] 9. Existing Issues & Consistency Fixes
  - [x] 9.1 Replace all raw `gray-*` classes with `secondary-*` token classes
  - [x] 9.2 Add dark mode variants to all canvas editor components
  - [x] 9.3 Standardize all transition durations to token values with explicit easing curves
  - [x] 9.4 Refactor tool pages to use shared SegmentedControl and Button components
  - [x] 9.5 Add loading/processing state transitions with skeleton placeholders to tool pages
  - [x] 9.6 Standardize icon sizing across all components to use the Icon wrapper
  - [x] 9.7 Add error recovery to all tool pages
  - [x] 9.8 Fix toast positioning: bottom-center on mobile, top-right on desktop

- [x] 10. Mobile Responsiveness Polish
  - [x] 10.1 Ensure all interactive elements have min 44x44px touch targets below md breakpoint
  - [x] 10.2 Implement toolbar overflow with scrollable horizontal strip and "more" menu
  - [x] 10.3 Convert Tool Card grid to single-column layout below sm breakpoint
  - [x] 10.4 Hide non-essential UI below sm breakpoint
  - [x] 10.5 Constrain all modals/dropdowns to viewport bounds with 16px margin on mobile
  - [x] 10.6 Test and fix overlapping or clipped content on 320px viewport width
  - [x] 10.7 Write property-based test: all button/link variants at mobile breakpoint have min 44px dimensions

- [x] 11. Visual QA & Final Validation
  - [x] 11.1 Audit all components for 4px sub-grid alignment
  - [x] 11.2 Verify shadow tokens simulate single top-left light source consistently
  - [x] 11.3 Ensure PDF page previews render at `window.devicePixelRatio` for Retina/HiDPI sharpness
  - [x] 11.4 Add `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` to global styles
  - [x] 11.5 Verify all animations use GPU-accelerated properties (transform, opacity)
  - [x] 11.6 Run full Lighthouse audit on mobile and desktop — target score 90+ on Performance, Accessibility, Best Practices
    - Run Lighthouse CI or Chrome DevTools audit against the built application
    - Address any performance issues (render-blocking resources, unused JS, image optimization)
    - Address any accessibility findings (missing labels, contrast issues, focus order)
    - Verify scores meet threshold: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x] 11.7 Run `tsc --noEmit` and `eslint` — verify zero errors and zero warnings
  - [x] 11.8 Final visual review: verify color harmony, consistent spacing, and professional polish across all pages in both light and dark themes
    - Review all pages (Home, each tool workspace, canvas editor) in light theme for visual consistency
    - Review all pages in dark theme for proper token usage and contrast
    - Verify spacing consistency: all gaps, paddings, and margins align to 4px grid
    - Verify color harmony: primary, secondary, accent, success, and error colors share harmonious undertones
    - Verify typography: font sizes, weights, and line-heights are consistent with token definitions
    - Fix any visual inconsistencies found during review
    - _Requirements: 3.1, 3.2, 3.4, 3.7, 12.3, 12.8, 12.9_

- [-] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Phases 1–10 are complete. Only the final validation tasks (11.6, 11.8) and the final checkpoint remain.
- Task 11.6 (Lighthouse audit) requires running the built application and may surface performance or accessibility issues that need code fixes.
- Task 11.8 (Visual review) is a manual inspection pass to catch any remaining visual inconsistencies.
- Property-based tests validated invariants across all inputs during earlier phases.
- The canvas three-layer architecture supports future inline text editing without rework.
- All animations respect `prefers-reduced-motion` via the `useReducedMotion` hook.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["11.6"] },
    { "id": 1, "tasks": ["11.8"] }
  ]
}
```
