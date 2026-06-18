import {
	EditorView,
	type PluginValue,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view";
import { type IconTarget } from "../types";
import { normalizeChar } from "../utils";
import type { AppServices } from "../react/contexts";
import { mountReact } from "../react/mountReact";
import { Checkbox } from "../react/components/Checkbox";
import { createElement } from "react";

interface LivePreviewHost extends HTMLElement {
	__ccbUnmount?: () => void;
}

/**
 * Live-preview integration.
 *
 * Strategy: let Obsidian render its native `<input class="task-list-item-checkbox">`,
 * then swap each one out for a React-rendered `<Checkbox>` inside a
 * `display: contents` host span. We can't outrank Obsidian's bracket
 * decoration via `Decoration.replace` (verified empirically — the
 * built-in task-list ViewPlugin wins the conflict at the bracket range),
 * so we use a MutationObserver scoped to `contentDOM` instead. Same
 * approach Obsidian's own reading-view post-processor takes, applied to
 * Live Preview's CodeMirror DOM.
 */
export function buildLivePreviewExtension(services: AppServices) {
	return ViewPlugin.fromClass(
		class implements PluginValue {
			observer: MutationObserver | null = null;
			private replacing = false;

			constructor(public view: EditorView) {
				this.replaceAll();
				this.observer = new MutationObserver((mutations) => {
					if (this.replacing) return;
					// Cheap pre-check: only walk replacements when we see
					// an `input.task-list-item-checkbox` get added.
					// Without this, every cursor blink re-runs the loop.
					for (const m of mutations) {
						for (const node of Array.from(m.addedNodes)) {
							if (!(node instanceof HTMLElement)) continue;
							if (
								node.matches?.(
									"input.task-list-item-checkbox",
								) ||
								node.querySelector?.(
									"input.task-list-item-checkbox",
								)
							) {
								this.replaceAll();
								return;
							}
						}
					}
				});
				this.observer.observe(view.contentDOM, {
					childList: true,
					subtree: true,
				});
			}

			update(update: ViewUpdate) {
				if (
					update.docChanged ||
					update.viewportChanged ||
					update.selectionSet
				) {
					this.replaceAll();
				}
			}

			destroy(): void {
				this.observer?.disconnect();
				this.observer = null;
			}

			private replaceAll(): void {
				if (this.replacing) return;
				this.replacing = true;
				try {
					const inputs =
						this.view.contentDOM.querySelectorAll<HTMLInputElement>(
							"input.task-list-item-checkbox",
						);
					if (inputs.length === 0) return;

					inputs.forEach((input) =>
						this.replaceOne(input),
					);
				} finally {
					this.replacing = false;
				}
			}

			private replaceOne(input: HTMLInputElement) {
				const rawChar = input.getAttribute("data-task") ?? "";
				const char = normalizeChar(rawChar);

				const host = document.createElement(
					"span",
				) as LivePreviewHost;
				// `display: contents` keeps the host invisible to layout
				// — the React-rendered .ccb-checkbox span becomes the
				// actual flex item. CSS like `.ccb-checkbox svg` keeps
				// working because the svg is still a descendant.
				host.style.display = "contents";

				const view = this.view;
				const target: IconTarget = {
					kind: "live",
					view,
					getLineNumber: () => {
						try {
							const pos = view.posAtDOM(host);
							return view.state.doc.lineAt(pos).number;
						} catch {
							return null;
						}
					},
				};

				const mounted = mountReact(
					host,
					services,
					createElement(Checkbox, { initialChar: char, target }),
				);
				host.__ccbUnmount = mounted.unmount;
				input.replaceWith(host);
			}
		},
	);
}

/** Editor-level DOM event handlers that claim every interesting mouse /
 *  pointer event on a `.ccb-checkbox` element before any other extension
 *  (notably Obsidian's built-in task-toggle) can react to it. */
export function buildEditorEventHandlers() {
	const claim = (event: Event): boolean => {
		const t = event.target as HTMLElement | null;
		if (!t?.closest?.(".ccb-checkbox")) return false;
		event.preventDefault();
		return true;
	};

	return EditorView.domEventHandlers({
		mousedown: claim,
		mouseup: claim,
		click: claim,
		dblclick: claim,
		pointerdown: claim,
		pointerup: claim,
		contextmenu: claim,
	});
}
