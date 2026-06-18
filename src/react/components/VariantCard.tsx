import { type CSSProperties } from "react";
import { type CheckboxVariant } from "../../types";
import { useSettings } from "../hooks/useSettings";
import { CheckboxIcon } from "./CheckboxIcon";

interface VariantCardProps {
	variant: CheckboxVariant;
	index: number;
	total: number;
	onChange: (patch: Partial<CheckboxVariant>) => void;
	onMove: (dir: -1 | 1) => void;
	onDelete: () => void;
}

const cardStyle: CSSProperties = {
	border: "1px solid var(--background-modifier-border)",
	borderRadius: 8,
	padding: "1rem",
	background: "var(--background-secondary)",
};

const headerStyle: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "0.75rem",
	marginBottom: "0.75rem",
};

const previewStyle: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: "1.6em",
	height: "1.6em",
	borderRadius: 4,
	background: "var(--background-primary)",
	border: "1px solid var(--background-modifier-border)",
	flexShrink: 0,
};

const headerSpacer: CSSProperties = { flex: 1 };

const rowStyle: CSSProperties = {
	display: "grid",
	gridTemplateColumns: "140px 1fr auto",
	alignItems: "center",
	gap: "0.75rem",
	margin: "0.5rem 0",
};

const labelStyle: CSSProperties = {
	color: "var(--text-muted)",
	fontSize: "0.9em",
};

const inputStyle: CSSProperties = {
	width: "100%",
	boxSizing: "border-box",
};

const textareaStyle: CSSProperties = {
	...inputStyle,
	minHeight: "6rem",
	fontFamily: "var(--font-monospace)",
	fontSize: "0.85em",
};

const fullRowStyle: CSSProperties = { ...rowStyle, gridColumn: "1 / -1" };

export function VariantCard({
	variant,
	index,
	total,
	onChange,
	onMove,
	onDelete,
}: VariantCardProps) {
	const { iconSize } = useSettings();
	const title =
		variant.name ||
		(variant.character ? `[${variant.character}]` : "(unnamed)");

	return (
		<div style={cardStyle}>
			<div style={headerStyle}>
				<div style={previewStyle}>
					<CheckboxIcon
						char={variant.character}
						variant={variant}
						iconSize={iconSize}
						interactive={false}
					/>
				</div>
				<strong>{title}</strong>
				<div style={headerSpacer} />
				<button
					disabled={index === 0}
					onClick={() => onMove(-1)}
					aria-label="Move up"
				>
					↑
				</button>
				<button
					disabled={index === total - 1}
					onClick={() => onMove(1)}
					aria-label="Move down"
				>
					↓
				</button>
				<button onClick={onDelete}>Delete</button>
			</div>

			<Field label="Character">
				<input
					type="text"
					maxLength={1}
					placeholder="x"
					value={variant.character}
					style={inputStyle}
					onChange={(e) =>
						onChange({ character: e.target.value.slice(0, 1) })
					}
				/>
			</Field>

			<Field label="Name">
				<input
					type="text"
					value={variant.name}
					style={inputStyle}
					onChange={(e) => onChange({ name: e.target.value })}
				/>
			</Field>

			<Field label="SVG source" full>
				<textarea
					placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>'
					value={variant.svgSource}
					style={textareaStyle}
					onChange={(e) =>
						onChange({ svgSource: e.target.value })
					}
				/>
			</Field>

			<Field label="Color">
				<input
					type="text"
					placeholder="e.g. #ef4444 or var(--text-accent)"
					value={variant.color}
					style={inputStyle}
					onChange={(e) => onChange({ color: e.target.value })}
				/>
			</Field>

			<Field label="Mark as completed">
				<input
					type="checkbox"
					checked={variant.completed}
					onChange={(e) =>
						onChange({ completed: e.target.checked })
					}
				/>
			</Field>
		</div>
	);
}

function Field({
	label,
	full = false,
	children,
}: {
	label: string;
	full?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div style={full ? fullRowStyle : rowStyle}>
			<label style={labelStyle}>{label}</label>
			{children}
			{!full && <div />}
		</div>
	);
}
