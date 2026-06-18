import { type CSSProperties, forwardRef } from "react";
import {
	DEFAULT_SVG_EMPTY,
	type CheckboxVariant,
} from "../../types";
import { SafeSvg } from "./SafeSvg";

interface CheckboxIconProps {
	char: string;
	variant: CheckboxVariant | undefined;
	iconSize: string;
	/** Set to `false` for the static preview swatch in settings. */
	interactive?: boolean;
}

const baseStyle: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	verticalAlign: "text-top",
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
	function CheckboxIcon(
		{ char, variant, iconSize, interactive = true },
		ref,
	) {
		const ariaChecked: "true" | "false" | "mixed" = variant?.completed
			? "true"
			: char
			? "mixed"
			: "false";

		const style: CSSProperties = {
			...baseStyle,
			width: iconSize,
			height: iconSize,
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
