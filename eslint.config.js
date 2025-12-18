const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      // Error prevention
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': 'off', // Allow console in Node.js
      'no-undef': 'error',

      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',

      // Style (Prettier handles most of this)
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }]
    }
  },
  {
    ignores: [
      'node_modules/',
      'data/',
      'temp/',
      'coverage/',
      'client/'
    ]
  }
];
