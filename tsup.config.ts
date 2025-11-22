import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  clean: true,
  minify: true,
  dts: false,
  splitting: false,
  sourcemap: false,
  target: 'node16',
});
