import { configApp } from '@adonisjs/eslint-config'
import perfectionist from 'eslint-plugin-perfectionist'
import reactYouMightNotNeedAnEffect from 'eslint-plugin-react-you-might-not-need-an-effect'

const reactEffectRecommendedConfig = reactYouMightNotNeedAnEffect.configs.recommended
const reactEffectErrorRules = Object.fromEntries(
  Object.keys(reactEffectRecommendedConfig.rules).map((ruleName) => [ruleName, 'error'])
)

export default [
  {
    ignores: [
      '.adonisjs/**',
      '.sandbox/**',
      '.tmp/**',
      'build/**',
      'node_modules/**',
      'public/assets/**',
      'pnpm-lock.yaml',
      'tmp/**',
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...configApp(perfectionist.configs['recommended-natural']),
  {
    ...reactEffectRecommendedConfig,
    files: ['inertia/**/*.{ts,tsx}'],
    rules: {
      ...reactEffectRecommendedConfig.rules,
      ...reactEffectErrorRules,
    },
  },
  {
    files: ['inertia/client.ts'],
    rules: {
      '@adonisjs/no-backend-import-in-frontend': [
        'error',
        {
          allowed: ['@generated/registry/index.ts'],
        },
      ],
    },
  },
  {
    files: [
      '**/*_e2e.{ts,tsx,js,jsx}',
      '**/*_feat.{ts,tsx,js,jsx}',
      '**/*_spec.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/*.test.{ts,tsx,js,jsx}',
    ],
    rules: {
      'perfectionist/sort-imports': 'warn',
      'perfectionist/sort-named-imports': 'warn',
      'perfectionist/sort-objects': 'warn',
    },
  },
  {
    files: ['app/core/user_management/http/**/*.ts'],
    ignores: ['app/core/user_management/http/helpers/activity_log.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          message:
            'Use userManagementHttpLogger/recordUserManagementHttpEvent instead of direct ctx.logger.* calls.',
          selector:
            "MemberExpression[object.type='MemberExpression'][object.object.name='ctx'][object.property.name='logger']",
        },
      ],
    },
  },
]
