---
paths:
  - "packages/core/**/*.ts"
---

# Core Package Rules

## Two entry points

- `src/index.ts` → Node.js build (includes Node `crypto` for encryption)
- `src/browser.ts` → browser-safe subset (re-exports types and presets only)

Desktop app imports `@ccem/core/browser`. CLI imports `@ccem/core`. If you add a new export:
- Types and presets → add to both entry points
- Anything using Node APIs → add to `index.ts` only

## Build requirement

Desktop app cannot compile without core being built first. After changing core:
```bash
pnpm --filter @ccem/core build
```

## Shared types

All shared TypeScript interfaces live in `src/types.ts`: `EnvConfig`, `PermissionConfig`, `PermissionModeName`, `PermissionPreset`, `UsageStats`, `TokenUsageWithCost`, `UsageCache`, `ModelPrice`.

## Encryption

`src/utils.ts` has `encrypt`/`decrypt` (AES-256-CBC). The Rust backend (`crypto.rs`) must match this implementation exactly.
