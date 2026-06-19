import { App, TFile } from "obsidian";
import type { MarkdownPostProcessorContext } from "obsidian";
import { type IconTarget, TASK_LINE_REGEX } from "../types";
import { normalizeChar } from "../utils";

/** Reads and writes the bracketed character of a task line at a given {@link IconTarget}. */
export class CheckboxService {
	constructor(private app: App) {}

	/** Read the current bracketed character from the target, or `null` if it can't be resolved. */
	async readChar(target: IconTarget): Promise<string | null> {
		if (target.kind === "live") {
			const num = target.getLineNumber();
			if (num == null) return null;
			const line = target.view.state.doc.line(num);
			const m = TASK_LINE_REGEX.exec(line.text);
			if (!m) return null;
			return normalizeChar(m[2]);
		}
		const info = await this.resolveReadingTarget(target);
		if (!info) return null;
		const m = TASK_LINE_REGEX.exec(info.lines[info.lineIndex]);
		if (!m) return null;
		return normalizeChar(m[2]);
	}

	/** Write `nextChar` into the brackets at the target. Empty string means unchecked. */
	async writeChar(target: IconTarget, nextChar: string): Promise<void> {
		const charForFile = nextChar === "" ? " " : nextChar;

		if (target.kind === "live") {
			const num = target.getLineNumber();
			if (num == null) return;
			const line = target.view.state.doc.line(num);
			const m = TASK_LINE_REGEX.exec(line.text);
			if (!m) return;
			const prefixLen = m[1].length;
			const charPos = line.from + prefixLen + 1;
			target.view.dispatch({
				changes: {
					from: charPos,
					to: charPos + 1,
					insert: charForFile,
				},
			});
			return;
		}

		const info = await this.resolveReadingTarget(target);
		if (!info) return;
		const { file, lines, lineIndex } = info;
		const original = lines[lineIndex];
		const m = TASK_LINE_REGEX.exec(original);
		if (!m) return;
		const prefixLen = m[1].length;
		const updated =
			original.slice(0, prefixLen + 1) +
			charForFile +
			original.slice(prefixLen + 2);
		lines[lineIndex] = updated;
		await this.app.vault.modify(file, lines.join("\n"));
	}

	/** Resolve a reading-view target to its source file and line index. */
	private async resolveReadingTarget(
		target: IconTarget,
	): Promise<{ file: TFile; lines: string[]; lineIndex: number } | null> {
		if (target.kind !== "reading") return null;
		const ctx: MarkdownPostProcessorContext = target.ctx;
		const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(file instanceof TFile)) return null;

		const section = ctx.getSectionInfo(target.el);
		if (!section) return null;

		const content = await this.app.vault.read(file);
		const lines = content.split("\n");

		const allIcons = Array.from(
			target.el.querySelectorAll<HTMLElement>(".ccb-checkbox"),
		);
		const realIcon =
			target.targetEl.querySelector<HTMLElement>(".ccb-checkbox") ??
			target.targetEl;
		const clickedIndex = allIcons.indexOf(realIcon);
		if (clickedIndex < 0) return null;

		const taskLineIndices: number[] = [];
		for (let i = section.lineStart; i <= section.lineEnd; i++) {
			if (TASK_LINE_REGEX.test(lines[i] ?? "")) {
				taskLineIndices.push(i);
			}
		}
		const lineIndex = taskLineIndices[clickedIndex];
		if (lineIndex == null) return null;

		return { file, lines, lineIndex };
	}
}
