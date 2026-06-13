import type { CanvasTemplate, TemplateCategory } from '../types';
import { blankTemplate } from './blank';
import { invoiceTemplate } from './invoice';
import { resumeTemplate } from './resume';
import { letterTemplate } from './letter';
import { presentationTemplate } from './presentation';
import {
  letterheadClassicTemplate,
  letterheadModernTemplate,
  letterheadOrgTemplate,
} from './letterhead';

const templates: CanvasTemplate[] = [
  blankTemplate,
  invoiceTemplate,
  resumeTemplate,
  letterTemplate,
  presentationTemplate,
  letterheadClassicTemplate,
  letterheadModernTemplate,
  letterheadOrgTemplate,
];

/**
 * Human-readable labels for each template category.
 */
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  blank: 'Blank Page',
  invoice: 'Invoice',
  resume: 'Resume',
  letter: 'Letter',
  presentation: 'Presentation',
  letterhead: 'Letterhead',
};

/**
 * Returns all available templates.
 */
export function getAllTemplates(): CanvasTemplate[] {
  return templates;
}

/**
 * Returns a template by its ID, or undefined if not found.
 */
export function getTemplateById(id: string): CanvasTemplate | undefined {
  return templates.find((t) => t.id === id);
}

/**
 * Returns all templates matching a given category.
 */
export function getTemplatesByCategory(category: TemplateCategory): CanvasTemplate[] {
  return templates.filter((t) => t.category === category);
}

/**
 * Returns all unique template categories that have at least one template.
 */
export function getTemplateCategories(): TemplateCategory[] {
  const categories = new Set(templates.map((t) => t.category));
  return Array.from(categories);
}

export { blankTemplate } from './blank';
export { invoiceTemplate } from './invoice';
export { resumeTemplate } from './resume';
export { letterTemplate } from './letter';
export { presentationTemplate } from './presentation';
export {
  letterheadClassicTemplate,
  letterheadModernTemplate,
  letterheadOrgTemplate,
} from './letterhead';
