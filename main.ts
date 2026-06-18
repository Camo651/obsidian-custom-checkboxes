import {
	App,
	Editor,
	MarkdownPostProcessorContext,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	debounce,
} from "obsidian";

import {
	EditorView,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { Prec } from "@codemirror/state";

/* =========================================================================
 * Types & defaults
 * ========================================================================= */

interface CheckboxVariant {
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

interface CustomCheckboxesSettings {
	variants: CheckboxVariant[];
	iconSize: string; // CSS length, e.g. "1.15em" or "18px"
	defaultCheckedCharacter: string; // What "[ ] -> short click" sets it to. Default "x".
	enableReadingView: boolean;
	enableLivePreview: boolean;
}

/** Hold-to-open-menu duration. Hardcoded — no longer user-configurable. */
const LONG_PRESS_MS = 500;

/** Empty-square SVG used to render unchecked `[ ]` tasks when the user hasn't
 *  registered a variant for the empty character. Without this, the rendered
 *  span is a 1.15em transparent box and the user can't see or click it. */
const DEFAULT_SVG_EMPTY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>`;

const DEFAULT_SVG_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const DEFAULT_SVG_SLASH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/></svg>`;
const DEFAULT_SVG_QUESTION = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 9a2.5 2.5 0 1 1 4.5 1.5c-.8.6-2 1-2 2.5"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const DEFAULT_SVG_BANG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="14"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`;
const DEFAULT_SVG_PARTIAL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3 a9 9 0 0 1 0 18 z" fill="currentColor"/></svg>`;

const DEFAULT_SETTINGS: CustomCheckboxesSettings = {
	variants: [
		{
			id: "v-checked",
			character: "x",
			name: "Done",
			svgSource: DEFAULT_SVG_CHECK,
			completed: true,
			color: "",
		},
		{
			id: "v-cancelled",
			character: "-",
			name: "Cancelled",
			svgSource: DEFAULT_SVG_SLASH,
			completed: true,
			color: "",
		},
		{
			id: "v-inprogress",
			character: "/",
			name: "In progress",
			svgSource: DEFAULT_SVG_PARTIAL,
			completed: false,
			color: "",
		},
		{
			id: "v-question",
			character: "?",
			name: "Question",
			svgSource: DEFAULT_SVG_QUESTION,
			completed: false,
			color: "",
		},
		{
			id: "v-important",
			character: "!",
			name: "Important",
			svgSource: DEFAULT_SVG_BANG,
			completed: false,
			color: "",
		},
	],
	iconSize: "1.15em",
	defaultCheckedCharacter: "x",
	enableReadingView: true,
	enableLivePreview: true,
};

/* =========================================================================
 * Utility: regex for a task list line
 * =========================================================================
 * Matches:        - [x] something
 *                 * [ ] something
 *                 + [/] something
 * Captures:       1 = leading whitespace + bullet + space(s)
 *                 2 = the character inside the brackets (length 1)
 * NOTE: Obsidian's renderer only treats single-character brackets as tasks,
 * so we match exactly one character. */
const TASK_LINE_REGEX = /^(\s*[-*+]\s+(?:\[\d+\]\s+)?)\[(.)\]/;

/* Match the bracket portion only, used inside a CodeMirror line scan. */
const TASK_BRACKET_REGEX = /(\[(.)\])/g;

function makeId(): string {
	return "v-" + Math.random().toString(36).slice(2, 10);
}

/** Normalize the character used in storage / lookup. Obsidian writes "[ ]" for
 *  unchecked — we represent that as the empty string in the variants array. */
function normalizeChar(raw: string | null | undefined): string {
	if (raw == null) return "";
	if (raw.length === 0) return "";
	if (raw === " ") return "";
	return raw;
}

/* =========================================================================
 * Plugin
 * ========================================================================= */

export default class CustomCheckboxesPlugin extends Plugin {
	settings: CustomCheckboxesSettings = DEFAULT_SETTINGS;
	/** Lookup: character -> variant (or undefined). Empty string key = unchecked. */
	variantMap: Map<string, CheckboxVariant> = new Map();

	async onload() {
		await this.loadSettings();
		this.rebuildVariantMap();

		this.addSettingTab(new CustomCheckboxSettingTab(this.app, this));

		if (this.settings.enableReadingView) {
			this.registerMarkdownPostProcessor((el, ctx) =>
				this.processReadingView(el, ctx),
			);
		}

		if (this.settings.enableLivePreview) {
			// Diagnostic: registering without `Prec.highest`. If widgets now
			// render, the issue is that another extension at the same range
			// has equal-or-higher precedence.
			this.registerEditorExtension(buildLivePreviewExtension(this));
			this.registerEditorExtension(
				Prec.highest(buildEditorEventHandlers()),
			);
		} else {

		}

		this.addCommand({
			id: "open-checkbox-menu-at-cursor",
			name: "Open custom checkbox menu at cursor",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.openMenuFromEditor(editor, view);
			},
		});
	}

	onunload() {
		// Nothing explicit — Obsidian unregisters extensions / post-processors.
	}

	async loadSettings() {
		const loaded = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
		// Migrate any malformed variants. Older versions of the plugin also
		// supported `mediaKind: "image"` with an `imagePath`; we drop those
		// fields here and keep whatever `svgSource` was stored alongside.
		this.settings.variants = (this.settings.variants ?? []).map((v) => ({
			id: v.id ?? makeId(),
			character: normalizeChar(v.character),
			name: v.name ?? "",
			svgSource: v.svgSource ?? "",
			completed: !!v.completed,
			color: v.color ?? "",
		}));
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.rebuildVariantMap();
		// Re-render open markdown views so changes appear immediately
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				leaf.view.previewMode?.rerender(true);
				// Force CodeMirror to re-decorate
				const cm = (leaf.view.editor as unknown as { cm?: EditorView })
					.cm;
				cm?.dispatch({});
			}
		});
	}

	rebuildVariantMap() {
		this.variantMap = new Map();
		for (const v of this.settings.variants) {
			this.variantMap.set(v.character, v);
		}
	}

	/* ----------------------------------------------------------------- *
	 * Reading view post-processor
	 * ----------------------------------------------------------------- */
	processReadingView(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		const inputs = Array.from(
			el.querySelectorAll<HTMLInputElement>(
				"input.task-list-item-checkbox",
			),
		);
		if (inputs.length === 0) return;

		inputs.forEach((input) => {
			const li = input.closest("li.task-list-item") as HTMLElement | null;
			// Obsidian's reading view often puts `data-task` on the parent
			// <li> rather than on the <input>. Read from the input first,
			// fall back to the <li>, and finally fall back to the input's
			// checked state so the standard `- [x]` / `- [ ]` cases still
			// work even when `data-task` is missing entirely.
			const rawChar =
				input.getAttribute("data-task") ??
				li?.getAttribute("data-task") ??
				(input.checked ? "x" : "");
			const char = normalizeChar(rawChar);
			const variant = this.variantMap.get(char);

			// Build replacement element regardless of whether a variant exists
			// (so empty checkboxes also get our click behavior).
			const replacement = this.renderIcon(char, variant);

			// Apply / clear completed styling
			if (li) {
				if (variant?.completed) {
					li.classList.add("ccb-completed-line");
				} else {
					li.classList.remove("ccb-completed-line");
				}
			}

			// Wire interactions
			this.attachIconInteractions(replacement, {
				kind: "reading",
				ctx,
				el,
				targetEl: replacement,
			});

			input.replaceWith(replacement);
		});
	}

	/* ----------------------------------------------------------------- *
	 * Icon rendering
	 * ----------------------------------------------------------------- */
	renderIcon(char: string, variant: CheckboxVariant | undefined): HTMLElement {
		const span = createSpan({ cls: "ccb-checkbox" });
		span.setAttr("role", "checkbox");
		span.setAttr(
			"aria-checked",
			variant?.completed ? "true" : char ? "mixed" : "false",
		);
		span.setAttr("data-ccb-char", char);
		span.style.setProperty("--ccb-size", this.settings.iconSize);

		if (variant) {
			if (variant.color) {
				span.style.color = variant.color;
			}
			if (variant.svgSource.trim()) {
				injectSvg(span, variant.svgSource);
			} else {
				renderFallback(span, char);
			}
		} else if (char === "") {
			// No user variant for the unchecked state. Render a visible empty
			// square so the box is still clickable in both Reading and Live
			// Preview — without this, the span has CSS dimensions but no
			// content and is effectively invisible.
			injectSvg(span, DEFAULT_SVG_EMPTY);
		} else {
			renderFallback(span, char);
		}

		return span;
	}

	/* ----------------------------------------------------------------- *
	 * Interactions: click, shift-click, long-press, contextmenu
	 * -----------------------------------------------------------------
	 * IMPORTANT: Obsidian's Live Preview ships its own click/mousedown
	 * handler that toggles tasks at the bracket position. If we let those
	 * events propagate, the user sees the box toggle instead of our menu —
	 * even when our handler also runs.
	 *
	 * To prevent that, we stop the event aggressively at every relevant
	 * phase (mousedown, pointerdown, click, dblclick, mouseup) using both
	 * `stopPropagation` and `stopImmediatePropagation`. We also call
	 * `preventDefault` so any handler that respects `event.defaultPrevented`
	 * (CodeMirror does) bails out.
	 * ----------------------------------------------------------------- */
	attachIconInteractions(el: HTMLElement, target: IconTarget) {
		let longPressTimer: number | null = null;
		let longPressFired = false;

		const clearTimer = () => {
			if (longPressTimer !== null) {
				window.clearTimeout(longPressTimer);
				longPressTimer = null;
			}
		};

		const swallow = (ev: Event) => {
			ev.preventDefault();
			ev.stopPropagation();
			ev.stopImmediatePropagation();
		};

		// Block any event Obsidian / CodeMirror might use to toggle the
		// task on the way down.
		const blockingEvents: (keyof HTMLElementEventMap)[] = [
			"mousedown",
			"mouseup",
			"dblclick",
			"touchstart",
			"touchend",
		];
		for (const type of blockingEvents) {
			el.addEventListener(type, swallow as EventListener);
		}

		el.addEventListener("pointerdown", (ev) => {
			swallow(ev);
			longPressFired = false;
			if (ev.button !== 0 || ev.shiftKey || ev.metaKey || ev.ctrlKey) {
				return;
			}
			longPressTimer = window.setTimeout(() => {
				longPressFired = true;
				this.openVariantMenu(ev as PointerEvent, target);
			}, LONG_PRESS_MS);
		});

		el.addEventListener("pointerup", (ev) => {
			swallow(ev);
			clearTimer();
		});
		el.addEventListener("pointerleave", () => {
			clearTimer();
		});
		el.addEventListener("pointercancel", () => {
			clearTimer();
		});

		el.addEventListener("click", (ev) => {
			swallow(ev);
			clearTimer();
			if (longPressFired) {
				longPressFired = false;
				return;
			}
			if (ev.shiftKey) {
				this.openVariantMenu(ev as MouseEvent, target);
				return;
			}
			this.applyShortClick(target);
		});

		el.addEventListener("contextmenu", (ev) => {
			swallow(ev);
			clearTimer();
			this.openVariantMenu(ev as MouseEvent, target);
		});
	}

	/* ----------------------------------------------------------------- *
	 * Short click: toggle empty <-> defaultCheckedCharacter
	 * ----------------------------------------------------------------- */
	async applyShortClick(target: IconTarget) {
		const current = await this.readCharacterAtTarget(target);
		if (current == null) {
			return;
		}
		const next =
			current === ""
				? this.settings.defaultCheckedCharacter
				: "";
		// Optimistic paint: update the icon DOM synchronously before the
		// dispatch round-trip. CodeMirror will eventually destroy and
		// recreate this span when it re-renders the line, but the
		// MutationObserver replacement produces an icon for the same
		// character, so the user sees a single instant transition rather
		// than `old icon → blank → new icon`.
		this.paintIconOptimistically(target, next);
		await this.writeCharacterAtTarget(target, next);
	}

	/** Repaint the icon in `target.iconEl` (live) or `target.targetEl`
	 *  (reading) to show `nextChar` immediately, without waiting for the
	 *  source-of-truth document write to round-trip through the renderer. */
	private paintIconOptimistically(
		target: IconTarget,
		nextChar: string,
	): void {
		const host =
			target.kind === "live" ? target.iconEl : target.targetEl;
		if (!host) return;
		const variant = this.variantMap.get(nextChar);
		const fresh = this.renderIcon(nextChar, variant);
		host.replaceChildren(...Array.from(fresh.childNodes));
		host.setAttr("data-ccb-char", nextChar);
		host.setAttr(
			"aria-checked",
			variant?.completed ? "true" : nextChar ? "mixed" : "false",
		);
		// Apply / clear color override to match the variant.
		host.style.color = variant?.color || "";

		// Keep the parent line's completed-line class in sync for live mode
		// so the strikethrough updates without waiting for the rebuild.
		if (target.kind === "live" && target.iconEl) {
			const cmLine = target.iconEl.closest<HTMLElement>(".cm-line");
			if (cmLine) {
				if (variant?.completed) {
					cmLine.classList.add("ccb-completed-line");
				} else {
					cmLine.classList.remove("ccb-completed-line");
				}
			}
		}
	}

	/* ----------------------------------------------------------------- *
	 * Open the variant chooser
	 * ----------------------------------------------------------------- */
	async openVariantMenu(ev: MouseEvent | PointerEvent, target: IconTarget) {
		const current = await this.readCharacterAtTarget(target);
		if (current == null) {
			return;
		}

		// Build the row data. The "Empty" row always comes first; user
		// variants follow in their configured order.
		type Row = {
			char: string;
			label: string;
			svgSource: string;
			color: string;
		};
		const rows: Row[] = [
			{
				char: "",
				label: "Empty",
				svgSource: DEFAULT_SVG_EMPTY,
				color: "",
			},
		];
		for (const v of this.settings.variants) {
			if (v.character === "") continue;
			rows.push({
				char: v.character,
				label: v.name || `[${v.character}]`,
				svgSource: v.svgSource,
				color: v.color,
			});
		}

		// Tear down any leftover popup before rendering a new one. Stale
		// popups can survive if a previous trigger raced with a layout
		// change (rare, but cheap to guard against).
		document
			.querySelectorAll(".ccb-menu")
			.forEach((m) => m.remove());

		const menu = createDiv({ cls: "ccb-menu" });
		menu.setAttr("role", "menu");

		const itemEls: HTMLElement[] = [];
		let focusIdx = rows.findIndex((r) => r.char === current);
		if (focusIdx < 0) focusIdx = 0;

		const select = (char: string) => {
			this.paintIconOptimistically(target, char);
			void this.writeCharacterAtTarget(target, char);
		};

		const setFocused = (next: number) => {
			itemEls[focusIdx]?.classList.remove("ccb-menu-item--focused");
			focusIdx = next;
			const el = itemEls[focusIdx];
			if (!el) return;
			el.classList.add("ccb-menu-item--focused");
			el.scrollIntoView({ block: "nearest" });
		};

		rows.forEach((row, idx) => {
			const item = createDiv({ cls: "ccb-menu-item" });
			item.setAttr("role", "menuitem");
			item.setAttr("tabindex", "-1");
			if (row.char === current) {
				item.classList.add("ccb-menu-item--active");
			}

			// Number badge: pressing this digit while the menu is open
			// selects this row. Only the first 9 rows get a number — past
			// that, the badge is a non-interactive placeholder so the
			// grid layout stays consistent.
			const numberBadge = item.createSpan({
				cls: "ccb-menu-item-number",
			});
			if (idx < 9) {
				numberBadge.textContent = String(idx + 1);
			} else {
				numberBadge.classList.add("ccb-menu-item-number--empty");
			}

			const iconWrap = item.createSpan({ cls: "ccb-menu-item-icon" });
			if (row.color) iconWrap.style.color = row.color;
			if (row.svgSource.trim()) {
				injectSvg(iconWrap, row.svgSource);
			} else if (row.char === "") {
				injectSvg(iconWrap, DEFAULT_SVG_EMPTY);
			} else {
				iconWrap.textContent = row.char;
			}

			const label = item.createSpan({ cls: "ccb-menu-item-label" });
			label.textContent = row.label;

			const chip = item.createSpan({ cls: "ccb-menu-item-char" });
			chip.textContent = row.char === "" ? " " : row.char;

			const check = item.createSpan({ cls: "ccb-menu-item-check" });
			injectSvg(check, DEFAULT_SVG_CHECK);

			item.addEventListener("mousemove", () => {
				if (focusIdx !== idx) setFocused(idx);
			});
			item.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				select(row.char);
				close();
			});

			menu.appendChild(item);
			itemEls.push(item);
		});

		itemEls[focusIdx]?.classList.add("ccb-menu-item--focused");

		// Add to DOM hidden first so we can measure dimensions before
		// committing to a final position.
		menu.style.visibility = "hidden";
		document.body.appendChild(menu);

		const margin = 6;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const rect = menu.getBoundingClientRect();
		let x = ev.clientX;
		let y = ev.clientY;
		if (x + rect.width + margin > vw) {
			x = Math.max(margin, vw - rect.width - margin);
		}
		if (y + rect.height + margin > vh) {
			// Prefer flipping above the cursor if there's no room below.
			y = Math.max(margin, ev.clientY - rect.height);
		}
		menu.style.left = `${x}px`;
		menu.style.top = `${y}px`;
		menu.style.visibility = "";

		// Move keyboard focus to the menu so arrow keys / Enter / Esc
		// route through our handler without the user having to click.
		const focusable = createDiv();
		focusable.setAttr("tabindex", "-1");
		menu.insertBefore(focusable, menu.firstChild);
		focusable.style.position = "absolute";
		focusable.style.opacity = "0";
		focusable.style.pointerEvents = "none";
		focusable.focus({ preventScroll: true });

		const onDocMouseDown = (e: MouseEvent) => {
			if (!menu.contains(e.target as Node)) close();
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				close();
				return;
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setFocused((focusIdx + 1) % itemEls.length);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setFocused(
					(focusIdx - 1 + itemEls.length) % itemEls.length,
				);
				return;
			}
			if (e.key === "Home") {
				e.preventDefault();
				setFocused(0);
				return;
			}
			if (e.key === "End") {
				e.preventDefault();
				setFocused(itemEls.length - 1);
				return;
			}
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				const row = rows[focusIdx];
				if (row) {
					select(row.char);
					close();
				}
				return;
			}
			// Digit 1-9 picks the row at that 1-based position. Ignore
			// when modifiers are held so it doesn't intercept the host
			// app's shortcuts (e.g. Cmd-1 to switch tabs).
			if (
				e.key >= "1" &&
				e.key <= "9" &&
				!e.metaKey &&
				!e.ctrlKey &&
				!e.altKey
			) {
				const target = parseInt(e.key, 10) - 1;
				if (target < rows.length) {
					e.preventDefault();
					const row = rows[target];
					if (row) {
						select(row.char);
						close();
					}
				}
				return;
			}
		};
		const close = () => {
			document.removeEventListener("mousedown", onDocMouseDown, true);
			document.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("blur", close);
			window.removeEventListener("resize", close);
			window.removeEventListener("scroll", close, true);
			menu.remove();
		};

		// Defer the outside-click listener so the same gesture that
		// opened the menu doesn't immediately close it (the click that
		// followed our pointerdown is still in flight when we attach).
		window.setTimeout(() => {
			document.addEventListener("mousedown", onDocMouseDown, true);
		}, 0);
		document.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("blur", close);
		window.addEventListener("resize", close);
		window.addEventListener("scroll", close, true);

	}

	/* ----------------------------------------------------------------- *
	 * Read / write the character at a given target (Reading or LivePreview)
	 * ----------------------------------------------------------------- */
	async readCharacterAtTarget(target: IconTarget): Promise<string | null> {
		if (target.kind === "live") {
			const num = target.getLineNumber();
			if (num == null) return null;
			const line = target.view.state.doc.line(num);
			const m = TASK_LINE_REGEX.exec(line.text);
			if (!m) return null;
			return normalizeChar(m[2]);
		}
		// Reading view: re-read the source file
		const info = await this.resolveReadingTarget(target);
		if (!info) return null;
		const line = info.lines[info.lineIndex];
		const m = TASK_LINE_REGEX.exec(line);
		if (!m) return null;
		return normalizeChar(m[2]);
	}

	async writeCharacterAtTarget(target: IconTarget, nextChar: string) {
		// Obsidian writes " " (a single space) for unchecked tasks
		const charForFile = nextChar === "" ? " " : nextChar;

		if (target.kind === "live") {
			const num = target.getLineNumber();
			if (num == null) return;
			const line = target.view.state.doc.line(num);
			const m = TASK_LINE_REGEX.exec(line.text);
			if (!m) return;
			const prefixLen = m[1].length;
			// The opening bracket is at prefixLen; the char is at prefixLen + 1
			const charPos = line.from + prefixLen + 1;
			target.view.dispatch({
				changes: { from: charPos, to: charPos + 1, insert: charForFile },
			});
			return;
		}

		const info = await this.resolveReadingTarget(target);
		if (!info) return;
		const { file, lines, lineIndex } = info;
		const original = lines[lineIndex];
		const m = TASK_LINE_REGEX.exec(original);
		if (!m) return;
		const prefixLen = m[1].length;
		const updated =
			original.slice(0, prefixLen + 1) +
			charForFile +
			original.slice(prefixLen + 2);
		lines[lineIndex] = updated;
		await this.app.vault.modify(file, lines.join("\n"));
	}

	/* ----------------------------------------------------------------- *
	 * Reading-view target resolution: figure out which source line the
	 * clicked icon corresponds to.
	 * ----------------------------------------------------------------- */
	async resolveReadingTarget(target: IconTarget): Promise<{
		file: TFile;
		lines: string[];
		lineIndex: number;
	} | null> {
		if (target.kind !== "reading") return null;
		const ctx = target.ctx;
		const sourcePath = ctx.sourcePath;
		const file =
			this.app.vault.getAbstractFileByPath(sourcePath);
		if (!(file instanceof TFile)) return null;

		const section = ctx.getSectionInfo(target.el);
		if (!section) return null;

		const content = await this.app.vault.read(file);
		const lines = content.split("\n");

		// Determine which checkbox among the rendered task items was clicked.
		// We count both task-list <li> nodes in the rendered DOM AND the
		// task lines in the source section, then match by index.
		const allIcons = Array.from(
			target.el.querySelectorAll<HTMLElement>(".ccb-checkbox"),
		);
		const clickedIndex = allIcons.indexOf(target.targetEl);
		if (clickedIndex < 0) return null;

		const taskLineIndices: number[] = [];
		for (let i = section.lineStart; i <= section.lineEnd; i++) {
			if (TASK_LINE_REGEX.test(lines[i] ?? "")) {
				taskLineIndices.push(i);
			}
		}
		const lineIndex = taskLineIndices[clickedIndex];
		if (lineIndex == null) return null;

		return { file, lines, lineIndex };
	}

	/* ----------------------------------------------------------------- *
	 * Editor command: open variant menu from cursor position
	 * ----------------------------------------------------------------- */
	openMenuFromEditor(editor: Editor, view: MarkdownView) {
		const cm = (editor as unknown as { cm?: EditorView }).cm;
		if (!cm) {
			new Notice("Live Preview editor not available.");
			return;
		}
		const pos = cm.state.selection.main.head;
		const line = cm.state.doc.lineAt(pos);
		if (!TASK_LINE_REGEX.test(line.text)) {
			new Notice("Cursor is not on a task line.");
			return;
		}
		// The editor command uses the cursor's current line. Re-read it
		// each time `getLineNumber` is called so a long delay between
		// command invocation and the menu's read/write paths can't go
		// stale either (cursor may move while the menu is open).
		const target: IconTarget = {
			kind: "live",
			view: cm,
			getLineNumber: () => {
				const head = cm.state.selection.main.head;
				return cm.state.doc.lineAt(head).number;
			},
		};
		// Use a synthetic event positioned at the cursor coords.
		const coords = cm.coordsAtPos(pos);
		const fakeEvent = new MouseEvent("click", {
			clientX: coords?.left ?? 0,
			clientY: coords?.bottom ?? 0,
		});
		this.openVariantMenu(fakeEvent, target);
	}
}

/* =========================================================================
 * IconTarget — discriminated union describing where a click came from
 * ========================================================================= */
type IconTarget =
	| {
			kind: "reading";
			ctx: MarkdownPostProcessorContext;
			el: HTMLElement; // the rendered section root
			targetEl: HTMLElement; // the specific .ccb-checkbox clicked
	  }
	| {
			kind: "live";
			view: EditorView;
			/** Resolve the current line number lazily. Live Preview reuses
			 *  our `.ccb-checkbox` span across document edits — the span
			 *  stays in the DOM but its line number can shift when the
			 *  user inserts or deletes lines above. Capturing the line
			 *  number at replacement time and closing over it produced a
			 *  stale-closure bug where one click toggled the wrong (or
			 *  multiple) checkboxes. Resolving it at click time via
			 *  `posAtDOM(iconEl)` always returns the live line. */
			getLineNumber: () => number | null;
			/** The `.ccb-checkbox` span this target points at, when there is
			 *  one. We use it to paint the new icon synchronously on click so
			 *  the visual update doesn't have to wait for `view.dispatch` to
			 *  round-trip through CodeMirror's re-render and the
			 *  MutationObserver. Optional because the editor command path
			 *  doesn't have a specific span to paint. */
			iconEl?: HTMLElement;
	  };

/* =========================================================================
 * SVG injection helper — sanitizes by parsing as XML, then importing nodes
 * ========================================================================= */
function injectSvg(host: HTMLElement, svgSource: string) {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(svgSource, "image/svg+xml");
		const errorNode = doc.querySelector("parsererror");
		if (errorNode) {
			host.textContent = "?";
			return;
		}
		const svg = doc.documentElement;
		if (svg.tagName.toLowerCase() !== "svg") {
			host.textContent = "?";
			return;
		}
		// Strip any <script> nodes
		svg.querySelectorAll("script").forEach((n) => n.remove());
		host.appendChild(document.importNode(svg, true));
	} catch {
		host.textContent = "?";
	}
}

function renderFallback(host: HTMLElement, char: string) {
	host.textContent = char === "" ? "" : char;
	host.style.fontSize = "0.9em";
	host.style.fontWeight = "bold";
}

/* =========================================================================
 * Live Preview / CodeMirror extension
 * ========================================================================= */

/**
 * Live-preview integration.
 *
 * We can't override Obsidian's bracket widget via `Decoration.replace`: even
 * with `Prec.highest`, Obsidian's own task-list ViewPlugin wins the
 * decoration conflict at the bracket range, and our widget is silently
 * suppressed (verified empirically — `build` adds 20 widgets, 0 reach the
 * DOM, while 20 `input.task-list-item-checkbox` elements appear).
 *
 * Instead, we let Obsidian render its `<input class="task-list-item-checkbox">`
 * as usual, then swap each one out for our `.ccb-checkbox` span using a
 * MutationObserver scoped to the editor's contentDOM. This is the same
 * strategy Obsidian's own Reading-view post-processor takes — applied here
 * to Live Preview's CodeMirror DOM.
 */
function buildLivePreviewExtension(plugin: CustomCheckboxesPlugin) {
	return ViewPlugin.fromClass(
		class implements PluginValue {
			observer: MutationObserver | null = null;
			private replacing = false;

			constructor(public view: EditorView) {
				// Replace whatever is already on screen at construction time.
				this.replaceAll();
				this.observer = new MutationObserver((mutations) => {
					if (this.replacing) return;
					// Cheap pre-check: only walk replacements when we see an
					// `input.task-list-item-checkbox` get added. Without this,
					// every cursor blink / selection change re-runs the
					// replacement loop.
					let interesting = false;
					for (const m of mutations) {
						if (interesting) break;
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
								interesting = true;
								break;
							}
						}
					}
					if (interesting) {
						this.replaceAll();
					}
				});
				this.observer.observe(view.contentDOM, {
					childList: true,
					subtree: true,
				});
			}

			update(update: ViewUpdate) {
				// CodeMirror re-renders parts of the editor on selection /
				// viewport changes too. Run a sweep to catch any inputs the
				// observer might have missed (e.g., when CodeMirror replaces
				// nodes synchronously during the update).
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


					const view = this.view;
					inputs.forEach((input) => {
						const rawChar = input.getAttribute("data-task") ?? "";
						const char = normalizeChar(rawChar);
						const variant = plugin.variantMap.get(char);

						const replacement = plugin.renderIcon(char, variant);
						// Capture nothing line-related here. Resolve the line
						// number lazily from the live DOM position of our
						// span so it stays correct even when the user
						// inserts / deletes lines above. See IconTarget
						// `getLineNumber` for the bug this avoids.
						plugin.attachIconInteractions(replacement, {
							kind: "live",
							view,
							iconEl: replacement,
							getLineNumber: () => {
								try {
									const pos = view.posAtDOM(replacement);
									return view.state.doc.lineAt(pos).number;
								} catch (err) {
									return null;
								}
							},
						});

						// Mirror completed-line styling onto the cm-line so
						// the strikethrough applies in Live Preview.
						const cmLine = input.closest<HTMLElement>(".cm-line");
						if (cmLine) {
							if (variant?.completed) {
								cmLine.classList.add("ccb-completed-line");
							} else {
								cmLine.classList.remove("ccb-completed-line");
							}
						}

						input.replaceWith(replacement);
					});
				} finally {
					this.replacing = false;
				}
			}
		},
	);
}

/** Editor-level DOM event handlers that claim every interesting mouse /
 *  pointer event on a `.ccb-checkbox` element before any other extension
 *  (notably Obsidian's built-in task-toggle) can react to it. The actual
 *  long-press / click / shift-click logic lives on the widget element via
 *  `attachIconInteractions`; this exists purely to stop the editor from
 *  also processing the event. */
function buildEditorEventHandlers() {
	const isOnCheckbox = (event: Event): boolean => {
		const t = event.target as HTMLElement | null;
		return !!(t && t.closest && t.closest(".ccb-checkbox"));
	};

	const makeClaim =
		(name: string) =>
		(event: Event): boolean => {
			const matched = isOnCheckbox(event);
			if (!matched) return false;
			event.preventDefault();
			return true;
		};

	return EditorView.domEventHandlers({
		mousedown: makeClaim("mousedown"),
		mouseup: makeClaim("mouseup"),
		click: makeClaim("click"),
		dblclick: makeClaim("dblclick"),
		pointerdown: makeClaim("pointerdown"),
		pointerup: makeClaim("pointerup"),
		contextmenu: makeClaim("contextmenu"),
	});
}

/* =========================================================================
 * Settings tab
 * ========================================================================= */

class CustomCheckboxSettingTab extends PluginSettingTab {
	plugin: CustomCheckboxesPlugin;

	constructor(app: App, plugin: CustomCheckboxesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Custom Checkboxes" });

		new Setting(containerEl)
			.setName("Icon size")
			.setDesc(
				"CSS length for the rendered checkbox icon. Examples: '1.15em', '18px'.",
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.iconSize)
					.onChange(async (v) => {
						this.plugin.settings.iconSize = v.trim() || "1.15em";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Default 'checked' character")
			.setDesc(
				"What an empty checkbox becomes when short-clicked. Default 'x'.",
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.defaultCheckedCharacter)
					.onChange(async (v) => {
						const c = (v || "x").slice(0, 1);
						this.plugin.settings.defaultCheckedCharacter = c;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Enable in Reading view")
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.enableReadingView)
					.onChange(async (v) => {
						this.plugin.settings.enableReadingView = v;
						await this.plugin.saveSettings();
						new Notice(
							"Reload Obsidian to apply Reading view toggle.",
						);
					}),
			);

		new Setting(containerEl)
			.setName("Enable in Live Preview / Source")
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.enableLivePreview)
					.onChange(async (v) => {
						this.plugin.settings.enableLivePreview = v;
						await this.plugin.saveSettings();
						new Notice(
							"Reload Obsidian to apply Live Preview toggle.",
						);
					}),
			);

		containerEl.createEl("h3", { text: "Variants" });
		containerEl.createEl("p", {
			text: "Configure each character that can appear inside [ ]. Each variant gets its own icon. Use a single character per variant — Obsidian's task renderer only recognizes single-character markers.",
			cls: "setting-item-description",
		});

		const list = containerEl.createDiv({ cls: "ccb-variant-list" });

		const debouncedSave = debounce(
			async () => {
				await this.plugin.saveSettings();
			},
			250,
			true,
		);

		this.plugin.settings.variants.forEach((variant, index) => {
			this.renderVariantCard(list, variant, index, debouncedSave);
		});

		new Setting(containerEl)
			.setClass("ccb-add-variant-button")
			.addButton((btn) =>
				btn
					.setButtonText("Add variant")
					.setCta()
					.onClick(async () => {
						this.plugin.settings.variants.push({
							id: makeId(),
							character: "",
							name: "New variant",
							svgSource: DEFAULT_SVG_CHECK,
							completed: false,
							color: "",
						});
						await this.plugin.saveSettings();
						this.display();
					}),
			);
	}

	private renderVariantCard(
		container: HTMLElement,
		variant: CheckboxVariant,
		index: number,
		save: () => void,
	) {
		const card = container.createDiv({ cls: "ccb-variant-card" });

		// --- Header: live preview + actions ---
		const header = card.createDiv({ cls: "ccb-variant-card-header" });
		const previewHost = header.createDiv({ cls: "ccb-variant-preview" });
		renderVariantPreview(this.plugin, previewHost, variant);

		const title = header.createEl("strong", {
			text:
				variant.name ||
				(variant.character ? `[${variant.character}]` : "(unnamed)"),
		});
		header.createDiv({ cls: "ccb-variant-card-header-spacer" });

		const upBtn = header.createEl("button", { text: "↑" });
		upBtn.disabled = index === 0;
		upBtn.onclick = async () => {
			const arr = this.plugin.settings.variants;
			[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
			await this.plugin.saveSettings();
			this.display();
		};

		const downBtn = header.createEl("button", { text: "↓" });
		downBtn.disabled = index === this.plugin.settings.variants.length - 1;
		downBtn.onclick = async () => {
			const arr = this.plugin.settings.variants;
			[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
			await this.plugin.saveSettings();
			this.display();
		};

		const delBtn = header.createEl("button", { text: "Delete" });
		delBtn.onclick = async () => {
			this.plugin.settings.variants.splice(index, 1);
			await this.plugin.saveSettings();
			this.display();
		};

		// --- Character field ---
		const charRow = card.createDiv({ cls: "ccb-variant-row" });
		charRow.createEl("label", { text: "Character" });
		const charInput = charRow.createEl("input", { type: "text" });
		charInput.value = variant.character;
		// Obsidian's task renderer only accepts a single character between the
		// brackets, so we hard-cap the input length here and defensively slice
		// in `oninput` to handle paste / IME composition that can exceed
		// `maxLength` in some browsers.
		charInput.maxLength = 1;
		charInput.placeholder = "x";
		charInput.oninput = () => {
			if (charInput.value.length > 1) {
				charInput.value = charInput.value.slice(0, 1);
			}
			variant.character = charInput.value;
			title.setText(
				variant.name ||
					(variant.character ? `[${variant.character}]` : "(unnamed)"),
			);
			save();
		};

		// --- Name field ---
		const nameRow = card.createDiv({ cls: "ccb-variant-row" });
		nameRow.createEl("label", { text: "Name" });
		const nameInput = nameRow.createEl("input", { type: "text" });
		nameInput.value = variant.name;
		nameInput.oninput = () => {
			variant.name = nameInput.value;
			title.setText(
				variant.name ||
					(variant.character ? `[${variant.character}]` : "(unnamed)"),
			);
			save();
		};
		nameRow.createDiv();

		// --- SVG source ---
		const svgRow = card.createDiv({
			cls: "ccb-variant-row ccb-variant-row-full",
		});
		svgRow.createEl("label", { text: "SVG source" });
		const ta = svgRow.createEl("textarea");
		ta.value = variant.svgSource;
		ta.placeholder =
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>';
		ta.oninput = () => {
			variant.svgSource = ta.value;
			renderVariantPreview(this.plugin, previewHost, variant);
			save();
		};

		// --- Color ---
		const colorRow = card.createDiv({ cls: "ccb-variant-row" });
		colorRow.createEl("label", { text: "Color" });
		const colorInput = colorRow.createEl("input", { type: "text" });
		colorInput.value = variant.color;
		colorInput.placeholder = "e.g. #ef4444 or var(--text-accent)";
		colorInput.oninput = () => {
			variant.color = colorInput.value;
			renderVariantPreview(this.plugin, previewHost, variant);
			save();
		};
		colorRow.createDiv();

		// --- Completed toggle ---
		const completedRow = card.createDiv({ cls: "ccb-variant-row" });
		completedRow.createEl("label", { text: "Mark as completed" });
		const completedInput = completedRow.createEl("input", {
			type: "checkbox",
		});
		completedInput.checked = variant.completed;
		completedInput.onchange = () => {
			variant.completed = completedInput.checked;
			save();
		};
		completedRow.createDiv();
	}
}

function renderVariantPreview(
	plugin: CustomCheckboxesPlugin,
	host: HTMLElement,
	variant: CheckboxVariant,
) {
	host.empty();
	const icon = plugin.renderIcon(variant.character, variant);
	// Remove pointer cursor / margins for the preview swatch
	icon.style.cursor = "default";
	icon.style.margin = "0";
	icon.style.width = "1.2em";
	icon.style.height = "1.2em";
	host.appendChild(icon);
}
