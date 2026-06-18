import type { MarkdownPostProcessorContext } from "obsidian";
import type { AppServices } from "../react/contexts";
import { readReadingChar, swapInputForCheckbox } from "./swapCheckbox";

/**
 * Reading View integration.
 *
 * One-shot: Obsidian calls this post-processor with a freshly-rendered
 * section of static HTML. We find every native task `<input>` and swap
 * it for a React-mounted host. The actual swap is shared with the Live
 * Preview integration — see `swapInputForCheckbox`. This file's job is
 * shaping a `reading` IconTarget and reading the marker char from the
 * static HTML (`data-task`).
 */
export function processReadingView(
	services: AppServices,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
): void {
	const inputs = el.querySelectorAll<HTMLInputElement>(
		"input.task-list-item-checkbox",
	);
	inputs.forEach((input) => {
		const initialChar = readReadingChar(input);
		swapInputForCheckbox(
			input,
			services,
			initialChar,
			(host) => ({
				kind: "reading",
				ctx,
				el,
				targetEl: host,
			}),
		);
	});
}
