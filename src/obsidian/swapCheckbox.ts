import { createElement } from "react";
import { Checkbox } from "../react/components/Checkbox";
import { mountReact, type MountedRoot } from "../react/mountReact";
import type { AppServices } from "../react/contexts";
import type { IconTarget } from "../types";
import { normalizeChar } from "../utils";

/** Read the bracket character from an Obsidian-rendered task `<input>`.
 *  Falls through `data-task` on the input, then on its parent `<li>`
 *  (Reading view sometimes only sets it there), then to the input's
 *  `checked` state. The fallbacks are no-ops in Live Preview (no `<li>`
 *  ancestor, `checked` not used by CodeMirror's task widget), so the same
 *  function works for both call sites. */
export function readCharFromInput(input: HTMLInputElement): string {
	const li = input.closest<HTMLElement>("li.task-list-item");
	const raw =
		input.getAttribute("data-task") ??
		li?.getAttribute("data-task") ??
		(input.checked ? "x" : "");
	return normalizeChar(raw);
}

/**
 * Replace a native Obsidian task `<input>` with a React-mounted host
 * rendering our `<Checkbox>`. This is the shared core used by both the
 * Live Preview integration (a CodeMirror ViewPlugin + MutationObserver)
 * and the Reading View integration (a Markdown post-processor).
 *
 * Those two integrations differ only in:
 *   - HOW they're triggered — they're registered with totally different
 *     Obsidian APIs (`registerEditorExtension` vs
 *     `registerMarkdownPostProcessor`) and have different lifecycles
 *     (continuous vs one-shot).
 *   - WHAT IconTarget they need to build — Live needs a `getLineNumber`
 *     closure over the EditorView; Reading needs the post-processor
 *     `ctx` plus the section element.
 *
 * The actual swap (read char, build host, mount React, replace input) is
 * identical, and lives here.
 */
export function swapInputForCheckbox(
	input: HTMLInputElement,
	services: AppServices,
	makeTarget: (host: HTMLSpanElement) => IconTarget,
): { host: HTMLSpanElement; mount: MountedRoot } {
	const char = readCharFromInput(input);

	// `display: contents` keeps the host invisible to layout — the
	// React-rendered `.ccb-checkbox` span becomes the actual flex item.
	// CSS selectors like `.ccb-checkbox svg` keep working because the svg
	// is still a descendant.
	const host = document.createElement("span");
	host.style.display = "contents";

	const target = makeTarget(host);
	const mount = mountReact(
		host,
		services,
		createElement(Checkbox, { initialChar: char, target }),
	);

	input.replaceWith(host);
	return { host, mount };
}
