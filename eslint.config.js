import eslint from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    ignores: ['.svelte-kit/**', '.venv/**', 'build/**', 'coverage/**', 'data/**', 'node_modules/**']
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      },
      globals: {
        Event: 'readonly',
        MouseEvent: 'readonly',
        document: 'readonly',
        queueMicrotask: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        HTMLElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDialogElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLMediaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        KeyboardEvent: 'readonly',
        window: 'readonly'
      }
    }
  },
  {
    files: ['lets-moka/web/**/*.js'],
    languageOptions: {
      globals: {
        Blob: 'readonly',
        DataTransfer: 'readonly',
        DOMParser: 'readonly',
        Event: 'readonly',
        FormData: 'readonly',
        URL: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly'
      }
    }
  }
);
