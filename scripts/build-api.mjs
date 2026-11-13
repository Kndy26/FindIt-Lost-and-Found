import { builtinModules } from 'node:module';
import esbuild from 'esbuild';

async function buildApi() {
  console.log('Bundling server.ts into api/index.js for Vercel...');
  await esbuild.build({
    entryPoints: ['server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: 'api/index.js',
    external: [
      ...builtinModules,
      ...builtinModules.map((m) => `node:${m}`),
      'vite',
      'pglite',
      '@electric-sql/pglite',
    ],
    sourcemap: false,
    minify: false,
  });
  console.log('api/index.js bundled successfully!');
}

buildApi().catch((err) => {
  console.error('Failed to bundle API:', err);
  process.exit(1);
});
