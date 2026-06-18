import { createElement } from "react";
import { App, PluginSettingTab, type Plugin } from "obsidian";
import { SettingsView } from "../react/components/SettingsView";
import { mountReact, type MountedRoot } from "../react/mountReact";
import type { AppServices } from "../react/contexts";

/** Thin Obsidian shim that mounts the React-based settings view on
 *  display, and unmounts it on hide. */
export class CustomCheckboxSettingTab extends PluginSettingTab {
	private root: MountedRoot | null = null;

	constructor(
		app: App,
		plugin: Plugin,
		private services: AppServices,
	) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		this.root = mountReact(
			this.containerEl,
			this.services,
			createElement(SettingsView),
		);
	}

	hide(): void {
		this.root?.unmount();
		this.root = null;
		this.containerEl.empty();
		// Make sure any pending debounced edits land before the user
		// navigates away from the tab.
		void this.services.settings.flush();
	}
}
