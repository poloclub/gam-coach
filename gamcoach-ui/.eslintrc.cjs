module.exports = {
  'env': {
    'browser': true,
    'commonjs': true,
    'es6': true
  },
  'extends': [
    'eslint:recommended',
  ],
  'parser': '@babel/eslint-parser',
  'parserOptions': {
    'requireConfigFile': false,
  },
  'plugins': [
    'svelte3'
  ],
  'overrides': [
    {
      'files': ['*.svelte'],
      'processor': 'svelte3/svelte3'
    }
  ],
  'rules': {
    'indent': [
      'error',
      2,
      {'SwitchCase': 1}
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'always'
    ],
    'prefer-const': 'error',
    'max-len': [
      'warn', {
        'code': 80
      }
    ]
  },
  'settings': {
    'svelte3/ignore-styles': () => true
  },
  'root': true
};
