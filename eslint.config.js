import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const rendererRules = {
  ...js.configs.recommended.rules,
  ...react.configs.recommended.rules,
  ...react.configs['jsx-runtime'].rules,
  ...reactHooks.configs.recommended.rules,
  'react/prop-types': 'off',
  'react/jsx-no-target-blank': 'off',
  'react-refresh/only-export-components': 'off',
};

export default [
  {
    ignores: [
      '.tmp/**',
      'dist/**',
      'dist-react/**',
      'release/**',
      'node_modules/**',
      'src-tauri/target/**',
    ],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: rendererRules,
  },
  {
    files: ['scripts/**/*.mjs', '*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
];
