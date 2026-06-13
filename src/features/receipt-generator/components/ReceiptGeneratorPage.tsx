import { useState } from 'react';
import { SingleReceiptForm } from './SingleReceiptForm';
import { BulkGenerator } from './BulkGenerator';
import type { OrganizationContext } from '../types';

type Mode = 'single' | 'bulk';

export function ReceiptGeneratorPage() {
  const [mode, setMode] = useState<Mode>('single');
  const [organization, setOrganization] = useState<OrganizationContext>({
    name: '',
    logo: null,
    address: '',
    footerText: '',
    taxDeductible: false,
    currency: 'USD',
  });

  const updateOrg = (field: keyof OrganizationContext, value: any) => {
    setOrganization((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mimeType = file.type as 'image/png' | 'image/jpeg';
    if (mimeType !== 'image/png' && mimeType !== 'image/jpeg') return;
    file.arrayBuffer().then((data) => {
      updateOrg('logo', { data, mimeType });
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          Receipt & Invoice Generator
        </h1>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
          Generate professional receipts and invoices for any organization. All processing is local
          — no data leaves your device.
        </p>
      </div>

      {/* Organization Context */}
      <section className="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">
          Organization Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
              Organization Name *
            </label>
            <input
              type="text"
              value={organization.name}
              onChange={(e) => updateOrg('name', e.target.value)}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
              placeholder="GAMEC, Adverse Solutions, etc."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
              Currency
            </label>
            <select
              value={organization.currency}
              onChange={(e) => updateOrg('currency', e.target.value)}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
              <option value="NGN">NGN (₦)</option>
              <option value="GHS">GHS (₵)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
            Address (optional)
          </label>
          <input
            type="text"
            value={organization.address}
            onChange={(e) => updateOrg('address', e.target.value)}
            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
            placeholder="123 Main St, City, State"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
              Logo (PNG/JPG, optional)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleLogoUpload}
              className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-secondary-100 dark:file:bg-secondary-700 file:text-secondary-700 dark:file:text-secondary-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
              Footer Text (optional)
            </label>
            <input
              type="text"
              value={organization.footerText}
              onChange={(e) => updateOrg('footerText', e.target.value)}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
              placeholder="EIN: 12-3456789"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
          <input
            type="checkbox"
            checked={organization.taxDeductible}
            onChange={(e) => updateOrg('taxDeductible', e.target.checked)}
            className="rounded"
          />
          Include tax-deductible statement (nonprofit mode)
        </label>
      </section>

      {/* Mode Toggle */}
      <div className="flex rounded-lg border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <button
          onClick={() => setMode('single')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'single'
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
          }`}
        >
          Single Receipt
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'bulk'
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
          }`}
        >
          Bulk Generator
        </button>
      </div>

      {/* Active Mode Content */}
      {!organization.name ? (
        <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-8">
          Enter an organization name above to get started.
        </p>
      ) : mode === 'single' ? (
        <SingleReceiptForm organization={organization} />
      ) : (
        <BulkGenerator organization={organization} />
      )}
    </div>
  );
}
