import {
	EditorView,
	type PluginValue,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view";
import type { AppServices } from "../react/contexts";
import { readLiveChar, swapInputForCheckbox } from "./swapCheckbox";

/**
 * Build a CodeMirror ViewPlugin that swaps Obsidian's native task `<input>`
 * elements for our React-rendered checkboxes inside the Live Preview editor.
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
					for (const m of mutations) {
						for (const node of Array.from(m.addedNodes)) {
							if (!(node instanceof HTMLElement)) continue;
							if (
								node.matches(
									"input.task-list-item-checkbox",
								) ||
								node.querySelector(
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
					inputs.forEach((input) => this.replaceOne(input));
				} finally {
					this.replacing = false;
				}
			}

			private replaceOne(input: HTMLInputElement): void {
				const view = this.view;
				const initialChar = readLiveChar(input, view);
				swapInputForCheckbox(
					input,
					services,
					initialChar,
					(host) => ({
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
					}),
				);
			}
		},
	);
}

/** Editor extension that swallows mouse / pointer events on `.ccb-checkbox` so Obsidian's task-toggle never sees them. */
export function buildEditorEventHandlers() {
	const claim = (event: Event): boolean => {
		const target = event.target;
		if (!(target instanceof Element)) return false;
		if (!target.closest(".ccb-checkbox")) return false;
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
