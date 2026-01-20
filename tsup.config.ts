import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  minify: true,
  dts: false,
  splitting: false,
  sourcemap: false,
  target: 'node18',
});
