import type { MarkdownPostProcessorContext } from "obsidian";
import type { AppServices } from "../react/contexts";
import { swapInputForCheckbox } from "./swapCheckbox";

/**
 * Reading View integration.
 *
 * One-shot: Obsidian calls this post-processor with a freshly-rendered
 * section of static HTML. We find every native task `<input>` and swap
 * it for a React-mounted host. The actual swap is shared with the Live
 * Preview integration — see `swapInputForCheckbox`. This file's job is
 * just shaping a `reading` IconTarget for each input.
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
		swapInputForCheckbox(input, services, (host) => ({
			kind: "reading",
			ctx,
			el,
			targetEl: host,
		}));
	});
}
