import { createElement } from "react";
import type { EditorView } from "@codemirror/view";
import { Checkbox } from "../react/components/Checkbox";
import { mountReact, type MountedRoot } from "../react/mountReact";
import type { AppServices } from "../react/contexts";
import { TASK_LINE_REGEX, type IconTarget } from "../types";
import { normalizeChar } from "../utils";

/** Read the bracketed character for a Reading-view task `<input>`. */
export function readReadingChar(input: HTMLInputElement): string {
	const li = input.closest<HTMLElement>("li.task-list-item");
	const raw =
		input.getAttribute("data-task") ??
		li?.getAttribute("data-task") ??
		(input.checked ? "x" : "");
	return normalizeChar(raw);
}

/** Read the bracketed character for a Live Preview task `<input>` from the CodeMirror document. */
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

/** Replace a native task `<input>` with a React-mounted host rendering our `<Checkbox>`. */
export function swapInputForCheckbox(
	input: HTMLInputElement,
	services: AppServices,
	initialChar: string,
	makeTarget: (host: HTMLSpanElement) => IconTarget,
): { host: HTMLSpanElement; mount: MountedRoot } {
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
