import {
	type CheckboxVariant,
	type CustomCheckboxesSettings,
	DEFAULT_SETTINGS,
	makeDefaultEmptyVariant,
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
		// Legacy shape included a top-level `defaultCheckedCharacter`; we now
		// store that as the empty variant's `next` instead. Read it here so we
		// can migrate it into the empty variant below.
		const incoming =
			(raw as
				| (Partial<CustomCheckboxesSettings> & {
						defaultCheckedCharacter?: string;
				  })
				| undefined) ?? {};
		const legacyDefaultChecked = incoming.defaultCheckedCharacter;

		const merged: CustomCheckboxesSettings = {
			variants: incoming.variants ?? DEFAULT_SETTINGS.variants,
			enableReadingView:
				incoming.enableReadingView ??
				DEFAULT_SETTINGS.enableReadingView,
			enableLivePreview:
				incoming.enableLivePreview ??
				DEFAULT_SETTINGS.enableLivePreview,
			enableBounceAnimation:
				incoming.enableBounceAnimation ??
				DEFAULT_SETTINGS.enableBounceAnimation,
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
		merged.variants = ensureEmptyVariant(
			merged.variants,
			legacyDefaultChecked,
		);
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
