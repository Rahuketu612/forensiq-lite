module.exports = {
  root: true,
  ignorePatterns: ['dist/', 'node_modules/', '.turbo/', 'coverage/'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'import', 'react', 'react-hooks', 'simple-import-sort', 'tailwindcss'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'prettier',
  ],
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/await-thenable': 'warn',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',

    // Import
    'import/order': 'off',
    'import/newline-after-import': 'off',
    'import/no-duplicates': 'off',
    'import/no-unresolved': 'off',

    // React
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',

    // Simple Import Sort
    'simple-import-sort/imports': 'off',
    'simple-import-sort/exports': 'off',

    // Tailwind
    'tailwindcss/no-contradicton': 'off',

    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'prefer-const': 'off',
    'no-var': 'off',
  },
  overrides: [
    {
      files: ['*.json'],
      rules: { '@typescript-eslint/no-unused-vars': 'off' },
    },
  ],
};
