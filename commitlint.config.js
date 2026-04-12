export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0, 'always', 100],
    'scope-enum': [
      2,
      'always',
      [
        'accounting',
        'auth',
        'business',
        'ci',
        'config',
        'db',
        'deps',
        'docker',
        'docs',
        'inertia',
        'shared-kernel',
        'testing',
        'user',
        'web',
      ],
    ],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci'],
    ],
  },
}
