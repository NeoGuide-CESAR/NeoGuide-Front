import parser from '@typescript-eslint/parser';
import ts from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['node_modules/**', 'dist/**', '.angular/**', 'coverage/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module' } },
    plugins: { '@typescript-eslint': ts },
    rules: {
      'no-constant-condition': 'error', 'no-debugger': 'error', 'no-unreachable': 'error',
      'no-duplicate-imports': 'error', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { files: ['**/*.js', '**/*.cjs', '**/*.mjs'], rules: { 'no-debugger': 'error', 'no-unreachable': 'error', 'no-constant-condition': 'error' } },
];
