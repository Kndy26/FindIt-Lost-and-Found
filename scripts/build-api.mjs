import { builtinModules } from 'node:module';
import esbuild from 'esbuild';

async function buildApi() {
  console.log('Bundling api/index.ts for Vercel serverless...');
  await esbuild.build({
    entryPoints: ['api/index.ts'],
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
