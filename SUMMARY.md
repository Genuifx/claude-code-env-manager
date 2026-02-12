# Beta: Master-Detail History Layout

## Overview
Full-page master-detail layout for browsing Claude Code conversation history, inspired by claude-run's original design.

## Architecture

### Rust Backend (`src-tauri/src/history.rs`)
- `get_conversation_history()` — parses `~/.claude/history.jsonl` into a sorted session list
- `get_conversation_messages(session_id)` — finds and parses the matching `.jsonl` file under `~/.claude/projects/*/`
- Handles flexible timestamp formats (epoch ms or ISO strings)
- Registered in `main.rs` as Tauri commands

### Frontend
- **`pages/History.tsx`** — Full-page dual-panel layout (280px left + flex-1 right)
- **`components/history/HistoryList.tsx`** — Session list with search, project filter, relative timestamps
- **`components/history/MessageBubble.tsx`** — Message renderer supporting text, thinking, tool_use, tool_result content blocks with collapsible panels

### Navigation
- Added to SideRail under Workspace group (shortcut: Cmd+6)
- Settings moved to Cmd+7

### Design
- Left panel uses `glass-subtle glass-noise` for frosted sidebar effect
- Message bubbles: user = `bg-primary/80` right-aligned, assistant = `glass-subtle` left-aligned
- Thinking blocks use amber icon, tool blocks use primary/destructive colors
- Skeleton loading states for both panels
- Full i18n support (zh + en)
