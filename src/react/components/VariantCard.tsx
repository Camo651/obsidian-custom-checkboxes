import { type CheckboxVariant } from "../../types";
import { CharacterSelect } from "./CharacterSelect";
import { CheckboxIcon } from "./CheckboxIcon";
import { Field } from "./Field";

interface VariantCardProps {
	variant: CheckboxVariant;
	/** Position in the parent variant list. */
	index: number;
	/** Total number of variants in the list. */
	total: number;
	/**
	 * When true, the variant's bracket character is fixed and the card cannot
	 * be deleted. Used for the always-present empty (" ") variant.
	 */
	locked?: boolean;
	onChange: (patch: Partial<CheckboxVariant>) => void;
	onMove: (dir: -1 | 1) => void;
	onDelete: () => void;
}

/** Settings card for a single checkbox variant. */
export function VariantCard({
	variant,
	index,
	total,
	locked = false,
	onChange,
	onMove,
	onDelete,
}: VariantCardProps) {
	const title = locked
		? variant.name || "Empty"
		: variant.name ||
		  (variant.character ? `[${variant.character}]` : "(unnamed)");

	return (
		<div
			style={{
				border: "1px solid var(--background-modifier-border)",
				borderRadius: 8,
				padding: "1rem",
				background: "var(--background-secondary)",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.75rem",
					marginBottom: "0.75rem",
				}}
			>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						width: "1.6em",
						height: "1.6em",
						borderRadius: 4,
						background: "var(--background-primary)",
						border: "1px solid var(--background-modifier-border)",
						flexShrink: 0,
					}}
				>
					<CheckboxIcon
						char={variant.character}
						variant={variant}
						interactive={false}
					/>
				</div>
				<strong>{title}</strong>
				<div style={{ flex: 1 }} />
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
				<button
					onClick={onDelete}
					disabled={locked}
					title={
						locked
							? "The empty checkbox can't be deleted"
							: undefined
					}
				>
					Delete
				</button>
			</div>

			<Field label="Character">
				<input
					type="text"
					maxLength={1}
					placeholder="x"
					value={locked ? "" : variant.character}
					disabled={locked}
					title={
						locked
							? "The empty checkbox character is fixed ([ ])."
							: undefined
					}
					style={{
						width: "100%",
						boxSizing: "border-box",
					}}
					onChange={(e) =>
						onChange({ character: e.target.value.slice(0, 1) })
					}
				/>
			</Field>

			<Field label="Name">
				<input
					type="text"
					value={variant.name}
					style={{
						width: "100%",
						boxSizing: "border-box",
					}}
					onChange={(e) => onChange({ name: e.target.value })}
				/>
			</Field>

			<Field label="Next character on click">
				<CharacterSelect
					value={variant.next ?? ""}
					includeEmpty
					excludeChar={variant.character}
					onChange={(v) => onChange({ next: v })}
				/>
			</Field>

			<Field label="SVG source" full>
				<textarea
					placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>'
					value={variant.svgSource}
					style={{
						width: "100%",
						boxSizing: "border-box",
						minHeight: "6rem",
						fontFamily: "var(--font-monospace)",
						fontSize: "0.85em",
					}}
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
					style={{
						width: "100%",
						boxSizing: "border-box",
					}}
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
