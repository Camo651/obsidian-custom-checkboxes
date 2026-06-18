export function makeId(): string {
	return "v-" + Math.random().toString(36).slice(2, 10);
}

/** Normalize the character used in storage/lookup. Obsidian writes "[ ]" for
 *  unchecked — we represent that as the empty string. */
export function normalizeChar(raw: string | null | undefined): string {
	if (raw == null) return "";
	if (raw.length === 0) return "";
	if (raw === " ") return "";
	return raw;
}

/** Parse and sanitize an SVG source string. Returns the sanitized markup
 *  (suitable for `dangerouslySetInnerHTML`) or null if the input was invalid.
 *  Strips any `<script>` nodes — same defense the original DOM-based
 *  implementation used. */
export function sanitizeSvg(svgSource: string): string | null {
	const src = svgSource?.trim();
	if (!src) return null;
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(src, "image/svg+xml");
		if (doc.querySelector("parsererror")) return null;
		const svg = doc.documentElement;
		if (svg.tagName.toLowerCase() !== "svg") return null;
		svg.querySelectorAll("script").forEach((n) => n.remove());
		return svg.outerHTML;
	} catch {
		return null;
	}
}
