/**
 * EditorSkeleton - Full editor layout skeleton shown during route transitions.
 *
 * Displays a toolbar skeleton (row of rounded rects), canvas area skeleton
 * (large rect with pulse animation), and properties panel skeleton (stacked lines).
 *
 * Appears within 100ms of operation starting via CSS animation.
 *
 * Requirements: 23.1, 23.5
 */
export function EditorSkeleton() {
  return (
    <div
      className="flex h-[calc(100vh-3.5rem)] md:h-screen w-full overflow-hidden"
      aria-label="Loading editor"
      aria-busy="true"
      role="status"
    >
      {/* Page navigator skeleton (left sidebar) */}
      <div className="hidden md:flex flex-col w-[72px] border-r border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800 p-2 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="w-full aspect-[3/4] rounded-md bg-secondary-200 dark:bg-secondary-700 animate-pulse motion-reduce:animate-none"
          />
        ))}
      </div>

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col relative bg-[#1a1a2e]">
        {/* Floating toolbar skeleton */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-2 bg-white/90 dark:bg-secondary-800/90 backdrop-blur-sm rounded-xl shadow-md">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-lg bg-secondary-200 dark:bg-secondary-700 animate-pulse motion-reduce:animate-none"
              style={{ animationDelay: `${i * 75}ms` }}
            />
          ))}
        </div>

        {/* Canvas page skeleton */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-[60%] max-w-[500px] aspect-[210/297] bg-white rounded-sm shadow-xl animate-pulse motion-reduce:animate-none" />
        </div>
      </div>

      {/* Properties panel skeleton (right side) */}
      <div className="hidden lg:flex flex-col w-[320px] border-l border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-4 gap-4">
        {/* Panel title */}
        <div className="h-5 w-24 rounded bg-secondary-200 dark:bg-secondary-700 animate-pulse motion-reduce:animate-none" />

        {/* Property groups */}
        {Array.from({ length: 3 }, (_, groupIdx) => (
          <div key={groupIdx} className="flex flex-col gap-2.5">
            <div
              className="h-3 w-16 rounded bg-secondary-200 dark:bg-secondary-700 animate-pulse motion-reduce:animate-none"
              style={{ animationDelay: `${groupIdx * 100}ms` }}
            />
            {Array.from({ length: 3 }, (_, lineIdx) => (
              <div
                key={lineIdx}
                className="h-9 w-full rounded-md bg-secondary-100 dark:bg-secondary-700 animate-pulse motion-reduce:animate-none"
                style={{ animationDelay: `${(groupIdx * 3 + lineIdx) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
