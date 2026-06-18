import { type ReactNode, useMemo } from "react";
import { sanitizeSvg } from "../../utils";

interface SafeSvgProps {
	source: string | null | undefined;
	/** Rendered when `source` is empty or fails to parse. */
	fallback?: ReactNode;
}

/** Render an arbitrary SVG source string safely. The source is parsed
 *  with DOMParser, validated as well-formed `<svg>`, and stripped of any
 *  `<script>` nodes before being injected via `dangerouslySetInnerHTML`.
 *
 *  The wrapper uses `display: contents` so the underlying `<svg>` becomes
 *  a layout child of the parent. The `ccb-svg-host` class is the single
 *  CSS hook we keep in `styles.css` — it sizes the injected svg to its
 *  parent (we can't set attributes on a `dangerouslySetInnerHTML`-mounted
 *  element directly). */
export function SafeSvg({ source, fallback = null }: SafeSvgProps) {
	const html = useMemo(() => sanitizeSvg(source ?? ""), [source]);
	if (!html) return <>{fallback}</>;
	return (
		<span
			className="ccb-svg-host"
			style={{ display: "contents" }}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
