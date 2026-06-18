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
	iconSize: string;
	defaultCheckedCharacter: string;
	enableReadingView: boolean;
	enableLivePreview: boolean;
}

/** Hold-to-open-menu duration. */
export const LONG_PRESS_MS = 250;

export const DEFAULT_SVG_EMPTY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>`;
export const DEFAULT_SVG_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
export const DEFAULT_SVG_SLASH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/></svg>`;
export const DEFAULT_SVG_QUESTION = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 9a2.5 2.5 0 1 1 4.5 1.5c-.8.6-2 1-2 2.5"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
export const DEFAULT_SVG_BANG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="14"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`;
export const DEFAULT_SVG_PARTIAL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3 a9 9 0 0 1 0 18 z" fill="currentColor"/></svg>`;

export const DEFAULT_SETTINGS: CustomCheckboxesSettings = {
	variants: [
		{ id: "v-checked", character: "x", name: "Done", svgSource: DEFAULT_SVG_CHECK, completed: true, color: "" },
		{ id: "v-cancelled", character: "-", name: "Cancelled", svgSource: DEFAULT_SVG_SLASH, completed: true, color: "" },
		{ id: "v-inprogress", character: "/", name: "In progress", svgSource: DEFAULT_SVG_PARTIAL, completed: false, color: "" },
		{ id: "v-question", character: "?", name: "Question", svgSource: DEFAULT_SVG_QUESTION, completed: false, color: "" },
		{ id: "v-important", character: "!", name: "Important", svgSource: DEFAULT_SVG_BANG, completed: false, color: "" },
	],
	iconSize: "1.15em",
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
