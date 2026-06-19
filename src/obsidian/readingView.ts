import type { MarkdownPostProcessorContext } from "obsidian";
import type { AppServices } from "../react/contexts";
import { readReadingChar, swapInputForCheckbox } from "./swapCheckbox";

/** Markdown post-processor that swaps every native task `<input>` for a React-rendered checkbox. */
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
		swapInputForCheckbox(input, services, initialChar, (host) => ({
			kind: "reading",
			ctx,
			el,
			targetEl: host,
		}));
	});
}
