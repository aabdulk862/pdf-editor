import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { NavBar } from '../components/ui/NavBar';
import { useOperationShortcuts } from '../features/shortcuts/useOperationShortcuts';
import { HomePage } from '../features/home/components/HomePage';
import { DeletePagesPage } from '../features/delete-pages/components/DeletePagesPage';
import { RotatePage } from '../features/rotate/components/RotatePage';
import { DuplicatePagesPage } from '../features/duplicate-pages/components/DuplicatePagesPage';
import { SplitPage } from '../features/split/components/SplitPage';
import { MergePage } from '../features/merge';
import { ReorderPage } from '../features/reorder';
import { PageNumbersPage } from '../features/page-numbers/components/PageNumbersPage';
import { ImageToPdfPage } from '../features/image-to-pdf/components/ImageToPdfPage';
import { CompressPage } from '../features/compress/components/CompressPage';
import { HighlightPage } from '../features/highlight/components/HighlightPage';
import { StampsPage } from '../features/stamps/components/StampsPage';
import { SignaturePage } from '../features/signature/components/SignaturePage';
import { WatermarksPage } from '../features/watermarks/components/WatermarksPage';
import { HeadersFootersPage } from '../features/headers-footers/components/HeadersFootersPage';
import { TextOverlayPage } from '../features/text-overlay/components/TextOverlayPage';
import { MetadataPage } from '../features/metadata/components/MetadataPage';
import { RedactPage } from '../features/redact/components/RedactPage';
import { FormFillPage } from '../features/form-fill/components/FormFillPage';
import { UnlockPage } from '../features/unlock/components/UnlockPage';
import { PasswordProtectPage } from '../features/password-protect/components/PasswordProtectPage';
import { PageSizePage } from '../features/page-size/components/PageSizePage';
import { PdfToImagePage } from '../features/pdf-to-image/components/PdfToImagePage';
import { ExtractImagesPage } from '../features/extract-images/components/ExtractImagesPage';
import { CropPage } from '../features/crop/components/CropPage';
import { LinearizePage } from '../features/linearize/components/LinearizePage';
import { ExtractTextPage } from '../features/extract-text/components/ExtractTextPage';
import { FlattenPage } from '../features/flatten/components/FlattenPage';
import { ComparePage } from '../features/compare/components/ComparePage';
import { BookmarksPage } from '../features/bookmarks/components/BookmarksPage';

function RootLayout() {
  useOperationShortcuts();

  return (
    <Layout sidebar={<NavBar />}>
      <div className="transition-opacity duration-200 ease-in-out">
        <Outlet />
      </div>
    </Layout>
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
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
