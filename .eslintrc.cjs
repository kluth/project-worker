module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'
  ],
  env: {
    node: true,
    es6: true
  },
  rules: {
    'prettier/prettier': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }], // Enforce unused vars, allow _ prefix for ignored args
    '@typescript-eslint/no-explicit-any': 'error', // Disallow explicit any
    'no-console': ['error', { allow: ['warn', 'error'] }],
    '@typescript-eslint/explicit-module-boundary-types': 'warn', // Consider adding explicit types for exported functions
    '@typescript-eslint/no-non-null-assertion': 'warn', // Warn on non-null assertions
    '@typescript-eslint/consistent-type-imports': 'error', // Enforce consistent import types
  }
}