import { type ReactNode, useMemo } from "react";
import { sanitizeSvg } from "../../utils";

interface SafeSvgProps {
	source: string | null | undefined;
	/** Rendered when `source` is empty or fails to parse. */
	fallback?: ReactNode;
}

/** Render an arbitrary SVG source string safely. The source is parsed
 *  with DOMParser, validated as well-formed `<svg>`, stripped of any
 *  `<script>` nodes, and given inline width/height/display so it sizes
 *  correctly on the first frame regardless of stylesheet load order
 *  (see `sanitizeSvg`).
 *
 *  The wrapper uses `display: contents` so the underlying `<svg>` becomes
 *  a layout child of the surrounding `.ccb-checkbox` parent. */
export function SafeSvg({ source, fallback = null }: SafeSvgProps) {
	const html = useMemo(() => sanitizeSvg(source ?? ""), [source]);
	if (!html) return <>{fallback}</>;
	return (
		<span
			style={{ display: "contents" }}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
