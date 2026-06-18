import type { MarkdownPostProcessorContext } from "obsidian";
import type { EditorView } from "@codemirror/view";

export interface CheckboxVariant {
	/** Stable id used for menu/keying. */
	id: string;
	/** The character that appears between the brackets, e.g. "x", "/", "?".
	 *  Empty string represents the unchecked state ("[ ]"). */
	character: string;
	/** Human-friendly label shown in the variant menu. */
	name: string;
	/** Raw SVG source rendered as the icon. */
	svgSource: string;
	/** When true, the whole task line gets strikethrough / muted styling. */
	completed: boolean;
	/** Optional color override applied to SVG via currentColor. */
	color: string;
}

export interface CustomCheckboxesSettings {
	variants: CheckboxVariant[];
	defaultCheckedCharacter: string;
	enableReadingView: boolean;
	enableLivePreview: boolean;
}

/** Hold-to-open-menu duration. */
export const LONG_PRESS_MS = 250;

/* ----------------------------------------------------------------------------
 * Default icons.
 *
 * All six share the same rounded outer box (a 24×24 path with a 5px outer
 * corner radius and a 2px ring thickness, leaving a 20×20 inner area with a
 * 3px inner corner radius). Only the inner glyph changes between variants,
 * which keeps the row of checkboxes visually consistent.
 * -------------------------------------------------------------------------- */

/** The shared rounded-box path. Filled (not stroked) — the path itself is
 *  shaped like a ring, so `fill="currentColor"` paints just the border. */
const BOX = `<path d="M19,0H5A5.006,5.006,0,0,0,0,5V19a5.006,5.006,0,0,0,5,5H19a5.006,5.006,0,0,0,5-5V5A5.006,5.006,0,0,0,19,0Zm3,19a3,3,0,0,1-3,3H5a3,3,0,0,1-3-3V5A3,3,0,0,1,5,2H19a3,3,0,0,1,3,3Z"/>`;

/** Wrap an inner glyph (or none) in the shared box. */
const inBox = (inner: string): string =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">${BOX}${inner}</svg>`;

/** Empty box. Used both as the "unchecked" default and as the fallback when
 *  a variant has no SVG configured. */
export const DEFAULT_SVG_EMPTY = inBox("");

/** Box with a checkmark. */
export const DEFAULT_SVG_CHECK = inBox(
	`<path d="M9.333,15.919,5.414,12A1,1,0,0,0,4,12H4a1,1,0,0,0,0,1.414l3.919,3.919a2,2,0,0,0,2.829,0L20,8.081a1,1,0,0,0,0-1.414h0a1,1,0,0,0-1.414,0Z"/>`,
);

/** Box with the left half filled — half-progress meter shape. */
export const DEFAULT_SVG_PARTIAL = inBox(
	`<path d="M12 2H5a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h7Z"/>`,
);

/** Box with an exclamation mark — bar + dot, both filled. */
export const DEFAULT_SVG_BANG = inBox(
	`<rect x="11" y="6" width="2" height="8" rx="1"/><circle cx="12" cy="17.5" r="1.25"/>`,
);

/** Box with a single diagonal slash through it — "crossed out". Stroked
 *  (rather than filled) because a thin diagonal line is far simpler that way;
 *  the 2px stroke matches the box's ring thickness and the check's weight. */
export const DEFAULT_SVG_SLASH = inBox(
	`<line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
);

/** Box with a question mark — stroked curl + filled dot. */
export const DEFAULT_SVG_QUESTION = inBox(
	`<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="17" r="1.25"/>`,
);

export const DEFAULT_SETTINGS: CustomCheckboxesSettings = {
	variants: [
		{ id: "v-inprogress", character: "/", name: "In Progress", svgSource: DEFAULT_SVG_PARTIAL, completed: false, color: "" },
		{ id: "v-checked", character: "x", name: "Done", svgSource: DEFAULT_SVG_CHECK, completed: true, color: "" },
		{ id: "v-important", character: "!", name: "Important", svgSource: DEFAULT_SVG_BANG, completed: false, color: "" },
		{ id: "v-question", character: "?", name: "Unsure", svgSource: DEFAULT_SVG_QUESTION, completed: false, color: "" },
		{ id: "v-cancelled", character: "-", name: "Cancelled", svgSource: DEFAULT_SVG_SLASH, completed: true, color: "" },
	],
	defaultCheckedCharacter: "x",
	enableReadingView: true,
	enableLivePreview: true,
};

/** Matches a task list line:  - [x] something */
export const TASK_LINE_REGEX = /^(\s*[-*+]\s+(?:\[\d+\]\s+)?)\[(.)\]/;

/** Discriminated union describing where a checkbox click came from. */
export type IconTarget =
	| {
			kind: "reading";
			ctx: MarkdownPostProcessorContext;
			el: HTMLElement;
			targetEl: HTMLElement;
	  }
	| {
			kind: "live";
			view: EditorView;
			getLineNumber: () => number | null;
			iconEl?: HTMLElement;
	  };
