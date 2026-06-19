import { type ReactNode } from "react";

interface FieldProps {
	label: string;
	/** Stretch the input across the full row width. */
	full?: boolean;
	children: ReactNode;
}

/** A labeled row in a settings grid layout. */
export function Field({ label, full = false, children }: FieldProps) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "140px 1fr auto",
				alignItems: "center",
				gap: "0.75rem",
				margin: "0.5rem 0",
				...(full ? { gridColumn: "1 / -1" } : {}),
			}}
		>
			<label style={{ color: "var(--text-muted)", fontSize: "0.9em" }}>
				{label}
			</label>
			{children}
			{!full && <div />}
		</div>
	);
}
