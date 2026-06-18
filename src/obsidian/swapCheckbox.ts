import { createElement } from "react";
import type { EditorView } from "@codemirror/view";
import { Checkbox } from "../react/components/Checkbox";
import { mountReact, type MountedRoot } from "../react/mountReact";
import type { AppServices } from "../react/contexts";
import { TASK_LINE_REGEX, type IconTarget } from "../types";
import { normalizeChar } from "../utils";

/** Read the bracket character for a Reading-view task `<input>`.
 *
 *  Reading view's static HTML reliably exposes the marker via `data-task`
 *  on either the input itself or its parent `<li>` (Obsidian's renderer
 *  picks one depending on version). The `input.checked` fallback is a
 *  last resort for the `[ ]` / `[x]` baseline. */
export function readReadingChar(input: HTMLInputElement): string {
	const li = input.closest<HTMLElement>("li.task-list-item");
	const raw =
		input.getAttribute("data-task") ??
		li?.getAttribute("data-task") ??
		(input.checked ? "x" : "");
	return normalizeChar(raw);
}

/** Read the bracket character for a Live Preview task `<input>`.
 *
 *  Crucially, this consults the CodeMirror document — the source of
 *  truth — rather than the rendered `<input>`'s attributes. Obsidian's
 *  task widget does not set `data-task` for non-standard markers like
 *  `[-]`, `[/]`, `[!]`, `[?]` in Live Preview, and `input.checked` is
 *  only true for `[x]`. Reading from the document avoids the wrong-char
 *  bug those gaps produce when the line re-renders after a doc change. */
export function readLiveChar(
	input: HTMLInputElement,
	view: EditorView,
): string {
	try {
		const pos = view.posAtDOM(input);
		const line = view.state.doc.lineAt(pos);
		const m = TASK_LINE_REGEX.exec(line.text);
		return m ? normalizeChar(m[2]) : "";
	} catch {
		return "";
	}
}

/**
 * Replace a native Obsidian task `<input>` with a React-mounted host
 * rendering our `<Checkbox>`. Shared between the Live Preview integration
 * (a CodeMirror ViewPlugin + MutationObserver) and the Reading View
 * integration (a Markdown post-processor).
 *
 * Each caller provides:
 *   - the `initialChar` it pulled from its own source of truth (the doc
 *     for live, the rendered HTML for reading), and
 *   - an `IconTarget` factory shaped for its rendering pipeline.
 *
 * The swap itself (build host, mount React, replace input) lives here.
 */
export function swapInputForCheckbox(
	input: HTMLInputElement,
	services: AppServices,
	initialChar: string,
	makeTarget: (host: HTMLSpanElement) => IconTarget,
): { host: HTMLSpanElement; mount: MountedRoot } {
	// `display: contents` keeps the host invisible to layout — the
	// React-rendered `.ccb-checkbox` span becomes the actual flex item.
	const host = document.createElement("span");
	host.style.display = "contents";

	const target = makeTarget(host);
	const mount = mountReact(
		host,
		services,
		createElement(Checkbox, { initialChar, target }),
	);

	input.replaceWith(host);
	return { host, mount };
}
