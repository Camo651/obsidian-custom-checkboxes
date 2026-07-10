import { type CSSProperties, forwardRef } from "react";
import { DEFAULT_SVG_CHECK, DEFAULT_SVG_EMPTY } from "../../icons";
import { SafeSvg } from "./SafeSvg";

/**
 * A single row inside the variant menu.
 */
export interface MenuRow {
	/** Bracketed character that picking this row writes back. */
	char: string;
	label: string;
	svgSource: string;
	color: string;
}

interface MenuItemProps {
	row: MenuRow;
	/** Position in the menu (0-based). */
	index: number;
	/** True when `row.char` matches the checkbox's current character. */
	isActive: boolean;
	/** True when this row is the keyboard / drag focus target. */
	isFocused: boolean;
	onHover: () => void;
	onClick: () => void;
}

/** Single row in the variant menu. */
export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(props, ref) {
	const { row, index, isActive, isFocused, onHover, onClick } = props;
	const iconSource =
		row.svgSource || (row.char === "" ? DEFAULT_SVG_EMPTY : "");
	const showNumber = index < 9;

	return (
		<div
			ref={ref}
			role="menuitem"
			tabIndex={-1}
			data-ccb-menu-idx={index}
			onMouseMove={onHover}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick();
			}}
			style={{
				display: "grid",
				gridTemplateColumns: "1.4em 1.25em 1fr auto 1em",
				alignItems: "center",
				gap: 10,
				padding: "6px 10px",
				borderRadius: "var(--radius-s, 4px)",
				cursor: "pointer",
				userSelect: "none",
				WebkitUserSelect: "none",
				lineHeight: 1.3,
				...(isFocused
					? { background: "var(--background-modifier-hover)" }
					: null),
			}}
		>
			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					width: "1.4em",
					height: "1.4em",
					fontFamily: "var(--font-monospace)",
					fontSize: "0.78em",
					fontWeight: 600,
					color: "var(--text-muted)",
					background: "var(--background-modifier-border)",
					borderRadius: "var(--radius-s, 4px)",
					lineHeight: 1,
					...(showNumber
						? null
						: { background: "transparent" }),
					...(isFocused
						? {
								color: "var(--text-on-accent, var(--text-normal))",
								background:
									"var(--interactive-accent, var(--background-modifier-border))",
							}
						: null),
				}}
			>
				{showNumber ? index + 1 : ""}
			</span>
			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					width: "1.25em",
					height: "1.25em",
					color: row.color || "var(--text-normal)",
				}}
			>
				<SafeSvg source={iconSource} fallback={row.char} />
			</span>
			<span
				style={{
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
					...(isActive ? { fontWeight: 600 } : null),
				}}
			>
				{row.label}
			</span>
			<span
				style={{
					fontFamily: "var(--font-monospace)",
					fontSize: "0.82em",
					color: "var(--text-muted)",
					background: "var(--background-modifier-border)",
					padding: "1px 6px",
					borderRadius: 3,
					minWidth: "1.4em",
					textAlign: "center",
					lineHeight: 1.4,
				}}
			>
				{row.char === "" ? " " : row.char}
			</span>
			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					width: "1em",
					height: "1em",
					color: "var(--text-accent, var(--interactive-accent))",
					visibility: isActive ? "visible" : "hidden",
				}}
			>
				<SafeSvg source={DEFAULT_SVG_CHECK} />
			</span>
		</div>
	);
});
