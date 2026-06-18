import { Editor, Notice, Plugin } from "obsidian";
import { EditorView } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { createElement } from "react";

import { type IconTarget, TASK_LINE_REGEX } from "./src/types";
import { SettingsStore } from "./src/state/SettingsStore";
import { CheckboxService } from "./src/state/CheckboxService";
import { MenuService } from "./src/state/MenuService";
import { type AppServices } from "./src/react/contexts";
import { mountReact, type MountedRoot } from "./src/react/mountReact";
import { MenuRoot } from "./src/react/components/MenuRoot";
import {
	buildEditorEventHandlers,
	buildLivePreviewExtension,
} from "./src/obsidian/livePreview";
import { processReadingView } from "./src/obsidian/readingView";
import { CustomCheckboxSettingTab } from "./src/obsidian/settingsTab";

/**
 * Plugin entry point. Owns the lifecycle and wires together services +
 * Obsidian integrations. All UI state and rendering live inside the
 * React tree — this file deliberately contains no business logic.
 */
export default class CustomCheckboxesPlugin extends Plugin {
	private services!: AppServices;
	private menuRoot: MountedRoot | null = null;
	private menuHost: HTMLElement | null = null;

	async onload() {
		this.services = await this.buildServices();

		this.mountMenuRoot();
		this.addSettingTab(
			new CustomCheckboxSettingTab(this.app, this, this.services),
		);
		this.registerIntegrations();
		this.registerCommands();
	}

	async onunload() {
		await this.services?.settings.flush();
		this.menuRoot?.unmount();
		this.menuRoot = null;
		this.menuHost?.remove();
		this.menuHost = null;
	}

	/* ----------------------------------------------------------------- *
	 * Setup
	 * ----------------------------------------------------------------- */

	private async buildServices(): Promise<AppServices> {
		const raw = await this.loadData();
		const settings = SettingsStore.hydrate(raw, async (s) => {
			await this.saveData(s);
		});
		const checkbox = new CheckboxService(this.app);
		const menu = new MenuService();
		return { app: this.app, settings, checkbox, menu };
	}

	/** Mount the singleton `<MenuRoot>` to body. Any checkbox can request
	 *  a menu by calling `services.menu.open(...)` — this root will pick
	 *  it up and render. */
	private mountMenuRoot(): void {
		this.menuHost = document.createElement("div");
		this.menuHost.className = "ccb-menu-portal";
		document.body.appendChild(this.menuHost);
		this.menuRoot = mountReact(
			this.menuHost,
			this.services,
			createElement(MenuRoot),
		);
	}

	private registerIntegrations(): void {
		const { settings } = this.services;
		const enableReadingView = settings.getState().enableReadingView;
		const enableLivePreview = settings.getState().enableLivePreview;

		if (enableReadingView) {
			this.registerMarkdownPostProcessor((el, ctx) =>
				processReadingView(this.services, el, ctx),
			);
		}
		if (enableLivePreview) {
			this.registerEditorExtension(
				buildLivePreviewExtension(this.services),
			);
			this.registerEditorExtension(
				Prec.highest(buildEditorEventHandlers()),
			);
		}
	}

	private registerCommands(): void {
		this.addCommand({
			id: "open-checkbox-menu-at-cursor",
			name: "Open custom checkbox menu at cursor",
			editorCallback: (editor) => {
				void this.openMenuAtCursor(editor);
			},
		});
	}

	/* ----------------------------------------------------------------- *
	 * Editor command: open variant menu from cursor position
	 * ----------------------------------------------------------------- */
	private async openMenuAtCursor(editor: Editor): Promise<void> {
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

		const target: IconTarget = {
			kind: "live",
			view: cm,
			getLineNumber: () =>
				cm.state.doc.lineAt(cm.state.selection.main.head).number,
		};

		const current = await this.services.checkbox.readChar(target);
		if (current == null) return;

		const coords = cm.coordsAtPos(pos);
		this.services.menu.open({
			clientX: coords?.left ?? 0,
			clientY: coords?.bottom ?? 0,
			currentChar: current,
			onSelect: (next) => {
				void this.services.checkbox.writeChar(target, next);
			},
		});
	}
}
