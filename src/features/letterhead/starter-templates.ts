import type { LetterheadTemplate } from './types';

/**
 * Starter template data (without id, createdAt, updatedAt — those are added at creation time).
 */
export type StarterTemplateData = Omit<LetterheadTemplate, 'id' | 'createdAt' | 'updatedAt'>;

export interface StarterTemplateOption {
  /** Unique key for the starter */
  key: string;
  /** Display name */
  name: string;
  /** Short description of the layout */
  description: string;
  /** Factory function that returns template data */
  create: () => StarterTemplateData;
}

/**
 * Classic Corporate — Law firm / financial services style.
 * Logo top-left, company name bold navy left-aligned, thin accent line,
 * contact info in footer area centered with pipe separators.
 */
function createClassicTemplate(): StarterTemplateData {
  return {
    name: 'Classic Corporate',
    logo: null,
    companyName: {
      content: 'Harrison & Associates',
      fontFamily: 'Times',
      fontSize: 18,
      color: '#1a2332',
      alignment: 'left',
    },
    addressLines: [
      {
        content: '200 Park Avenue, 34th Floor, New York, NY 10166',
        fontFamily: 'Times',
        fontSize: 9,
        color: '#6b7280',
        alignment: 'center',
      },
    ],
    phone: {
      content: '(212) 555-0140',
      fontFamily: 'Times',
      fontSize: 9,
      color: '#6b7280',
      alignment: 'center',
    },
    email: {
      content: 'contact@harrisonlaw.com',
      fontFamily: 'Times',
      fontSize: 9,
      color: '#6b7280',
      alignment: 'center',
    },
    website: {
      content: 'www.harrisonlaw.com',
      fontFamily: 'Times',
      fontSize: 9,
      color: '#6b7280',
      alignment: 'center',
    },
    tagline: null,
    showSeparator: true,
    separatorColor: '#1a2332',
  };
}

/**
 * Modern Tech — Startup / tech company style.
 * Centered layout, company name in caps with letter-spacing,
 * tagline below in muted italic, contact in footer as a single line with bullets.
 */
function createModernTemplate(): StarterTemplateData {
  return {
    name: 'Modern Tech',
    logo: null,
    companyName: {
      content: 'NEXUS LABS',
      fontFamily: 'Helvetica',
      fontSize: 20,
      color: '#111827',
      alignment: 'center',
    },
    addressLines: [],
    phone: {
      content: '(415) 555-0198',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#9ca3af',
      alignment: 'center',
    },
    email: {
      content: 'hello@nexuslabs.io',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#9ca3af',
      alignment: 'center',
    },
    website: {
      content: 'nexuslabs.io',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#9ca3af',
      alignment: 'center',
    },
    tagline: {
      content: 'Engineering the future, one line at a time.',
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#9ca3af',
      alignment: 'center',
    },
    showSeparator: false,
    separatorColor: '#E5E7EB',
  };
}

/**
 * Creative Agency — Design studio style.
 * Logo top-left, company name in accent purple, left-aligned,
 * colored accent separator, contact in footer left-aligned.
 */
function createCreativeTemplate(): StarterTemplateData {
  return {
    name: 'Creative Agency',
    logo: null,
    companyName: {
      content: 'Prism Studio',
      fontFamily: 'Helvetica',
      fontSize: 16,
      color: '#7c3aed',
      alignment: 'left',
    },
    addressLines: [
      {
        content: '88 Design District, San Francisco, CA 94103',
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#6b7280',
        alignment: 'left',
      },
    ],
    phone: {
      content: '(415) 555-0237',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#6b7280',
      alignment: 'left',
    },
    email: {
      content: 'studio@prismcreative.co',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#6b7280',
      alignment: 'left',
    },
    website: {
      content: 'prismcreative.co',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#6b7280',
      alignment: 'left',
    },
    tagline: {
      content: 'Where ideas take shape.',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#9ca3af',
      alignment: 'left',
    },
    showSeparator: true,
    separatorColor: '#7c3aed',
  };
}

/**
 * Minimal Professional — Consultant / freelancer style.
 * No logo, company name in medium weight, thin light gray line,
 * all contact in a single footer line, maximum whitespace.
 */
function createMinimalTemplate(): StarterTemplateData {
  return {
    name: 'Minimal Professional',
    logo: null,
    companyName: {
      content: 'Elena Marchetti',
      fontFamily: 'Helvetica',
      fontSize: 14,
      color: '#374151',
      alignment: 'left',
    },
    addressLines: [],
    phone: {
      content: '(310) 555-0172',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#9ca3af',
      alignment: 'left',
    },
    email: {
      content: 'elena@marchetti.consulting',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#9ca3af',
      alignment: 'left',
    },
    website: {
      content: 'marchetti.consulting',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#9ca3af',
      alignment: 'left',
    },
    tagline: null,
    showSeparator: true,
    separatorColor: '#e5e7eb',
  };
}

/**
 * Organization / Non-Profit — Community organization or NGO style.
 * Inspired by real organizational letterheads with prominent name,
 * contact bar below header, and formal structure.
 */
function createOrganizationTemplate(): StarterTemplateData {
  return {
    name: 'Organization Letterhead',
    logo: null,
    companyName: {
      content: 'Global Community Foundation',
      fontFamily: 'Helvetica',
      fontSize: 18,
      color: '#1e3a5f',
      alignment: 'center',
    },
    addressLines: [
      {
        content: '1200 Constitution Ave NW, Washington, DC 20001',
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#6b7280',
        alignment: 'center',
      },
    ],
    phone: {
      content: '+1 (202) 555-0140',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#6b7280',
      alignment: 'center',
    },
    email: {
      content: 'info@globalcf.org',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#6b7280',
      alignment: 'center',
    },
    website: {
      content: 'www.globalcf.org',
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#1e3a5f',
      alignment: 'center',
    },
    tagline: {
      content: 'Empowering Communities Worldwide',
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#6b7280',
      alignment: 'center',
    },
    showSeparator: true,
    separatorColor: '#1e3a5f',
  };
}

/**
 * All available starter templates for the template picker.
 */
export const STARTER_TEMPLATES: StarterTemplateOption[] = [
  {
    key: 'classic',
    name: 'Classic Corporate',
    description: 'Law firm style — bold navy header, thin accent line, centered footer',
    create: createClassicTemplate,
  },
  {
    key: 'modern',
    name: 'Modern Tech',
    description: 'Centered caps with tagline, clean and minimal',
    create: createModernTemplate,
  },
  {
    key: 'creative',
    name: 'Creative Agency',
    description: 'Purple accent, left-aligned with colored separator',
    create: createCreativeTemplate,
  },
  {
    key: 'minimal',
    name: 'Minimal Professional',
    description: 'Maximum whitespace, just name and a subtle divider',
    create: createMinimalTemplate,
  },
  {
    key: 'organization',
    name: 'Organization',
    description: 'Non-profit / community org with centered header and contact bar',
    create: createOrganizationTemplate,
  },
];
