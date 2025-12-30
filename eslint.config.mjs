import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': false,
    },
  },
];
