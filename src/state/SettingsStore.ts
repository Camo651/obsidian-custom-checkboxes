import {
	type CheckboxVariant,
	type CustomCheckboxesSettings,
	DEFAULT_SETTINGS,
} from "../types";
import { makeId, normalizeChar } from "../utils";

type Listener = () => void;
type Persist = (settings: CustomCheckboxesSettings) => Promise<void>;
type Updater = (
	prev: CustomCheckboxesSettings,
) => CustomCheckboxesSettings;

/**
 * Observable settings store with debounced persistence. The React tree subscribes
 * via `useSyncExternalStore` so a single `setState` call propagates to every
 * mounted checkbox and the settings panel.
 */
export class SettingsStore {
	private state: CustomCheckboxesSettings;
	private variantMapCache: Map<string, CheckboxVariant>;
	private listeners = new Set<Listener>();
	private saveTimer: number | null = null;
	private savePending = false;

	constructor(
		initial: CustomCheckboxesSettings,
		private persist: Persist,
		private debounceMs = 250,
	) {
		this.state = initial;
		this.variantMapCache = buildVariantMap(initial.variants);
	}

	/** Hydrate from raw saved data, merging with defaults and normalizing variants. */
	static hydrate(
		raw: unknown,
		persist: Persist,
		debounceMs?: number,
	): SettingsStore {
		const incoming = (raw as Partial<CustomCheckboxesSettings>) ?? {};
		const merged: CustomCheckboxesSettings = {
			variants: incoming.variants ?? DEFAULT_SETTINGS.variants,
			defaultCheckedCharacter:
				incoming.defaultCheckedCharacter ??
				DEFAULT_SETTINGS.defaultCheckedCharacter,
			enableReadingView:
				incoming.enableReadingView ??
				DEFAULT_SETTINGS.enableReadingView,
			enableLivePreview:
				incoming.enableLivePreview ??
				DEFAULT_SETTINGS.enableLivePreview,
		};
		merged.variants = merged.variants.map((v) => ({
			id: v.id ?? makeId(),
			character: normalizeChar(v.character),
			name: v.name ?? "",
			svgSource: v.svgSource ?? "",
			completed: !!v.completed,
			color: v.color ?? "",
			...(v.next !== undefined
				? { next: normalizeChar(v.next) }
				: {}),
		}));
		return new SettingsStore(merged, persist, debounceMs);
	}

	getState = (): CustomCheckboxesSettings => this.state;

	getVariantMap = (): Map<string, CheckboxVariant> => this.variantMapCache;

	subscribe = (listener: Listener): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	/** Apply a functional update and schedule a debounced persist. */
	setState = (updater: Updater): void => {
		const next = updater(this.state);
		if (next === this.state) return;
		this.state = next;
		this.variantMapCache = buildVariantMap(next.variants);
		this.scheduleSave();
		this.notify();
	};

	/** Cancel any pending debounced save and persist immediately. */
	flush = async (): Promise<void> => {
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		if (!this.savePending) return;
		this.savePending = false;
		await this.persist(this.state);
	};

	private scheduleSave(): void {
		this.savePending = true;
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
		}
		this.saveTimer = window.setTimeout(() => {
			this.saveTimer = null;
			this.savePending = false;
			void this.persist(this.state);
		}, this.debounceMs);
	}

	private notify(): void {
		this.listeners.forEach((l) => l());
	}
}

/** Build a `character → variant` lookup map. */
function buildVariantMap(
	variants: CheckboxVariant[],
): Map<string, CheckboxVariant> {
	const map = new Map<string, CheckboxVariant>();
	for (const v of variants) map.set(v.character, v);
	return map;
}
