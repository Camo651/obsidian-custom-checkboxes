import {
	type CheckboxVariant,
	type CustomCheckboxesSettings,
	DEFAULT_SETTINGS,
	makeDefaultEmptyVariant,
} from "../types";
import {
	isPlainObject,
	normalizeChar,
	parseVariant,
	readBoolean,
} from "../utils";

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

	/**
	 * Hydrate from raw saved data, merging with defaults and normalizing variants.
	 *
	 * `raw` is typed as `unknown` because it comes from Obsidian's `loadData()`,
	 * which we can't trust to match our schema (user may have hand-edited the
	 * file, or it may be a stale shape from an older plugin version). We narrow
	 * it here via runtime type guards rather than `as` casts so that
	 * malformed values are silently replaced with defaults instead of crashing
	 * later when consumers expect a specific type.
	 */
	static hydrate(
		raw: unknown,
		persist: Persist,
		debounceMs?: number,
	): SettingsStore {
		const obj = isPlainObject(raw) ? raw : {};

		// Legacy shape included a top-level `defaultCheckedCharacter`; we now
		// store that as the empty variant's `next` instead.
		const legacyDefaultChecked =
			typeof obj.defaultCheckedCharacter === "string"
				? obj.defaultCheckedCharacter
				: undefined;

		const rawVariants = Array.isArray(obj.variants)
			? obj.variants.map(parseVariant)
			: DEFAULT_SETTINGS.variants.map((v) => ({ ...v }));

		const merged: CustomCheckboxesSettings = {
			variants: ensureEmptyVariant(rawVariants, legacyDefaultChecked),
			enableReadingView: readBoolean(
				obj.enableReadingView,
				DEFAULT_SETTINGS.enableReadingView,
			),
			enableLivePreview: readBoolean(
				obj.enableLivePreview,
				DEFAULT_SETTINGS.enableLivePreview,
			),
			enableBounceAnimation: readBoolean(
				obj.enableBounceAnimation,
				DEFAULT_SETTINGS.enableBounceAnimation,
			),
		};
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

/**
 * Guarantee that the variant list contains the empty (" ") variant.
 * If it's missing, prepend a fresh copy of the default. When migrating from
 * the legacy `defaultCheckedCharacter` setting, that value seeds the empty
 * variant's `next` so the click-to-check behavior is preserved.
 */
export function ensureEmptyVariant(
	variants: CheckboxVariant[],
	legacyDefaultChecked?: string,
): CheckboxVariant[] {
	if (variants.some((v) => v.character === "")) return variants;
	const fresh = makeDefaultEmptyVariant();
	if (legacyDefaultChecked !== undefined) {
		fresh.next = normalizeChar(legacyDefaultChecked);
	}
	return [fresh, ...variants];
}
