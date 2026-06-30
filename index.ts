/**
 * pi-hud-builtinplugins — Built-in HUD sections for pi-hud.
 *
 * Registers clock, context budget, git status, and working directory sections
 * via the hud_section EventBus contract. These appear alongside any other
 * contributed sections from extensions.
 *
 * If pi-hud isn't installed, these emissions silently do nothing — no coupling.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { fetchGit, renderBudget, renderClock, renderCwd, renderGit, type GitInfo } from "./sections";

export default function (pi: ExtensionAPI): void {
	// Cached git info. Refreshed on agent_start, assistant message_end,
	// and tool_execution_end so the git section stays ≤ one tool call stale.
	let gitInfo: GitInfo | null = null;

	// ── Register built-in sections ─────────────────────────────────────

	pi.events.emit("hud_section", {
		id: "builtin-clock",
		label: "Time",
		render: () => renderClock(),
	});

	pi.events.emit("hud_section", {
		id: "builtin-budget",
		label: "Context",
		render: (ctx: ExtensionContext) => renderBudget(ctx),
	});

	pi.events.emit("hud_section", {
		id: "builtin-git",
		label: "Git",
		render: () => renderGit(gitInfo),
	});

	pi.events.emit("hud_section", {
		id: "builtin-cwd",
		label: "CWD",
		render: (ctx: ExtensionContext) => renderCwd(ctx.cwd),
	});

	// ── Refresh triggers ───────────────────────────────────────────────

	// Fetch git info at the start of each user prompt.
	pi.on("agent_start", async (_event, ctx) => {
		gitInfo = await fetchGit(ctx.cwd);
	});

	// Fetch git info after every assistant message.
	pi.on("message_end", async (event, ctx) => {
		if (event.message.role !== "assistant") return;
		gitInfo = await fetchGit(ctx.cwd);
	});

	// Also refresh git info after each tool execution ends so the Git
	// section reflects state changes from file writes, edits, bash commands, etc.
	pi.on("tool_execution_end", async (_event, ctx) => {
		gitInfo = await fetchGit(ctx.cwd);
	});
}
