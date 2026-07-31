import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import tsdoc from 'eslint-plugin-tsdoc';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'docs/**',
      'docs-md/**',
      '_site/**',
      '.cache/**',
      '.playwright-mcp/**',
      '.ua/**',
      'eslint.config.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: { tsdoc },
    rules: {
      'tsdoc/syntax': 'error',
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  eslintConfigPrettier,
);
