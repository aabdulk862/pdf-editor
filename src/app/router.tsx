import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AppShell } from './AppShell';
import { CategorizedNavBar } from '../features/navigation/CategorizedNavBar';
import { useNavStore } from '../features/navigation/store/nav-store';
import { useOperationShortcuts } from '../features/shortcuts/useOperationShortcuts';
import { GlobalDropZone } from '../features/global-drop-zone/GlobalDropZone';
import { CommandPalette } from '../features/command-palette/CommandPalette';
import { ShortcutReferencePanel } from '../features/shortcuts/ShortcutReferencePanel';
import { TabBar } from '../features/tabs/TabBar';
import { TabContent } from '../features/tabs/TabContent';
import { TemplateConfigScreen } from '../features/templates/TemplateConfigScreen';
import { TemplateProgress } from '../features/templates/TemplateProgress';
import { InstallPrompt } from '../features/canvas-editor/components/InstallPrompt';
import { EditorSkeleton } from '../features/canvas-editor/components/skeletons/EditorSkeleton';
import { ToolPageSkeleton } from './ToolPageSkeleton';

// Eagerly loaded — entry point
import { HomePage } from '../features/home/components/HomePage';

// Lazy-loaded tool pages for code splitting
const DeletePagesPage = lazy(() =>
  import('../features/delete-pages/components/DeletePagesPage').then((m) => ({
    default: m.DeletePagesPage,
  })),
);
const RotatePage = lazy(() =>
  import('../features/rotate/components/RotatePage').then((m) => ({
    default: m.RotatePage,
  })),
);
const DuplicatePagesPage = lazy(() =>
  import('../features/duplicate-pages/components/DuplicatePagesPage').then((m) => ({
    default: m.DuplicatePagesPage,
  })),
);
const SplitPage = lazy(() =>
  import('../features/split/components/SplitPage').then((m) => ({
    default: m.SplitPage,
  })),
);
const MergePage = lazy(() =>
  import('../features/merge').then((m) => ({
    default: m.MergePage,
  })),
);
const ReorderPage = lazy(() =>
  import('../features/reorder').then((m) => ({
    default: m.ReorderPage,
  })),
);
const PageNumbersPage = lazy(() =>
  import('../features/page-numbers/components/PageNumbersPage').then((m) => ({
    default: m.PageNumbersPage,
  })),
);
const ImageToPdfPage = lazy(() =>
  import('../features/image-to-pdf/components/ImageToPdfPage').then((m) => ({
    default: m.ImageToPdfPage,
  })),
);
const CompressPage = lazy(() =>
  import('../features/compress/components/CompressPage').then((m) => ({
    default: m.CompressPage,
  })),
);
const HighlightPage = lazy(() =>
  import('../features/highlight/components/HighlightPage').then((m) => ({
    default: m.HighlightPage,
  })),
);
const StampsPage = lazy(() =>
  import('../features/stamps/components/StampsPage').then((m) => ({
    default: m.StampsPage,
  })),
);
const SignaturePage = lazy(() =>
  import('../features/signature/components/SignaturePage').then((m) => ({
    default: m.SignaturePage,
  })),
);
const WatermarksPage = lazy(() =>
  import('../features/watermarks/components/WatermarksPage').then((m) => ({
    default: m.WatermarksPage,
  })),
);
const HeadersFootersPage = lazy(() =>
  import('../features/headers-footers/components/HeadersFootersPage').then((m) => ({
    default: m.HeadersFootersPage,
  })),
);
const TextOverlayPage = lazy(() =>
  import('../features/text-overlay/components/TextOverlayPage').then((m) => ({
    default: m.TextOverlayPage,
  })),
);
const MetadataPage = lazy(() =>
  import('../features/metadata/components/MetadataPage').then((m) => ({
    default: m.MetadataPage,
  })),
);
const RedactPage = lazy(() =>
  import('../features/redact/components/RedactPage').then((m) => ({
    default: m.RedactPage,
  })),
);
const FormFillPage = lazy(() =>
  import('../features/form-fill/components/FormFillPage').then((m) => ({
    default: m.FormFillPage,
  })),
);
const UnlockPage = lazy(() =>
  import('../features/unlock/components/UnlockPage').then((m) => ({
    default: m.UnlockPage,
  })),
);
const PasswordProtectPage = lazy(() =>
  import('../features/password-protect/components/PasswordProtectPage').then((m) => ({
    default: m.PasswordProtectPage,
  })),
);
const PageSizePage = lazy(() =>
  import('../features/page-size/components/PageSizePage').then((m) => ({
    default: m.PageSizePage,
  })),
);
const PdfToImagePage = lazy(() =>
  import('../features/pdf-to-image/components/PdfToImagePage').then((m) => ({
    default: m.PdfToImagePage,
  })),
);
const ExtractImagesPage = lazy(() =>
  import('../features/extract-images/components/ExtractImagesPage').then((m) => ({
    default: m.ExtractImagesPage,
  })),
);
const CropPage = lazy(() =>
  import('../features/crop/components/CropPage').then((m) => ({
    default: m.CropPage,
  })),
);
const LinearizePage = lazy(() =>
  import('../features/linearize/components/LinearizePage').then((m) => ({
    default: m.LinearizePage,
  })),
);
const ExtractTextPage = lazy(() =>
  import('../features/extract-text/components/ExtractTextPage').then((m) => ({
    default: m.ExtractTextPage,
  })),
);
const FlattenPage = lazy(() =>
  import('../features/flatten/components/FlattenPage').then((m) => ({
    default: m.FlattenPage,
  })),
);
const ComparePage = lazy(() =>
  import('../features/compare/components/ComparePage').then((m) => ({
    default: m.ComparePage,
  })),
);
const BookmarksPage = lazy(() =>
  import('../features/bookmarks/components/BookmarksPage').then((m) => ({
    default: m.BookmarksPage,
  })),
);
const OcrPage = lazy(() =>
  import('../features/ocr/components/OcrPage').then((m) => ({
    default: m.OcrPage,
  })),
);
const LetterheadPage = lazy(() =>
  import('../features/letterhead/components/LetterheadPage').then((m) => ({
    default: m.LetterheadPage,
  })),
);

// Lazy-loaded canvas editor (large feature module)
const CanvasEditorPage = lazy(() =>
  import('../features/canvas-editor/components/CanvasEditorPage').then((m) => ({
    default: m.CanvasEditorPage,
  })),
);

/** Route-level skeleton fallback for lazy-loaded tool pages */
function PageLoadingFallback() {
  return <ToolPageSkeleton />;
}

function RootLayout() {
  useOperationShortcuts();
  const location = useLocation();
  const addRecentTool = useNavStore((state) => state.addRecentTool);

  // Track recent tool usage on route changes
  useEffect(() => {
    const path = location.pathname;
    // Only track tool routes (not home or unknown routes)
    if (path !== '/' && path !== '') {
      addRecentTool(path);
    }
  }, [location.pathname, addRecentTool]);

  return (
    <GlobalDropZone>
      <AppShell sidebar={<CategorizedNavBar />}>
        <TabBar />
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          <TabContent>
            <div className="motion-safe:animate-page-enter">
              <Suspense fallback={<PageLoadingFallback />}>
                <Outlet />
              </Suspense>
            </div>
          </TabContent>
        </div>
      </AppShell>

      {/* Portal-based overlays */}
      <CommandPalette />
      <ShortcutReferencePanel />
      <TemplateConfigScreen />
      <TemplateProgress />
      <InstallPrompt />
    </GlobalDropZone>
  );
}

function NotFoundPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-error-600 dark:text-error-400">
        404 - Page Not Found
      </h1>
      <p className="text-secondary-500 dark:text-secondary-400">
        The page you are looking for does not exist.
      </p>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/merge" element={<MergePage />} />
          <Route path="/split" element={<SplitPage />} />
          <Route path="/rotate" element={<RotatePage />} />
          <Route path="/delete-pages" element={<DeletePagesPage />} />
          <Route path="/reorder" element={<ReorderPage />} />
          <Route path="/compress" element={<CompressPage />} />
          <Route path="/image-to-pdf" element={<ImageToPdfPage />} />
          <Route path="/page-numbers" element={<PageNumbersPage />} />
          <Route path="/extract-images" element={<ExtractImagesPage />} />
          <Route path="/text-overlay" element={<TextOverlayPage />} />
          <Route path="/highlight" element={<HighlightPage />} />
          <Route path="/signature" element={<SignaturePage />} />
          <Route path="/stamps" element={<StampsPage />} />
          <Route path="/watermarks" element={<WatermarksPage />} />
          <Route path="/password-protect" element={<PasswordProtectPage />} />
          <Route path="/unlock" element={<UnlockPage />} />
          <Route path="/redact" element={<RedactPage />} />
          <Route path="/metadata" element={<MetadataPage />} />
          <Route path="/form-fill" element={<FormFillPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/extract-text" element={<ExtractTextPage />} />
          <Route path="/pdf-to-image" element={<PdfToImagePage />} />
          <Route path="/flatten" element={<FlattenPage />} />
          <Route path="/crop" element={<CropPage />} />
          <Route path="/headers-footers" element={<HeadersFootersPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/page-size" element={<PageSizePage />} />
          <Route path="/linearize" element={<LinearizePage />} />
          <Route path="/duplicate-pages" element={<DuplicatePagesPage />} />
          <Route path="/ocr" element={<OcrPage />} />
          <Route path="/letterhead" element={<LetterheadPage />} />
          <Route
            path="/canvas-editor"
            element={
              <Suspense fallback={<EditorSkeleton />}>
                <CanvasEditorPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
