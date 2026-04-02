Start the desktop app in development mode.

Steps:
1. First build the core package: `pnpm --filter @ccem/core build`
2. Then start Tauri dev: `cd apps/desktop && pnpm tauri dev`

If the Vite dev server port 1421 is already in use, kill the existing process first:
`lsof -ti:1421 | xargs kill -9 2>/dev/null`
