import { type ReactNode, useMemo } from "react";
import { sanitizeSvg } from "../../utils";

interface SafeSvgProps {
	source: string | null | undefined;
	/** Rendered when `source` is empty or fails to parse. */
	fallback?: ReactNode;
}

/** Render an arbitrary SVG source string safely, falling back when invalid. */
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
