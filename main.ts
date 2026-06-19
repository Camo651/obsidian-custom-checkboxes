import { Plugin } from "obsidian";
import { Prec } from "@codemirror/state";
import { createElement } from "react";

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

/** Plugin entry point. Owns the lifecycle and wires services to the React tree. */
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
	}

	async onunload() {
		await this.services?.settings.flush();
		this.menuRoot?.unmount();
		this.menuRoot = null;
		this.menuHost?.remove();
		this.menuHost = null;
	}

	/** Build the singleton service bag consumed by every React tree. */
	private async buildServices(): Promise<AppServices> {
		const raw = await this.loadData();
		const settings = SettingsStore.hydrate(raw, async (s) => {
			await this.saveData(s);
		});
		const checkbox = new CheckboxService(this.app);
		const menu = new MenuService();
		return { app: this.app, settings, checkbox, menu };
	}

	/** Mount the singleton MenuRoot into body so any checkbox can open a menu. */
	private mountMenuRoot(): void {
		this.menuHost = document.createElement("div");
		document.body.appendChild(this.menuHost);
		this.menuRoot = mountReact(
			this.menuHost,
			this.services,
			createElement(MenuRoot),
		);
	}

	/** Register reading-view and live-preview integrations based on settings. */
	private registerIntegrations(): void {
		const { settings } = this.services;
		const { enableReadingView, enableLivePreview } = settings.getState();

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
}
