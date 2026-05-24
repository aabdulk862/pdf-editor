import { useCallback, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { validatePassword } from '@/utils/validation';

/**
 * PasswordProtectPage component - Allows users to encrypt a PDF with a password.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Enter and confirm a password (1-128 characters)
 * - Validate password match and length
 * - Trigger encryption via Web Worker
 * - Download the encrypted PDF on success
 * - Show toast on mismatch, empty, oversized password, or encryption failure
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7
 */
export function PasswordProtectPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();

  // Operation state
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptedData, setEncryptedData] = useState<ArrayBuffer | null>(null);

  // Handle file upload
  const handleFilesAccepted = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as ArrayBuffer;
        setPdfData(data);
        setFileName(file.name);
        setEncryptedData(null);
        setPassword('');
        setConfirmPassword('');
        setPasswordError(undefined);
        setConfirmError(undefined);
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

  // Validate and encrypt
  const handleEncrypt = useCallback(async () => {
    if (!pdfData) return;

    // Clear previous errors
    setPasswordError(undefined);
    setConfirmError(undefined);

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      const errorMsg = passwordValidation.error ?? 'Password must be between 1 and 128 characters.';
      setPasswordError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      const mismatchMsg = 'Passwords do not match.';
      setConfirmError(mismatchMsg);
      toast.error(mismatchMsg);
      return;
    }

    setIsEncrypting(true);
    setEncryptedData(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const result = await client.encrypt(pdfData, password);

      if (result.success && result.data) {
        setEncryptedData(result.data);
        toast.success('PDF encrypted successfully.');
      } else {
        toast.error(result.error ?? 'Encryption failed. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsEncrypting(false);
    }
  }, [pdfData, password, confirmPassword, toast]);

  // Download encrypted PDF
  const handleDownload = useCallback(() => {
    if (!encryptedData) return;

    const blob = new Blob([encryptedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_protected.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [encryptedData, fileName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setEncryptedData(null);
    setPassword('');
    setConfirmPassword('');
    setPasswordError(undefined);
    setConfirmError(undefined);
  }, []);

  // Handle password input change with live validation clearing
  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (passwordError) setPasswordError(undefined);
    },
    [passwordError],
  );

  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(e.target.value);
      if (confirmError) setConfirmError(undefined);
    },
    [confirmError],
  );

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Password Protect
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to encrypt it with a password. Only recipients with the password will be able
          to open the file.
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
            Password Protect
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* Password form */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-6 dark:border-secondary-700 dark:bg-secondary-800">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-4">
          Set Password
        </h2>
        <div className="space-y-4 max-w-md">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            error={passwordError}
            helperText="Must be between 1 and 128 characters."
            placeholder="Enter password"
            fullWidth
            autoComplete="new-password"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            error={confirmError}
            placeholder="Re-enter password"
            fullWidth
            autoComplete="new-password"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleEncrypt}
          loading={isEncrypting}
          disabled={isEncrypting}
        >
          {isEncrypting ? 'Encrypting...' : 'Encrypt PDF'}
        </Button>
        {encryptedData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download Protected PDF
          </Button>
        )}
      </div>
    </div>
  );
}

PasswordProtectPage.displayName = 'PasswordProtectPage';
