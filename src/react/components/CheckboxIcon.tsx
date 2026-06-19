import { type CSSProperties, forwardRef } from "react";
import {
	type CheckboxVariant,
} from "../../types";
import { SafeSvg } from "./SafeSvg";
import { DEFAULT_SVG_EMPTY } from "src/icons";

interface CheckboxIconProps {
	char: string;
	variant: CheckboxVariant | undefined;
	/** Set to `false` for the static preview swatch in settings. */
	interactive?: boolean;
}

/** The icon is sized to follow the surrounding text size — `1em` square,
 *  baseline-aligned via `text-top`. This is intentionally hardcoded:
 *  letting users tune it produced inconsistent rows where one variant
 *  visually "popped" relative to the others. */
const baseStyle: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	verticalAlign: "text-top",
	width: "1em",
	height: "1em",
	cursor: "pointer",
	userSelect: "none",
	WebkitUserSelect: "none",
	color: "var(--text-normal)",
};

const previewOverrides: CSSProperties = {
	cursor: "default",
	margin: 0,
};

const fallbackStyle: CSSProperties = {
	fontSize: "0.9em",
	fontWeight: "bold",
};

/** Pure presentational icon. Knows nothing about interactions, services,
 *  or document state — given a character + variant, it renders. */
export const CheckboxIcon = forwardRef<HTMLSpanElement, CheckboxIconProps>(
	function CheckboxIcon({ char, variant, interactive = true }, ref) {
		const ariaChecked: "true" | "false" | "mixed" = variant?.completed
			? "true"
			: char
			? "mixed"
			: "false";

		const style: CSSProperties = {
			...baseStyle,
			color: variant?.color || baseStyle.color,
			...(interactive ? null : previewOverrides),
		};

		// Falls back to a default empty-square SVG for unchecked tasks
		// when the user hasn't registered an explicit "" variant. Without
		// this, the rendered span would be transparent/unclickable.
		const svgSource =
			variant?.svgSource ||
			(char === "" ? DEFAULT_SVG_EMPTY : "");

		return (
			<span
				ref={ref}
				className="ccb-checkbox"
				role={interactive ? "checkbox" : undefined}
				aria-checked={interactive ? ariaChecked : undefined}
				data-ccb-char={char}
				style={style}
			>
				<SafeSvg
					source={svgSource}
					fallback={<span style={fallbackStyle}>{char}</span>}
				/>
			</span>
		);
	},
);
