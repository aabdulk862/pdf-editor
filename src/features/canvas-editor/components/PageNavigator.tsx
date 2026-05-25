import { useCanvasStore } from '../store/canvas-store';
import { MAX_PAGES } from '../constants';

/**
 * PageNavigator displays a vertical sidebar with page thumbnails.
 *
 * Features:
 * - Thumbnail representation of each page (clickable to switch active page)
 * - Active page highlighted with a colored border
 * - "Add Page" button at the bottom
 * - Delete button on each page thumbnail (hidden when only 1 page exists)
 * - Page count display (e.g., "3 / 100")
 *
 * Requirements: 1.7, 1.8
 */
export function PageNavigator() {
  const document = useCanvasStore((s) => s.document);
  const addPage = useCanvasStore((s) => s.addPage);
  const removePage = useCanvasStore((s) => s.removePage);
  const setActivePage = useCanvasStore((s) => s.setActivePage);

  if (!document) return null;

  const { pages, activePageIndex } = document;

  return (
    <aside
      className="flex flex-col w-[140px] bg-secondary-900 border-r border-secondary-700 overflow-y-auto py-3 px-2 gap-2"
      aria-label="Page navigator"
      data-testid="page-navigator"
    >
      {/* Page count header */}
      <div className="text-xs text-secondary-400 text-center pb-1 border-b border-secondary-700 mb-1">
        {pages.length} / {MAX_PAGES}
      </div>
      {pages.map((page, index) => {
        const isActive = index === activePageIndex;
        const aspectRatio = page.width / page.height;
        // Thumbnail width is fixed at 112px (w-[112px] inside the sidebar)
        // Height is derived from aspect ratio
        const thumbWidth = 112;
        const thumbHeight = Math.round(thumbWidth / aspectRatio);

        return (
          <div key={page.id} className="relative group">
            {/* Page number label */}
            <span className="text-[10px] text-secondary-400 mb-0.5 block text-center">
              {index + 1}
            </span>

            {/* Thumbnail button */}
            <button
              type="button"
              onClick={() => setActivePage(index)}
              className={`relative w-full rounded-md overflow-hidden transition-all duration-normal ease-in-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-blue-400 outline-none ${
                isActive
                  ? 'ring-2 ring-blue-500 shadow-md'
                  : 'ring-1 ring-secondary-600 hover:ring-secondary-400'
              }`}
              style={{ height: `${Math.min(thumbHeight, 160)}px` }}
              aria-label={`Page ${index + 1}${isActive ? ' (active)' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Simplified page thumbnail representation */}
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: page.backgroundColor }}
              >
                {page.elements.length > 0 ? (
                  <div className="w-[90%] h-[90%] relative">
                    {/* Render simplified element indicators */}
                    {page.elements.slice(0, 8).map((el) => {
                      // Scale element positions to thumbnail size
                      const scaleX = (thumbWidth * 0.9) / page.width;
                      const scaleY = (Math.min(thumbHeight, 160) * 0.9) / page.height;
                      const left = el.x * scaleX;
                      const top = el.y * scaleY;
                      const width = Math.max(4, el.width * scaleX);
                      const height = Math.max(4, el.height * scaleY);

                      return (
                        <div
                          key={el.id}
                          className={`absolute rounded-sm ${
                            el.type === 'text'
                              ? 'bg-blue-400/40'
                              : el.type === 'image'
                                ? 'bg-green-400/40'
                                : el.type === 'shape'
                                  ? 'bg-purple-400/40'
                                  : 'bg-secondary-400/40'
                          }`}
                          style={{
                            left: `${left}px`,
                            top: `${top}px`,
                            width: `${width}px`,
                            height: `${height}px`,
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-secondary-400 text-[9px]">Empty</span>
                )}
              </div>
            </button>

            {/* Delete button (only shown when more than 1 page) */}
            {pages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removePage(index);
                }}
                className="absolute -top-1 -right-1 min-w-[44px] min-h-[44px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-normal ease-out focus-visible:opacity-100 outline-none"
                aria-label={`Delete page ${index + 1}`}
              >
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center hover:bg-red-500">
                  ✕
                </span>
              </button>
            )}
          </div>
        );
      })}

      {/* Add Page button */}
      <button
        type="button"
        onClick={() => addPage()}
        disabled={pages.length >= MAX_PAGES}
        className={`mt-2 w-full min-h-[44px] rounded-md border border-dashed text-sm flex items-center justify-center transition-colors duration-normal ease-in-out focus-visible:ring-2 focus-visible:ring-blue-400 outline-none ${
          pages.length >= MAX_PAGES
            ? 'border-secondary-700 text-secondary-600 cursor-not-allowed'
            : 'border-secondary-500 text-secondary-400 hover:border-blue-400 hover:text-blue-400'
        }`}
        aria-label={
          pages.length >= MAX_PAGES
            ? `Cannot add page: maximum ${MAX_PAGES} pages reached`
            : 'Add new page'
        }
        title={pages.length >= MAX_PAGES ? `Maximum ${MAX_PAGES} pages reached` : undefined}
      >
        {pages.length >= MAX_PAGES ? 'Max pages reached' : '+ Add Page'}
      </button>
    </aside>
  );
}
