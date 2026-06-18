import { createContext, useContext } from "react";
import type { App } from "obsidian";
import type { SettingsStore } from "../state/SettingsStore";
import type { CheckboxService } from "../state/CheckboxService";
import type { MenuService } from "../state/MenuService";

/**
 * Bag of services that the React tree consumes.
 * The plugin instantiates these once and threads them through `<Providers>`.
 */
export interface AppServices {
	app: App;
	settings: SettingsStore;
	checkbox: CheckboxService;
	menu: MenuService;
}

const ServicesContext = createContext<AppServices | null>(null);

export function useServices(): AppServices {
	const services = useContext(ServicesContext);
	if (!services) {
		throw new Error(
			"useServices must be used inside <Providers>",
		);
	}
	return services;
}

export const useApp = () => useServices().app;
export const useSettingsStore = () => useServices().settings;
export const useCheckboxService = () => useServices().checkbox;
export const useMenuService = () => useServices().menu;
export { ServicesContext };
