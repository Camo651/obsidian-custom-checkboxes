import { createElement } from "react";
import type { MarkdownPostProcessorContext } from "obsidian";
import { Checkbox } from "../react/components/Checkbox";
import { mountReact } from "../react/mountReact";
import type { AppServices } from "../react/contexts";
import { normalizeChar } from "../utils";

/** Reading-view post-processor: replace each native task-list checkbox
 *  with a React-rendered `<Checkbox>`. */
export function processReadingView(
	services: AppServices,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
): void {
	const inputs = Array.from(
		el.querySelectorAll<HTMLInputElement>(
			"input.task-list-item-checkbox",
		),
	);
	if (inputs.length === 0) return;

	inputs.forEach((input) => {
		const li = input.closest(
			"li.task-list-item",
		) as HTMLElement | null;
		// Obsidian's reading view often puts `data-task` on the parent
		// <li> rather than on the <input>. Fall through both, then to
		// the input's checked state.
		const rawChar =
			input.getAttribute("data-task") ??
			li?.getAttribute("data-task") ??
			(input.checked ? "x" : "");
		const char = normalizeChar(rawChar);

		const host = document.createElement("span");
		host.style.display = "contents";

		mountReact(
			host,
			services,
			createElement(Checkbox, {
				initialChar: char,
				target: {
					kind: "reading",
					ctx,
					el,
					targetEl: host,
				},
			}),
		);

		input.replaceWith(host);
	});
}
