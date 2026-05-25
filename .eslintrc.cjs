/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports' },
    ],

    // React hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // General rules
    'no-console': 'warn',
    'no-debugger': 'error',

    // Design token enforcement: forbid raw gray-* Tailwind classes
    'no-restricted-syntax': [
      'warn',
      {
        selector:
          'JSXAttribute[name.name="className"] Literal[value=/\\b(bg|text|border|ring|divide|placeholder|from|via|to)-gray-/]',
        message:
          'Avoid raw gray-* Tailwind classes. Use secondary-* design token classes instead (e.g., bg-secondary-100, text-secondary-700, border-secondary-300).',
      },
      {
        selector:
          'JSXAttribute[name.name="className"] TemplateLiteral Literal[value=/\\b(bg|text|border|ring|divide|placeholder|from|via|to)-gray-/]',
        message:
          'Avoid raw gray-* Tailwind classes in template literals. Use secondary-* design token classes instead (e.g., bg-secondary-100, text-secondary-700, border-secondary-300).',
      },
    ],
  },
};
