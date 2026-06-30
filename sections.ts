/**
 * Built-in HUD section renderers.
 *
 * Each section is a small pure function that returns a string line, or null
 * when the section has nothing useful to show (e.g. not a git repo, or
 * context usage unavailable). The composer drops nulls, so empty sections
 * never produce empty headers in the HUD.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";
import { homedir } from "node:os";

export interface GitInfo {
	branch: string;
	dirty: number;
}

/**
 * Fetch git branch + dirty count in a single `git status --porcelain=v1 -b`.
 * Uses Node's spawn directly (not pi.exec) to avoid bash-layer restrictions
 * like prepare-mode command-substitution blocks. Fault-tolerant: returns null
 * if cwd is not a git repo, git is missing, or the call times out. Never throws.
 */
export async function fetchGit(cwd: string): Promise<GitInfo | null> {
	try {
		const child = spawn("git", ["status", "--porcelain=v1", "-b"], {
			cwd,
			timeout: 2000,
		});

		let stdout = "";
		child.stdout.on("data", (chunk) => (stdout += chunk));

		await new Promise<void>((resolve) => {
			child.on("close", () => resolve());
			child.on("error", () => resolve());
		});

		// 128 = "not a git repository" (and similar fatal errors)
		if (child.exitCode !== 0) return null;

		const lines = stdout.split("\n").filter((l) => l.length > 0);
		if (lines.length === 0) return null;

		const branchLine = lines[0] ?? "";
		let branch = branchLine;
		if (branch.startsWith("## ")) {
			// e.g. "## main" or "## main...origin/main [ahead 1]"
			branch = branch.slice(3).split("...")[0].trim();
		}
		if (!branch || branch === "No commits yet") branch = "(no commits)";

		// First line is the branch line; the rest are changed files.
		const dirty = Math.max(0, lines.length - 1);
		return { branch, dirty };
	} catch {
		return null;
	}
}

/** Current date/time with timezone, unambiguous for a model. */
export function renderClock(): string {
	return `Time: ${new Date().toLocaleString("en-US", {
		dateStyle: "full",
		timeStyle: "long",
	})}`;
}

/** Context budget from pi's live usage estimate. */
export function renderBudget(ctx: ExtensionContext): string | null {
	const usage = ctx.getContextUsage();
	if (!usage) return null;

	if (usage.tokens != null && usage.percent != null) {
		return `Context: ${usage.tokens.toLocaleString()} / ${usage.contextWindow.toLocaleString()} tokens (${usage.percent.toFixed(1)}%)`;
	}
	// tokens unknown (e.g. right after compaction, before next response)
	return `Context window: ${usage.contextWindow.toLocaleString()} tokens`;
}

/** Git branch + working-tree change count. */
export function renderGit(git: GitInfo | null): string | null {
	if (!git) return null;
	const state =
		git.dirty > 0
			? `· ${git.dirty} change${git.dirty === 1 ? "" : "s"}`
			: "(clean)";
	return `Git: ${git.branch} ${state}`;
}

/** Working directory, with $HOME collapsed to ~ for readability. */
export function renderCwd(cwd: string): string {
	const home = homedir();
	let display = cwd;
	if (home && (cwd === home || cwd.startsWith(`${home}/`))) {
		display = `~${cwd.slice(home.length)}`;
	}
	return `CWD: ${display}`;
}
