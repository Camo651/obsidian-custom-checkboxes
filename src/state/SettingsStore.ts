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
 * Observable settings store. Every part of the React tree subscribes via
 * `useSyncExternalStore`, so a single `setState` call propagates the new
 * settings to every mounted checkbox / settings panel without any
 * imperative re-render plumbing.
 *
 * Persistence is debounced — rapid edits in the settings UI coalesce into
 * a single `saveData` call, but any pending save can be flushed on demand.
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

	/** Hydrate from saved data, applying migrations. */
	static hydrate(
		raw: unknown,
		persist: Persist,
		debounceMs?: number,
	): SettingsStore {
		const merged = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(raw as Partial<CustomCheckboxesSettings>) ?? {},
		) as CustomCheckboxesSettings;
		// Migrate variants: ensure every variant has a stable id, normalize
		// characters, drop any legacy fields (older versions of the plugin
		// supported `mediaKind: "image"` with an `imagePath` — those fields
		// are silently dropped here).
		merged.variants = (merged.variants ?? []).map((v) => ({
			id: v.id ?? makeId(),
			character: normalizeChar(v.character),
			name: v.name ?? "",
			svgSource: v.svgSource ?? "",
			completed: !!v.completed,
			color: v.color ?? "",
		}));
		return new SettingsStore(merged, persist, debounceMs);
	}

	/* ----------------------- read ----------------------- */

	getState = (): CustomCheckboxesSettings => this.state;

	getVariantMap = (): Map<string, CheckboxVariant> => this.variantMapCache;

	subscribe = (listener: Listener): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	/* ----------------------- write ----------------------- */

	setState = (updater: Updater): void => {
		const next = updater(this.state);
		if (next === this.state) return;
		this.state = next;
		this.variantMapCache = buildVariantMap(next.variants);
		this.scheduleSave();
		this.notify();
	};

	/** Cancel any pending debounced save and flush immediately. */
	flush = async (): Promise<void> => {
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		if (!this.savePending) return;
		this.savePending = false;
		await this.persist(this.state);
	};

	/* ----------------------- internals ----------------------- */

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

function buildVariantMap(
	variants: CheckboxVariant[],
): Map<string, CheckboxVariant> {
	const map = new Map<string, CheckboxVariant>();
	for (const v of variants) map.set(v.character, v);
	return map;
}
