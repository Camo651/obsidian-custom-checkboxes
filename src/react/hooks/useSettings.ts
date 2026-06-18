import { useSyncExternalStore } from "react";
import { useSettingsStore } from "../contexts";
import type { CheckboxVariant, CustomCheckboxesSettings } from "../../types";

/** Subscribe to the entire settings object. Re-renders the calling
 *  component whenever any field changes. */
export function useSettings(): CustomCheckboxesSettings {
	const store = useSettingsStore();
	return useSyncExternalStore(store.subscribe, store.getState);
}

/** Subscribe to the derived variant lookup map. */
export function useVariantMap(): Map<string, CheckboxVariant> {
	const store = useSettingsStore();
	useSyncExternalStore(store.subscribe, store.getState);
	return store.getVariantMap();
}
