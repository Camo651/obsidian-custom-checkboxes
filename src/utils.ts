import type { CheckboxVariant } from "./types";

/**
 * Generate a simple random id.
 */
export function makeId(): string {
	return "v-" + Math.random().toString(36).slice(2, 10);
}

/** 
 * Normalize the character used in storage/lookup.
 * Obsidian writes "[ ]" for unchecked. We represent that as the empty string.
 */
export function normalizeChar(raw: string | null | undefined): string {
	if (raw == null || raw.length === 0 || raw === " "){
		return "";
	}
	return raw;
}

/** 
 * Parse and sanitize an SVG source string.
 * Returns the sanitized html string, or null if the input was invalid.
 * Two responsibilities beyond just safety:
 *   - Strips any `<script>` nodes.
 *   - Forces sizing attributes onto the root `<svg>`.
 */
export function sanitizeSvg(svgSource: string): string | null {
	const src = svgSource?.trim();
	if (!src){
		return null;
	} 
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(src, "image/svg+xml");
		if (doc.querySelector("parsererror")) return null;
		const svg = doc.documentElement;
		if (svg.tagName.toLowerCase() !== "svg") return null;
		svg.querySelectorAll("script").forEach((n) => n.remove());
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", "100%");
		svg.setAttribute(
			"style",
			"display:block;pointer-events:none;",
		);
		return svg.outerHTML;
	} catch {
		console.error("Failed to sanitize SVG source:", svgSource);
		return null;
	}
}

/* ----------------------------------------------------------------------------
 * Runtime type guards / parsers
 *
 * Used at the trust boundary (data loaded from disk via Obsidian's
 * `loadData()`) to validate shape without resorting to `as` casts. Each helper
 * narrows `unknown` to a known type or falls back to a safe default.
 * -------------------------------------------------------------------------- */

/** Runtime type guard: narrows `unknown` to a string-keyed record. */
export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return (
		typeof value === "object" && value !== null && !Array.isArray(value)
	);
}

/** Read a boolean field from an `unknown` source, falling back when missing/invalid. */
export function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

/** Read a string field from an `unknown` source, falling back to `""` when missing/invalid. */
export function readString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

/**
 * Parse one entry of `settings.variants` from disk into a validated
 * {@link CheckboxVariant}. Anything missing or of the wrong type is replaced
 * with a safe default; this is the only place we have to defend against
 * malformed input, so consumers can rely on the shape downstream.
 */
export function parseVariant(raw: unknown): CheckboxVariant {
	const o = isPlainObject(raw) ? raw : {};
	const idRaw = typeof o.id === "string" ? o.id : "";
	const variant: CheckboxVariant = {
		id: idRaw || makeId(),
		character: normalizeChar(readString(o.character)),
		name: readString(o.name),
		svgSource: readString(o.svgSource),
		completed: readBoolean(o.completed, false),
		color: readString(o.color),
	};
	if (typeof o.next === "string") {
		variant.next = normalizeChar(o.next);
	}
	return variant;
}
