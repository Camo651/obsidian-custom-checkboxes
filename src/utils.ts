
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
