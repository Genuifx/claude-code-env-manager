# Desktop Pet Overlay Design

Date: 2026-05-07

## Summary

Add an optional desktop pet for CCEM Desktop. The pet is a small golden cat that lives in a separate transparent always-on-top Tauri window. It shows a stacked notification flow beside the cat for active sessions, sessions that finished but have not been read, failed or interrupted sessions, and sessions waiting for user input or approval.

The first version is intentionally small:

- Settings toggle controls whether the pet window is shown.
- Pet window is independent from the main CCEM window.
- Notifications show at most five sessions.
- Sessions with the newest update move to the front immediately.
- Completed, failed, and interrupted notifications disappear after the user opens them.
- Running and attention-needed notifications remain while their state is still active.

## User Decisions

- Use an independent Tauri `pet` webview window.
- Default setting is off.
- Use the selected flat golden cat asset, not the blue robot reference.
- Use stacked notification flow, not a single primary bubble or dashboard layout.
- Show at most five bubbles.
- Sort by most recent session update first.
- Include running sessions, unread completed sessions, failed/interrupted sessions, and attention-needed sessions.
- Completed, failed, and interrupted bubbles are marked read and disappear after the user opens the session.

## Non-Goals

- No dragging or position memory in the first version.
- No pet animations beyond a small hover/idle treatment if cheap in CSS.
- No custom pet selection or naming UI.
- No cross-device sync of read state.
- No replacement for system notifications.

## Visual Design

The pet window renders a compact scene:

- Golden cat sits at the lower-right of the pet window.
- Session bubbles stack to the cat's left.
- Bubbles use dark translucent surfaces so they remain legible over arbitrary desktops.
- Status colors:
  - Attention needed: orange `!`
  - Failed/interrupted: red `x`
  - Completed unread: green check
  - Running: small golden live dot
- If more than five eligible sessions exist, only the five most recently updated are shown in v1.

The selected cat source currently exists as a design artifact:

`/Users/zkyo/Desktop/projects/claude-code-env-manager/.artifacts/ccem-pet-cat-selected-transparent.png`

During implementation, copy the final asset into a tracked desktop asset path such as:

`apps/desktop/src/assets/pet/golden-cat.png`

## Window Behavior

Add a second Tauri webview window with label `pet`.

Desired window properties:

- Transparent
- Decorations disabled
- Always on top
- Hidden from taskbar/dock where Tauri supports it
- Non-resizable
- Starts hidden unless `desktopPetEnabled` is true
- Default screen placement: bottom-right with a small margin from screen edges

The first version may use a fixed bounding rectangle large enough for five bubbles and the cat. Transparent pixels inside the window can still capture clicks on some platforms; keep the rectangle as compact as practical to reduce desktop occlusion.

## Settings

Extend desktop settings stored in `~/.ccem/settings.json`:

```json
{
  "desktopPetEnabled": false
}
```

Rust:

- Add `desktop_pet_enabled: bool` to `DesktopSettings`.
- Default to `false`.
- Update `save_settings` to merge and persist the field.
- After settings save, synchronize the pet window visibility.

Frontend:

- Extend `DesktopSettings` type.
- Add a "Desktop Pet" toggle in Settings, likely in the Application card.
- The toggle autosaves using the existing Settings page autosave flow.

## Frontend Architecture

Use the same React bundle for both windows. At startup, inspect the current Tauri window label:

- `main` renders the existing app.
- `pet` renders a lightweight `PetOverlayApp`.

`PetOverlayApp` responsibilities:

- Load pet notifications.
- Subscribe to notification update events.
- Render the selected golden cat asset and stacked bubbles.
- Handle bubble clicks by invoking the open/read command.

Keep the pet overlay component separate from the existing sidebar `components/pet/*` RPG companion prototype. The existing prototype reads Claude's companion data from `~/.claude.json`; this new feature is a desktop session companion and should not depend on that data.

## Notification Model

Add a shared TypeScript/Rust-facing shape:

```ts
type PetNotificationKind = 'attention' | 'failed' | 'completed' | 'running';

interface PetNotification {
  id: string;
  sessionId: string;
  runtimeKind?: 'interactive' | 'headless' | 'native' | 'terminal';
  client: 'claude' | 'codex' | 'opencode' | string;
  title: string;
  subtitle: string;
  projectDir: string;
  kind: PetNotificationKind;
  updatedAt: string;
  read: boolean;
  openTarget: {
    tab: 'workspace' | 'sessions';
    sessionId: string;
  };
}
```

`id` should be stable for a specific session notification state. For terminal completion/failure events, include the session id and terminal state. For running and attention notifications, use the runtime/session id.

`updatedAt` is the time of the latest user-visible change for that session notification. It should update when status changes, output arrives, a permission or question prompt appears, a task finishes, or a failure/interruption is observed. It should not be limited to session creation time.

## Sorting And Eligibility

Eligibility:

- Include running sessions.
- Include attention-needed sessions while approval, plan review, question, or prompt is pending.
- Include completed sessions only if unread.
- Include failed or interrupted sessions only if unread.

Ordering:

1. Sort by `updatedAt` descending.
2. If timestamps are tied or within a short debounce window such as one second, use state priority:
   - attention
   - failed
   - completed
   - running
3. Limit to five notifications.

"Newest update first" is the main rule. Priority only breaks ties or near-ties, so any session with fresh activity can move to the front.

## Read State

Read state is UI state, not a user preference. Store it outside `settings.json`.

Recommended file:

`~/.ccem/pet-notifications.json`

Shape:

```json
{
  "read": {
    "terminal:session-123:completed": "2026-05-07T10:12:00Z"
  }
}
```

Rules:

- Mark completed, failed, and interrupted notifications read when the user opens their bubble.
- Also mark them read when the same session is opened from the main window.
- Do not mark running notifications read.
- Attention-needed notifications should remain visible until the attention condition is resolved.

## IPC

IPC means "inter-process communication": the React frontend calls Rust commands and Rust emits events back to frontend windows. In this feature it is the bridge between the main app window, the pet window, and the Rust session state.

New or extended commands:

- `get_pet_notifications() -> Vec<PetNotification>`
- `open_pet_notification(notification_id: String) -> Result<(), String>`
- `mark_pet_notification_read(notification_id: String) -> Result<(), String>`
- `sync_pet_window_visibility(enabled: bool) -> Result<(), String>` if settings save does not call the helper directly.

Events:

- `pet-notifications-updated`
- `pet-open-session`

Expected flow:

1. Session state changes in Rust or a frontend session view observes a meaningful update.
2. Backend emits `pet-notifications-updated`.
3. `PetOverlayApp` reloads notifications.
4. User clicks a bubble.
5. Pet window calls `open_pet_notification`.
6. Backend shows/focuses the main window and emits `pet-open-session` to it.
7. Main app navigates to the target session.
8. Backend marks terminal completed/failed/interrupted notifications read where appropriate and emits another update.

## Opening A Session

Main window behavior after `pet-open-session`:

- Bring the main window to the front.
- Navigate to Workspace for native/headless workspace sessions when possible.
- Navigate to Sessions for legacy terminal/tmux sessions if Workspace cannot directly show them.
- Select or focus the target session.

If the target session no longer exists, show the main window and navigate to History or Sessions with a non-blocking toast.

## Data Sources

Use existing session state first:

- `list_native_sessions`
- `list_unified_sessions`
- legacy terminal session events: `task-completed`, `task-error`, `session-interrupted`
- interactive/headless/native event replay for attention state

For v1, prefer a backend-owned notification aggregator so both windows see the same state and read markers are centralized. The pet frontend should avoid duplicating Workspace's transcript reconstruction logic.

## Error Handling

- If the pet asset fails to load, render no broken image icon; hide the pet image area and keep bubbles usable.
- If notification load fails, show only the cat and retry on the next event or poll interval.
- If opening a session fails, keep the bubble visible and show a compact error toast in the main window when possible.
- If the `pet` window cannot be created, keep the setting enabled but report the window creation error through Settings toast; do not crash the app.

## Testing

Unit tests:

- Settings serialization defaults `desktopPetEnabled` to false.
- Notification ordering sorts most recent updates first.
- Tied notification ordering uses attention > failed > completed > running.
- Completed/failed/interrupted notifications disappear after being marked read.
- Running notifications remain eligible even if opened.

Frontend tests:

- Pet notification list renders at most five bubbles.
- Bubble click calls the open command with the notification id.
- Status kinds map to the correct visual class.

Manual desktop self-test:

1. Start `apps/desktop` with `pnpm tauri dev`.
2. Open Settings and enable Desktop Pet.
3. Confirm a transparent always-on-top pet window appears near the bottom-right.
4. Launch at least two sessions and confirm running bubbles show.
5. Complete one session and confirm it appears as unread completed.
6. Click the completed bubble and confirm the main window opens the session and the bubble disappears.
7. Trigger or simulate failed/interrupted/attention-needed states and confirm they show and sort to the front when updated.
8. Disable Desktop Pet and confirm the pet window hides.

## Open Implementation Notes

- The chosen cat asset currently lives under `.artifacts/`, which is ignored. Implementation must copy it to a tracked asset path.
- The old sidebar `PetEntry` remains out of scope unless the implementation naturally removes dead code. Do not conflate it with the desktop overlay feature.
- `.superpowers/brainstorm/` is a temporary visual companion directory and should not be committed.
