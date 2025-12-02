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
    'prettier/prettier': 'warn', // Downgrade prettier errors to warnings
    '@typescript-eslint/no-unused-vars': 'off', // Turn off unused vars for prototype velocity
    '@typescript-eslint/no-explicit-any': 'off', // Turn off no-explicit-any for prototype velocity
    'no-console': 'off'
  }
}