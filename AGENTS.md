# pi-hud-builtinplugins — Built-in HUD sections

Registers clock, context budget, git status, and working directory sections into pi-hud via the `hud_section` EventBus contract. If pi-hud isn't installed, emissions silently do nothing — no coupling required.

## Rules

- Git info (`fetchGit`) uses Node's `spawn` directly (not `pi.exec`) to avoid bash-layer restrictions like prepare-mode command-substitution blocks.
- Git is fetched once per refresh cycle and cached; all four sections share the same refresh triggers (`agent_start`, `message_end` for assistant only, `tool_execution_end`).
- Each section renders independently via its own `render(ctx)` callback — one bad render doesn't kill the others (handled by pi-hud's timeout/error isolation).

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Extension entry. Emits four `hud_section` events (clock, budget, git, cwd). Subscribes to `agent_start`, `message_end` (assistant), and `tool_execution_end` to refresh cached git info. |
| `sections.ts` | Section renderers + `fetchGit`. Exports `HudSection`-compatible render functions: `renderClock()` (full date + long time with timezone), `renderBudget(ctx)` (tokens/contextWindow/percent from `ctx.getContextUsage()`), `renderGit(gitInfo)` (branch + dirty count), `renderCwd(cwd)` (collapses $HOME to ~). `fetchGit()` runs single `git status --porcelain=v1 -b` via Node spawn (2s timeout), parses branch line and counts changed files. Returns null if not a git repo (exit code 128) or on error. |
| `package.json` | Name: @taylorsatula/pi-hud-builtinplugins v0.1.0. Entry: `./index.ts`. Peer dep: pi-coding-agent. |
