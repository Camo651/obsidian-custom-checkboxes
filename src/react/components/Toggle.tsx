interface ToggleProps {
	checked: boolean;
	onChange: (next: boolean) => void;
}

/** Obsidian-styled on/off toggle switch. */
export function Toggle({ checked, onChange }: ToggleProps) {
	return (
		<div
			className={"checkbox-container" + (checked ? " is-enabled" : "")}
			role="switch"
			aria-checked={checked}
			tabIndex={0}
			onClick={() => onChange(!checked)}
			onKeyDown={(e) => {
				if (e.key === " " || e.key === "Enter") {
					e.preventDefault();
					onChange(!checked);
				}
			}}
		>
			<input
				type="checkbox"
				checked={checked}
				readOnly
				style={{
					display: "none"
				}}
			/>
		</div>
	);
}
