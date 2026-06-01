import nextEslintPluginNext from '@next/eslint-plugin-next';
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  { plugins: { '@next/next': nextEslintPluginNext } },
  ...nx.configs['flat/react-typescript'],
  ...baseConfig,
  {
    // generated build artifacts — gitignored, never hand-edited (see .gitignore)
    ignores: ['.next/**/*', '.open-next/**/*', '.wrangler/**/*'],
  },
];
