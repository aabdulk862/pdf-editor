import { useCallback, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';

/**
 * UnlockPage component - Allows users to remove password protection from a PDF.
 *
 * Features:
 * - Upload a password-protected PDF via drag-and-drop or click-to-browse
 * - Enter password to decrypt the file
 * - Allow re-entry on wrong password without re-uploading
 * - Show toast if file is not encrypted
 * - Download the unlocked PDF on success
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
export function UnlockPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Password state
  const [password, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  // Operation state
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedData, setDecryptedData] = useState<ArrayBuffer | null>(null);

  // Handle file upload
  const handleFilesAccepted = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as ArrayBuffer;

        // Check if the file appears to be encrypted (EPDF magic or standard PDF)
        const bytes = new Uint8Array(data);
        const decoder = new TextDecoder();
        const magic = decoder.decode(bytes.slice(0, 4));
        const pdfMagic = decoder.decode(bytes.slice(0, 5));

        if (magic !== 'EPDF' && pdfMagic === '%PDF-') {
          // It's a regular unencrypted PDF - inform the user
          toast.warning('This file is not encrypted and does not require unlocking.');
        }

        setPdfData(data);
        setFileName(file.name);
        setPassword('');
        setPasswordError('');
        setDecryptedData(null);
      };
      reader.onerror = () => {
        toast.error('Failed to read the file.');
      };
      reader.readAsArrayBuffer(file);
    },
    [toast],
  );

  const handleFileRejected = useCallback(
    (file: File, reason: string) => {
      toast.error(`File "${file.name}" rejected: ${reason}`);
    },
    [toast],
  );

  // Decrypt
  const handleDecrypt = useCallback(async () => {
    if (!pdfData) return;

    if (!password) {
      setPasswordError('Password is required.');
      return;
    }

    setPasswordError('');
    setIsDecrypting(true);
    setDecryptedData(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const result = await client.decrypt(pdfData, password);

      if (result.success && result.data) {
        setDecryptedData(result.data);
        toast.success('PDF unlocked successfully.');
      } else {
        const errorMsg = result.error ?? 'Failed to decrypt the PDF.';
        if (errorMsg.toLowerCase().includes('incorrect password')) {
          setPasswordError('Incorrect password. Please try again.');
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsDecrypting(false);
    }
  }, [pdfData, password, toast]);

  // Download
  const handleDownload = useCallback(() => {
    if (!decryptedData) return;

    const blob = new Blob([decryptedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_unlocked.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [decryptedData, fileName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setPassword('');
    setPasswordError('');
    setDecryptedData(null);
  }, []);

  // Handle Enter key in password field
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !isDecrypting) {
        handleDecrypt();
      }
    },
    [handleDecrypt, isDecrypting],
  );

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Unlock PDF
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a password-protected PDF to remove its encryption and download an unlocked version.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
            Unlock PDF
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* Password input and decrypt trigger */}
      {!decryptedData && (
        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-3">
            Enter Password
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full sm:w-auto">
              <Input
                type="password"
                label="Password"
                placeholder="Enter the PDF password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                onKeyDown={handleKeyDown}
                error={passwordError}
                fullWidth
                disabled={isDecrypting}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleDecrypt}
              loading={isDecrypting}
              disabled={isDecrypting}
              className="w-full sm:w-auto"
            >
              {isDecrypting ? 'Decrypting...' : 'Unlock PDF'}
            </Button>
          </div>
        </div>
      )}

      {/* Success state with download */}
      {decryptedData && (
        <div className="rounded-lg border border-success-200 bg-success-50 p-4 dark:border-success-700 dark:bg-success-900/20">
          <div className="flex items-center gap-3 mb-3">
            <svg
              className="w-6 h-6 text-success-600 dark:text-success-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-sm font-medium text-success-800 dark:text-success-300">
              PDF unlocked successfully
            </h2>
          </div>
          <p className="text-sm text-success-700 dark:text-success-400 mb-4">
            The password protection has been removed. You can now download the unlocked file.
          </p>
          <Button variant="primary" onClick={handleDownload}>
            Download Unlocked PDF
          </Button>
        </div>
      )}
    </div>
  );
}

UnlockPage.displayName = 'UnlockPage';
