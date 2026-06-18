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
 *
 *  Two responsibilities beyond just safety:
 *   - Strips any `<script>` nodes.
 *   - Forces sizing attributes onto the root `<svg>` so the icon fills its
 *     parent regardless of whether our stylesheet has loaded yet. Without
 *     this, an `<svg>` with no width/height renders at the browser default
 *     (~300×150) for the first frame, producing a visible "giant icon"
 *     flash on page load before CSS is applied. Putting the sizing inline
 *     on the element itself eliminates the CSS dependency entirely. */
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
		// Override any author-supplied sizing — the icon is always meant
		// to fill its `.ccb-checkbox` parent (1em × 1em), never its own
		// intrinsic size.
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", "100%");
		svg.setAttribute(
			"style",
			"display:block;pointer-events:none;",
		);
		return svg.outerHTML;
	} catch {
		return null;
	}
}
